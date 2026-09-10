# Bộ tài liệu hướng dẫn RapPhim WareHouse

> **Tài liệu:** Mục lục bộ hướng dẫn RapPhim WareHouse
> **Phiên bản:** 1.0
> **Cập nhật:** 2026-09-11
> **Đối tượng đọc:** Mọi người tham gia dự án (lập trình viên, người tích hợp API, DevOps)
> **Trạng thái:** Chính thức
> **Tag:** mục-lục, hướng-dẫn, tổng-quan, backend, frontend, devops

## Giới thiệu

Đây là mục lục của bộ tài liệu hướng dẫn RapPhim WareHouse — một kho phim web gồm
**backend Spring Boot 4.1.1** (Java 17, Maven Wrapper) đóng vai trò lớp trung gian chuẩn hoá
nhiều nguồn phim về một schema DTO duy nhất, và **frontend Next.js 16.3.4** (React 19.2.8,
Tailwind CSS 4) hiển thị giao diện xem phim.

Bộ tài liệu được viết để đọc theo nhu cầu: mỗi file đứng độc lập với một khối metadata và một
kết luận trỏ tới các tài liệu liên quan, nhưng cả bộ cũng ghép thành một mạch từ tổng quan,
cài đặt, kiến trúc, mở rộng nguồn, API, triển khai, cấu hình đến xử lý sự cố. Trang này cho bạn
hai thứ: một **bảng mục lục** để nhảy thẳng tới tài liệu cần đọc, và một **lộ trình đọc theo
vai trò** để biết nên đọc theo thứ tự nào.

Toàn bộ nội dung được kiểm chứng trực tiếp từ mã nguồn trong
`backend/src/main/java/com/rapphim/warehouse/` và các tệp hạ tầng ở gốc kho, nên khớp với hiện
thực. Khi cần tra cứu chính xác từng endpoint, hãy mở Swagger UI hoặc bản xuất tĩnh
[`docs/openapi.json`](../openapi.json).

## Bảng mục lục

| STT | Tài liệu | Mô tả | Đối tượng |
|---|---|---|---|
| 00 | [Tổng quan hệ thống](./00-tong-quan-he-thong.md) | Bức tranh toàn cảnh: các thành phần, luồng dữ liệu, danh sách nguồn phim / metadata, cache và bề mặt API. | Người mới tiếp cận dự án, quản lý kỹ thuật, người tích hợp |
| 01 | [Cài đặt môi trường phát triển](./01-cai-dat-moi-truong-phat-trien.md) | Dựng backend và frontend tại máy, biến môi trường tối thiểu, chạy kiểm thử và kiểm tra. | Lập trình viên mới tham gia dự án |
| 02 | [Kiến trúc hệ thống](./02-kien-truc-he-thong.md) | Phân tầng web / service / provider / config, trừu tượng `MovieProvider`, chuẩn hoá DTO, cache Caffeine, CoreDNS và luồng một request thật. | Lập trình viên backend, kiến trúc sư |
| 03 | [Thêm một nguồn phim (Provider) mới](./03-them-nguon-phim-moi.md) | Bảy bước thêm nguồn ở mức mã nguồn: enum, cấu hình, model Jackson, `RestClient`, cài đặt `MovieProvider`, retry và test. | Lập trình viên backend mở rộng nguồn phim |
| 04 | [Tài liệu API](./04-tai-lieu-api.md) | Quy ước chung, vỏ bọc phản hồi, danh sách endpoint theo nhóm, bảng mã lỗi và ví dụ gọi thật. | Người tích hợp API, lập trình viên frontend |
| 05 | [Triển khai bằng Docker (homelab)](./05-trien-khai-docker-homelab.md) | Ba container `dns` / `backend` / `web`, chuẩn bị `.env`, build và chạy, `deploy.sh`, CoreDNS, health-check và rollback. | DevOps / người vận hành homelab |
| 06 | [Tham chiếu cấu hình](./06-tham-chieu-cau-hinh.md) | Bản tham chiếu đầy đủ biến môi trường, ánh xạ sang lớp `*Properties`, và hệ quả khi để trống từng biến. | DevOps, lập trình viên |
| 07 | [Xử lý sự cố](./07-xu-ly-su-co.md) | Kỷ luật chẩn đoán phân tầng, bảng tra nhanh triệu chứng, các sự cố lớn kèm lệnh kiểm tra, và checklist chẩn đoán. | DevOps, trực vận hành, lập trình viên |

