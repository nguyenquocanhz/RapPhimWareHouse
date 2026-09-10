---
trigger: glob
globs: **/Dockerfile,docker-compose*.yml,deploy.sh,Corefile,.env.example
description: Luật Docker / triển khai của RapPhim — chỉ áp dụng khi chạm file hạ tầng
---

# Luật Docker và triển khai

Chi tiết của hiến pháp gốc `AGENTS.md`, chỉ nạp khi agent chạm file hạ tầng.

## Đừng build ảnh trên VPS

Ảnh multi-arch (amd64+arm64) đã publish công khai trên GHCR. Bản phát hành
`docker-compose.prod.yml` **kéo** ảnh dựng sẵn. `next build` ngốn 2–3 GB — build trên
VPS nhỏ là tự chuốc OOM. Muốn phát hành thì để CI dựng và push, không build tại chỗ.

## Địa chỉ không được nướng vào ảnh

`NEXT_PUBLIC_*` bị cố định lúc `docker build` → ảnh không portable. Tách hai đường:
`NEXT_PUBLIC_API_BASE_URL` (trình duyệt, đường tương đối) vs `API_INTERNAL_URL` (máy
chủ, `http://backend:8080`, đọc lúc chạy).

## Dockerfile — thứ tự và ảnh nền

- **`chown` thư mục dữ liệu TRƯỚC dòng `USER`.** Volume kế thừa quyền một lần lúc tạo;
  làm sau `USER` thì không còn quyền `chown`, và lỗi chỉ lộ lúc chạy. Volume cũ giữ
  quyền sai → phải `docker volume rm` rồi tạo lại.
- **Đổi dòng `FROM` thì đọc lại CẢ Dockerfile.** Ảnh nền quyết định lệnh có sẵn
  (`wget` trong `HEALTHCHECK`), cú pháp tạo user (`addgroup -S` là BusyBox/Alpine), thư
  viện hệ thống. Nền Alpine của Temurin **chỉ có amd64** — kiểm kiến trúc bằng
  `docker buildx imagetools inspect <ảnh>` TRƯỚC khi tin nó có arm64.
- Sắp lớp: khai báo phụ thuộc (`pom.xml`/`package.json`) trước, mã nguồn sau, để cache
  còn tác dụng. Nhiều giai đoạn: build một nơi, chạy ở ảnh JRE/node gọn.
- `.dockerignore` phải có `.git`, `node_modules`, `target`, `.env`.

## Giới hạn RAM

Mỗi service có `mem_limit`; backend ghim `-Xmx` (đừng để `MaxRAMPercentage` đọc RAM
host — không có `mem_limit` thì OOM là **cấp hệ thống**, có thể giết cả `sshd`). Trị
mặc định hợp VPS 2GB, chỉnh qua `.env`. Dùng `mem_limit` dạng ngắn — **không**
`deploy.resources.limits` (bị bỏ qua ngoài swarm với `docker compose up`).

## deploy.sh

- **`rm -rf backend frontend docs` TRƯỚC khi giải nén.** Giải nén đè không xoá file đã
  bỏ → route/tệp cũ vẫn sống. Kiểm sau deploy bằng `curl` đường cũ (phải 404).
- SSH bằng key `~/.ssh/acer-nitro` với `-o BatchMode=yes` (ssh tương tác không có key
  sẽ hỏi mật khẩu và treo).
- Kiểm sau khi lên: `docker compose config` (cú pháp), rồi `curl` trang/endpoint thật.
