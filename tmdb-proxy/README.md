# TMDB Proxy (Cloudflare Worker)

Cầu nối để vượt việc ISP chặn `api.themoviedb.org` theo SNI/DPI. Worker chạy trên
`*.workers.dev` (không bị chặn), backend/trình duyệt gọi Worker, Worker gọi thẳng TMDB.

- `/3/...` → `https://api.themoviedb.org/3/...` (REST API)
- `/t/p/...` → `https://image.tmdb.org/t/p/...` (ảnh)

## Triển khai (miễn phí)

Cần một **tài khoản Cloudflare** (free).

### Cách A — Dashboard (không cần cài gì)
1. Vào <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Create Worker**.
2. Đặt tên (ví dụ `rapphim-tmdb`) → **Deploy**.
3. **Edit code** → dán toàn bộ nội dung [`worker.js`](worker.js) → **Deploy**.
4. Ghi lại URL Worker, dạng: `https://rapphim-tmdb.<tài-khoản>.workers.dev`

### Cách B — Wrangler (CLI)
```bash
cd tmdb-proxy
npx wrangler login
npx wrangler deploy
```

## Cấu hình backend dùng Worker

Trên homelab, sửa `~/rapphim/.env` (thay `<WORKER>` bằng URL Worker của bạn), rồi
`docker compose up -d --force-recreate backend`:

```dotenv
# Lấy token miễn phí ở https://www.themoviedb.org/settings/api (Read Access Token v4)
TMDB_ACCESS_TOKEN=<token-v4-của-bạn>

# Trỏ TMDB qua Worker (kèm /3 cho API và /t/p cho ảnh)
TMDB_BASE_URL=https://rapphim-tmdb.<tài-khoản>.workers.dev/3
TMDB_IMAGE_BASE_URL=https://rapphim-tmdb.<tài-khoản>.workers.dev/t/p
```

Frontend đã cho phép tải ảnh từ `*.workers.dev` (next.config). Để trống các biến này
thì backend gọi thẳng TMDB như cũ (sẽ bị chặn nếu ISP chặn).

## Bảo mật

Worker chỉ chuyển tiếp `/3` và `/t/p`; token do backend gắn vào request, Worker
không lưu. Muốn kín hơn có thể giới hạn Worker theo `Access-Control-Allow-Origin`
cụ thể thay vì `*`.