## Lộ trình đọc theo vai trò

Không cần đọc cả bộ theo số thứ tự. Chọn lộ trình khớp vai trò của bạn.

### Lập trình viên mới

Mục tiêu: hiểu hệ thống rồi bắt đầu viết mã được.

1. [00 – Tổng quan hệ thống](./00-tong-quan-he-thong.md) — nắm hệ thống gồm những gì và dữ liệu chảy ra sao.
2. [01 – Cài đặt môi trường phát triển](./01-cai-dat-moi-truong-phat-trien.md) — dựng máy, chạy được backend và frontend.
3. [02 – Kiến trúc hệ thống](./02-kien-truc-he-thong.md) — hiểu cách phân tầng và trừu tượng provider.
4. [04 – Tài liệu API](./04-tai-lieu-api.md) — bề mặt API mà frontend và tầng service làm việc cùng.
5. [03 – Thêm một nguồn phim mới](./03-them-nguon-phim-moi.md) — bài thực hành mở rộng đầu tiên khi đã quen mã.
6. [07 – Xử lý sự cố](./07-xu-ly-su-co.md) — kỷ luật "phân tầng trước, quy kết sau" để gỡ lỗi.

### Người tích hợp API

Mục tiêu: gọi API đúng và xử lý lỗi gọn.

1. [00 – Tổng quan hệ thống](./00-tong-quan-he-thong.md) — hiểu vai trò lớp trung gian và tham số `provider`.
2. [04 – Tài liệu API](./04-tai-lieu-api.md) — endpoint theo nhóm, vỏ bọc `ApiResponse` / `PageResponse`, bảng mã lỗi.
3. [06 – Tham chiếu cấu hình](./06-tham-chieu-cau-hinh.md) — phần CORS và các khoá dịch vụ ảnh hưởng tới lời gọi.
4. [07 – Xử lý sự cố](./07-xu-ly-su-co.md) — đọc trường `code` để rẽ nhánh xử lý khi API trả lỗi.

### DevOps

Mục tiêu: triển khai, cấu hình và vận hành ổn định.

1. [00 – Tổng quan hệ thống](./00-tong-quan-he-thong.md) — kiến trúc và ánh xạ cổng (nội bộ `8080`/`3000`, homelab `7101`/`7100`).
2. [05 – Triển khai bằng Docker (homelab)](./05-trien-khai-docker-homelab.md) — dựng ba container, `deploy.sh`, CoreDNS, cập nhật và rollback.
3. [06 – Tham chiếu cấu hình](./06-tham-chieu-cau-hinh.md) — biến `.env`, biến container, và hệ quả khi để trống.
4. [07 – Xử lý sự cố](./07-xu-ly-su-co.md) — chẩn đoán DNS/TLS, CORS, OOM và các sự cố vận hành.

## Kết luận

Bộ tài liệu này bao trọn vòng đời làm việc với RapPhim WareHouse: từ hiểu hệ thống, dựng môi
trường, nắm kiến trúc, mở rộng nguồn phim, tích hợp API, triển khai homelab, tra cứu cấu hình đến
xử lý sự cố. Hãy dùng bảng mục lục để nhảy tới đúng tài liệu, và lộ trình theo vai trò để đọc theo
thứ tự hợp lý.

Tài liệu và tài nguyên liên quan ngoài bộ hướng dẫn:

- [`../openapi.json`](../openapi.json) và Swagger UI (`http://localhost:8080/swagger-ui.html`) — đặc tả API đầy đủ, gọi thử được.
- [`../ebook/README.md`](../ebook/README.md) — sổ tay sự cố DevOps thật rút từ nhật ký triển khai dự án.
- [`../../README.md`](../../README.md) — sổ tay dự án ở gốc kho: tổng quan, cách chạy và các giới hạn đã biết.
- [`../../AGENTS.md`](../../AGENTS.md) — quy ước vận hành, ranh giới an toàn và bản đồ dự án cho agent.
