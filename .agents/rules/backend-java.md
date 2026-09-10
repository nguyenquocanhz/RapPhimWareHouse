---
trigger: glob
globs: backend/**/*.java
description: Luật cho code Spring Boot / Java của RapPhim — chỉ áp dụng khi chạm file backend
---

# Luật backend (Spring Boot 4.1, Java 17)

Chi tiết của hiến pháp gốc `AGENTS.md`, chỉ nạp khi agent chạm file `.java`.

## Jackson 3, không phải Jackson 2

Import từ `tools.jackson.*`, **không** `com.fasterxml.jackson.*`. Đây là Jackson 3
(Spring Boot 4.x). Trộn hai bộ package sẽ lỗi biên dịch khó hiểu.

## Lỗi từ nguồn ngoài: phân loại, đừng nuốt

- **Chỉ nuốt 404** thành "không có bản ghi". Nuốt cả 4xx là sai: 401 (khoá sai) và 429
  (quá hạn mức) sẽ hiện ra thành "0 kết quả" và người dùng đi chỉnh nhầm chỗ.
- Lỗi mạng/upstream ném `UpstreamException` với **mã ổn định** (`UPSTREAM_ERROR`,
  `UPSTREAM_BLOCKED`), để tầng frontend đọc **mã** chứ không dò chuỗi tiếng Anh. Dùng
  `UpstreamException.network(...)` để tự phân loại `ConnectException`/`SSLHandshake`/…
- Thông báo cho người dùng phải nói **làm gì tiếp** (đổi khoá, chờ, cần VPN), không đổ
  nguyên văn ngoại lệ.

## Ghi trước, đổi bộ nhớ sau

`CustomSourceService`, `SettingsService`, `AuditService` đều **ghi xuống đĩa trước**,
đổi trạng thái trong bộ nhớ sau. Làm ngược lại thì một lần ghi hỏng để lại bộ nhớ và
file khác nhau: giao diện báo đã thêm, khởi động lại là mất.

## Bí mật không đọc ngược ra

- `SettingsService` chỉ trả **đã đặt hay chưa** và **đặt ở đâu** (`cms`/`env`), **không
  bao giờ** trả giá trị khoá. `AuditService` ghi ai/khi nào, **không** ghi giá trị.
- Chẩn đoán khoá bằng **dạng** (v3 = 32 hex, v4 = JWT `eyJ…`), đừng lộ giá trị.

## Provider và cache

- Nguồn phim theo `MovieProvider` interface, tra qua `ProviderRegistry` (string-keyed
  cho nguồn tuỳ biến). Nguồn tuỳ biến tái dùng `KKPhimProvider`; nhớ truyền đúng `code`
  chứ đừng để nó trả về `"kkphim"` cho nguồn khác.
- Cache Caffeine (`CacheConfig`) **phải có `maximumSize`** + `expireAfterWrite`. Nhờ nó
  heap có trần thật — đừng bỏ giới hạn.
- Circular dependency dùng `@Lazy`, không tái cấu trúc vội.

## Quy ước

- Comment: tiếng Việt **không dấu** (theo repo). Chuỗi cho người dùng: **đủ dấu**.
- Test trước khi merge: `cd backend && ./mvnw -q -o test` (44+ test phải xanh).
