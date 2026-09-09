#!/usr/bin/env bash
#
# Dua RapPhim len homelab va dung lai bang Docker.
#
#   ./deploy.sh                 # gui ma nguon, build lai, khoi dong
#   ./deploy.sh --no-build      # chi gui ma nguon roi khoi dong lai
#   ./deploy.sh --logs          # xem log dang chay
#
# May dich chua cai rsync nen dung tar qua SSH - chi can co san tar hai dau.

set -euo pipefail

# --------------------------------------------------------------- cau hinh
SSH_HOST="${SSH_HOST:-nqatech@192.168.100.169}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/acer-nitro}"
REMOTE_DIR="${REMOTE_DIR:-rapphim}"

# Dia chi de kiem tra sau khi dung lai. Doc tu .env neu co de khoi khai bao hai lan.
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_URL="http://$(echo "$SSH_HOST" | cut -d@ -f2):3000"
API_URL="http://$(echo "$SSH_HOST" | cut -d@ -f2):8081"
if [[ -f "$HERE/.env" ]]; then
  WEB_URL="$(grep -E '^PUBLIC_WEB_URL=' "$HERE/.env" | cut -d= -f2- || echo "$WEB_URL")"
  API_URL="$(grep -E '^PUBLIC_API_URL=' "$HERE/.env" | cut -d= -f2- || echo "$API_URL")"
fi

BUILD=1
LOGS_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --no-build) BUILD=0 ;;
    --logs) LOGS_ONLY=1 ;;
    -h|--help) sed -n '2,10p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Tham so la: $arg" >&2; exit 2 ;;
  esac
done

ssh_run() { ssh -i "$SSH_KEY" -o BatchMode=yes "$SSH_HOST" "$@"; }

say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

# --------------------------------------------------------------- xem log roi thoi
if [[ "$LOGS_ONLY" == 1 ]]; then
  ssh_run "cd ~/$REMOTE_DIR && docker compose logs --tail 60 -f"
  exit 0
fi

# --------------------------------------------------------------- kiem tra dau vao
say "Kiểm tra kết nối tới $SSH_HOST"
if ! ssh_run 'docker compose version >/dev/null 2>&1'; then
  echo "Không vào được máy đích, hoặc máy đó chưa có Docker Compose." >&2
  echo "Khoá đang dùng: $SSH_KEY" >&2
  exit 1
fi

# --------------------------------------------------------------- gui ma nguon
say "Gửi mã nguồn"
# Bo cac thu muc sinh ra khi build va tep cau hinh rieng: .env tren may dich do nguoi
# dung tu giu, ghi de len la mat khoa.
tar czf - -C "$HERE" \
  --exclude=node_modules \
  --exclude=target \
  --exclude=.next \
  --exclude=.git \
  --exclude='*.log' \
  --exclude=.env \
  backend frontend docs README.md docker-compose.yml .env.example \
  | ssh_run "mkdir -p ~/$REMOTE_DIR && tar xzf - -C ~/$REMOTE_DIR"

# Lan dau chay thi chua co .env, tao san mot ban tu mau de compose khong hong.
ssh_run "test -f ~/$REMOTE_DIR/.env || { cp ~/$REMOTE_DIR/.env.example ~/$REMOTE_DIR/.env; echo 'Đã tạo .env từ mẫu - nhớ điền khoá ZCloud.'; }"

# --------------------------------------------------------------- dung lai
if [[ "$BUILD" == 1 ]]; then
  say "Build ảnh và khởi động (mất vài phút lần đầu)"
  ssh_run "cd ~/$REMOTE_DIR && docker compose up -d --build"
else
  say "Khởi động lại (không build)"
  ssh_run "cd ~/$REMOTE_DIR && docker compose up -d"
fi

# --------------------------------------------------------------- kiem tra
say "Chờ dịch vụ sẵn sàng"
ok=0
for _ in $(seq 1 30); do
  sleep 3
  if curl -fsS --max-time 5 "$API_URL/actuator/health" >/dev/null 2>&1 \
    && curl -fsS --max-time 5 "$WEB_URL/" >/dev/null 2>&1; then
    ok=1
    break
  fi
done

ssh_run "cd ~/$REMOTE_DIR && docker compose ps --format 'table {{.Name}}\t{{.Status}}\t{{.Ports}}'"

if [[ "$ok" == 1 ]]; then
  say "Xong: $WEB_URL"
else
  echo
  echo "Container đã chạy nhưng chưa trả lời trong 90 giây." >&2
  echo "Xem log bằng: ./deploy.sh --logs" >&2
  exit 1
fi
