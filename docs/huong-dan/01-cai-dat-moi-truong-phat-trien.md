# Hướng dẫn cài đặt môi trường phát triển

> **Tài liệu**
> **Phiên bản:** 1.0
> **Cập nhật:** 2026-09-11
> **Đối tượng đọc:** Lập trình viên mới tham gia dự án
> **Trạng thái:** Chính thức
> **Tag:** cài đặt, môi trường phát triển, backend, frontend, Spring Boot, Next.js

## Giới thiệu

RapPhim WareHouse gồm hai phần chạy độc lập: một **backend Spring Boot** đóng vai trò lớp
trung gian gọi nhiều nguồn phim rồi chuẩn hoá về một schema DTO duy nhất, và một
**frontend Next.js** hiển thị giao diện xem phim. Trước khi viết được dòng mã đầu tiên,
chúng ta cần dựng đúng môi trường để cả hai phần khởi động, nói chuyện được với nhau và
vượt qua bộ kiểm thử.

Tài liệu này hướng dẫn từng bước từ lúc máy còn trống tới lúc mở được trang chủ tại
`http://localhost:3000` và gọi được API tại `http://localhost:8080`. Chúng ta cố tình giữ
bước cài đặt gọn nhất có thể: dự án dùng **Maven Wrapper** nên không phải cài Maven, và
mọi khoá dịch vụ ngoài đều **tuỳ chọn** — thiếu khoá thì phần liên quan tự xuống thang chứ
không chặn cả hệ thống. Nhờ vậy một lập trình viên mới có thể chạy được toàn bộ luồng
chính chỉ với JDK và Node.js.

## Các thành phần chính

| Thành phần | Công nghệ | Cổng cục bộ | Vai trò |
|---|---|---|---|
| `backend/` | Spring Boot 4.1.1 (Java 17), Maven Wrapper | 8080 | REST API tổng hợp và chuẩn hoá dữ liệu từ các nguồn phim, cache Caffeine, sinh file NFO, có Swagger UI |
| `frontend/` | Next.js 16.3.4, React 19.2.8, Tailwind CSS 4 | 3000 | Giao diện xem phim theo phong cách YouTube |

Backend gọi ra các nguồn bên ngoài (KKPhim, NguonC, VSMOV, kho riêng homelab ZCloud),
bổ sung metadata từ TMDB và AniList/Jikan, rồi phục vụ frontend qua một schema duy nhất.
Frontend không cần biết nguồn nào trả về gì.

## Yêu cầu phần mềm

Chúng ta cần đúng hai công cụ trên máy phát triển:

| Công cụ | Phiên bản tối thiểu | Ghi chú |
|---|---|---|
| JDK | 17 trở lên | Backend khai báo `java.version = 17` trong `backend/pom.xml` |
| Node.js | 20 trở lên | Kèm sẵn `npm`; frontend dùng `@types/node` bản 20 |

Không cần cài Maven — dự án đi kèm Maven Wrapper (`mvnw` / `mvnw.cmd`) tự tải đúng phiên
bản Maven khi chạy lần đầu.

Kiểm tra nhanh phiên bản đã cài:

```bash
java -version
node -v
```

## Cài đặt và chạy backend

Backend nằm trong thư mục `backend/`. Từ gốc kho, chuyển vào thư mục đó rồi gọi Maven
Wrapper với goal `spring-boot:run`. Lần chạy đầu sẽ tải phụ thuộc nên hơi lâu.

```bash
cd backend && ./mvnw spring-boot:run
```

Trên Windows (PowerShell hoặc CMD), dùng bản `.cmd` của wrapper:

```bat
cd backend
mvnw.cmd spring-boot:run
```

Khi ứng dụng khởi động xong, backend nghe ở cổng `8080` (khai báo trong
`backend/src/main/resources/application.yml`). Các địa chỉ chính:

| Mục | URL |
|---|---|
| Gốc REST API | <http://localhost:8080/api/v1> |
| Swagger UI | <http://localhost:8080/swagger-ui.html> |
| OpenAPI JSON | <http://localhost:8080/v3/api-docs> |
| Health check | <http://localhost:8080/actuator/health> |

Kiểm tra ứng dụng đã sống bằng health-check của Spring Boot Actuator:

```bash
curl http://localhost:8080/actuator/health
```

**Kết quả:** khi ứng dụng khoẻ, endpoint trả về trạng thái `UP`.

```json
{ "status": "UP" }
```

> Cấu hình `management.endpoint.health.show-details: always` nên phản hồi thật còn kèm một
> khối `components` mô tả chi tiết từng thành phần. Trường quan trọng nhất để biết ứng dụng
> đã sẵn sàng là `status`.

Gọi thử một endpoint nghiệp vụ để chắc chắn API trả dữ liệu thật:

