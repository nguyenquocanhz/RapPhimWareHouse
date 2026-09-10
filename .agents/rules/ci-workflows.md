---
trigger: glob
globs: .github/workflows/*.yml,.github/workflows/*.yaml
description: Luật GitHub Actions của RapPhim — chỉ áp dụng khi chạm file workflow
---

# Luật CI / GitHub Actions

Chi tiết của hiến pháp gốc `AGENTS.md`, chỉ nạp khi agent chạm file workflow.

## Publish ảnh chỉ chạy trên `main`

Workflow `publish-images.yml` kích hoạt khi push `main` và tag `v*`. **PR không có
phép kiểm nào** — nên tự chạy test + lint tại máy trước khi merge. Đổi chính workflow
thì đúng sai chỉ biết **sau khi** merge (nó không tự chạy trên PR).

## paths-ignore: sửa tài liệu không dựng lại ảnh

Có `paths-ignore` cho `docs/**`, `**.md`, `.gitignore`. Đã kiểm cả hai chiều: sửa file
thường → workflow chạy; sửa chỉ tài liệu → bỏ qua.

- Lưu ý: `paths-ignore` làm workflow **không chạy**, không phải chạy-rồi-bỏ-qua. Đừng
  đặt nó làm phép kiểm **bắt buộc** để merge — một PR chỉ sửa tài liệu sẽ chờ mãi một
  phép kiểm không bao giờ tới.

## Ảnh đa kiến trúc: dựng theo digest, gộp sau

Dựng amd64 và arm64 trên **runner riêng của từng kiến trúc** (ARM runner miễn phí cho
repo công khai), không giả lập QEMU — build Maven/Next.js qua QEMU chậm tới mức vượt
hạn mức. Vì thế:

- Bước **build** đẩy từng bản lên registry **không kèm nhãn** (`push-by-digest=true`),
  chỉ định danh bằng digest.
- Bước **gộp** nối các digest thành một bảng chỉ mục rồi mới gắn nhãn
  (`docker buildx imagetools create`). **Đừng** gắn nhãn ở bước build — hai máy sẽ ghi
  đè nhãn của nhau, nhãn cuối chỉ còn một kiến trúc (mọi thứ vẫn xanh, phát hiện muộn).
- Cache tách theo **cả ảnh lẫn kiến trúc**: lớp amd64 không tái dùng được cho arm64.

## Sau khi merge

Xác minh nhãn cuối có đủ kiến trúc:
`docker buildx imagetools inspect <ảnh>:latest` → phải thấy cả `linux/amd64` và
`linux/arm64`. Bước cuối của workflow có `imagetools inspect` để log ra điều này.

## Bí mật

Dùng `GITHUB_TOKEN` cấp sẵn, xin `packages: write`. Không thêm secret thủ công. Nhớ:
ảnh do workflow đẩy lên GHCR mặc định **private** — phải đổi public thủ công theo từng
gói (khác quyền của repo).
