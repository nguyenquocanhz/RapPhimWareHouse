# RapPhim License Server (Cloudflare Worker + KV)

Máy chủ **quản lý key Premium** cho app RapPhim TV: cấp / thu hồi / gia hạn / hết hạn
(thuê bao **cắt dần**). Chạy trên **Cloudflare Worker + KV** — miễn phí, công khai,
gần như không phải bảo trì. Chỉ phần **license** cần server này; phim/IPTV vẫn serverless.

## Vì sao cần server này?

Mã offline (đã ký) không thu hồi được và hạn dùng bị đóng cứng lúc tạo. Server cho phép:
- **Thu hồi** một key bị lộ/chia sẻ.
- **Gia hạn** (cộng thêm ngày) khi khách trả tiếp.
- **Hết hạn tự cắt** → mô hình thuê bao.

App lưu hạn dùng cục bộ nên vẫn xem được **offline có ân hạn**; có mạng thì đồng bộ lại.

## Triển khai

Cần một tài khoản **Cloudflare** (free) và Node.

```bash
cd license-server

# 1) Tạo KV, dán id trả về vào wrangler.toml (kv_namespaces.id)
npx wrangler kv namespace create LICENSES

# 2) Đặt token quản trị (giữ bí mật)
npx wrangler secret put ADMIN_TOKEN

# 3) Deploy
npx wrangler deploy
```

Ghi lại URL Worker, ví dụ `https://rapphim-license.<tài-khoản>.workers.dev`, rồi đặt
vào app: `LICENSE_API` trong `mobile-tv/src/lib/config.ts`, build lại APK.

## API

**Công khai** — app gọi:
```
POST /verify   {"key":"RAPTV-...."}
  -> {"ok":true,"tier":"premium","name":"...","exp":1767225600,"revoked":false}
```

**Quản trị** — cần header `X-Admin-Token: <ADMIN_TOKEN>`:
```bash
BASE=https://rapphim-license.<tài-khoản>.workers.dev
TOK=<ADMIN_TOKEN>

# Cấp key 30 ngày cho một khách
curl -s -X POST "$BASE/admin/issue" -H "x-admin-token: $TOK" \
  -H 'content-type: application/json' -d '{"name":"Nguyen Van A","days":30}'
#  -> {"ok":true,"key":"RAPTV-XXXX-XXXX-XXXX-XXXX","exp":...}
#  (bỏ "days" hoặc days=0 = vĩnh viễn; thêm "key":"..." để tự đặt mã)

# Gia hạn thêm 30 ngày (cộng dồn nếu chưa hết hạn)
curl -s -X POST "$BASE/admin/extend" -H "x-admin-token: $TOK" \
  -H 'content-type: application/json' -d '{"key":"RAPTV-...","days":30}'

# Thu hồi
curl -s -X POST "$BASE/admin/revoke" -H "x-admin-token: $TOK" \
  -H 'content-type: application/json' -d '{"key":"RAPTV-..."}'

# Liệt kê tất cả key
curl -s "$BASE/admin/list" -H "x-admin-token: $TOK"
```

## Luồng thu phí

1. Khách trả tiền (Momo/bank...) → bạn chạy `admin/issue` → gửi key cho khách.
2. Khách nhập key ở màn **Premium** trong app → app gọi `/verify` → mở khoá, lưu hạn.
3. Gần hết hạn: khách trả tiếp → bạn `admin/extend`. Không trả → hết hạn tự cắt.
4. Key bị chia sẻ bừa → `admin/revoke`.

> App đọc `LICENSE_API`: để trống thì chạy chế độ offline (mã ký Ed25519, xem
> `mobile-tv/tools/gen-license.js`); đặt URL Worker thì chuyển sang chế độ server này.