```bash
curl "http://localhost:8080/api/v1/movies/latest?page=1&limit=12"
```

### Biến môi trường tối thiểu

Để chạy được luồng chính, backend **không bắt buộc biến môi trường nào** — mọi khoá trong
`application.yml` đều có giá trị mặc định và tự xuống thang khi để trống. Các biến dưới đây
là **tuỳ chọn**, chỉ đặt khi cần bật thêm tính năng:

| Biến | Tác dụng khi đặt | Khi để trống |
|---|---|---|
| `TMDB_ACCESS_TOKEN` | Token đọc v4 của TheMovieDB (ưu tiên) | Nhóm endpoint `/api/v1/tmdb/*` trả `503 TMDB_NOT_CONFIGURED`; xuất NFO vẫn chạy |
| `TMDB_API_KEY` | Khoá API v3 của TheMovieDB | Như trên |
| `ZCLOUD_API_KEY` | Khoá gọi kho phim riêng homelab (header `x-api-key`) | Nguồn `homelab` trả về rỗng |
| `ZCLOUD_PASSWORD` | Mật khẩu đăng nhập kho riêng, dùng khi chưa tạo khoá | Nguồn `homelab` trả về rỗng |
| `RAPPHIM_ADMIN_TOKEN` | Khoá bật phần sửa đổi của trang quản trị | Trang quản trị chỉ còn xem được |
| `RAPPHIM_CORS_ORIGINS` | Danh sách origin được phép gọi API | Mặc định `http://localhost:3000,http://127.0.0.1:3000` |

Đặt biến trước khi chạy, ví dụ với TMDB:

```bash
export TMDB_ACCESS_TOKEN="<read access token v4>"
cd backend && ./mvnw spring-boot:run
```

Danh sách đầy đủ các biến, ý nghĩa và cách cấu hình cho từng môi trường nằm ở tài liệu
[06 – Tham chiếu cấu hình](./06-tham-chieu-cau-hinh.md).

## Cài đặt và chạy frontend

Frontend nằm trong thư mục `frontend/`. Cài phụ thuộc bằng `npm install`, sau đó chạy máy
chủ phát triển bằng `npm run dev`.

```bash
cd frontend && npm install && npm run dev
```

Mở <http://localhost:3000> để xem giao diện. Frontend đọc địa chỉ backend từ biến
`NEXT_PUBLIC_API_BASE_URL`; giá trị mặc định trỏ về backend cục bộ. Chép file mẫu rồi sửa
nếu cần:

```bash
cp .env.example .env.local
```

Nội dung mặc định của `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Với địa chỉ mặc định này, frontend ở cổng `3000` sẽ gọi backend ở cổng `8080` mà không phải
chỉnh gì thêm.

## Chạy kiểm thử và kiểm tra

Trước khi mở pull request, chúng ta chạy bộ kiểm thử của backend và bước kiểm tra type/lint
của frontend.

Kiểm thử backend bằng Maven Wrapper (bao gồm test provider, sinh NFO, tham số discover và
MockMvc):

```bash
cd backend && ./mvnw test
```

Kiểm tra frontend gồm hai bước — build production chạy luôn kiểm tra kiểu TypeScript, và
ESLint soát lỗi phong cách:

```bash
cd frontend && npm run build
cd frontend && npx eslint .
```

Cả hai bước cần chạy sạch trước khi gửi thay đổi. Nếu backend đang bật, frontend sẽ gọi
được dữ liệu thật khi build; nếu không, các trang vẫn build được và chỉ hiển thị dữ liệu
khi backend sẵn sàng.

## Kết luận

Đến đây chúng ta đã có một môi trường phát triển đầy đủ: backend Spring Boot chạy ở cổng
`8080` với Swagger UI và health-check, frontend Next.js chạy ở cổng `3000` trỏ về backend
qua `NEXT_PUBLIC_API_BASE_URL`, cùng bộ kiểm thử và kiểm tra để bảo đảm thay đổi không làm
hỏng luồng hiện có. Điểm mấu chốt cần nhớ: dự án dùng Maven Wrapper nên không cần cài Maven,
và mọi khoá dịch vụ ngoài đều tuỳ chọn — luồng chính chạy được ngay chỉ với JDK 17+ và
Node.js 20+.

Các tài liệu liên quan trong bộ hướng dẫn:

- [06 – Tham chiếu cấu hình](./06-tham-chieu-cau-hinh.md) — danh sách đầy đủ các
  biến môi trường và cách cấu hình cho từng môi trường.
- Tài liệu API sinh tự động: mở Swagger UI tại <http://localhost:8080/swagger-ui.html> hoặc
  xem bản xuất tĩnh ở [`docs/openapi.json`](../openapi.json).
