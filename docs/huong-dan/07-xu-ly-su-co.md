# Hướng dẫn xử lý sự cố

> **Tài liệu:** Hướng dẫn xử lý sự cố RapPhim WareHouse
> **Phiên bản:** 1.0
> **Cập nhật:** 2026-09-11
> **Đối tượng đọc:** DevOps, trực vận hành, lập trình viên
> **Trạng thái:** Chính thức
> **Tag:** sự-cố, chẩn-đoán, vận-hành, backend, mạng, upstream, dns, cors

## Giới thiệu

Tài liệu này là sổ tay xử lý sự cố cho RapPhim WareHouse. Nó tồn tại vì một lý do rất
cụ thể: hệ thống là một lớp trung gian đứng trước nhiều nguồn bên ngoài (KKPhim, NguonC,
VSMOV, kho riêng homelab, TMDB, AniList/Jikan), nên phần lớn sự cố không nằm trong mã của
chúng ta mà nằm ở **ranh giới** giữa các tầng — dữ liệu nguồn trả về, logic ứng dụng,
và đường mạng ra ngoài. Khi một trang trắng hay một lời gọi API trả `502`, câu hỏi đúng
không phải "code hỏng chỗ nào" mà là "**tầng nào** đang hỏng".

Trước khi nói *làm thế nào* để sửa từng sự cố, tài liệu đặt ra *cái gì* và *tại sao* của
kỷ luật chẩn đoán: **phân tầng trước, quy kết sau**. Bài học đắt nhất của dự án — sự cố
`502 UPSTREAM_ERROR` ở VSMOV — bắt nguồn từ việc bỏ qua bước này: lỗi bị quy ngay cho
Cloudflare chặn TLS của Java, trong khi nguyên nhân thật chỉ là một trường JSON dị dạng.
Chúng ta viết lại toàn bộ quy trình để chuyện đó không lặp lại.

Tài liệu gồm ba phần: một bảng tra nhanh "triệu chứng → nguyên nhân → cách xử lý", một
loạt mục chẩn đoán chi tiết cho từng sự cố lớn (kèm lệnh kiểm tra), và cuối cùng là một
checklist chẩn đoán nhanh để dán cạnh màn hình trực.

## Kỷ luật chẩn đoán phân tầng

Nguyên tắc trung tâm của cả tài liệu: **xác định lỗi ở tầng nào trước khi đổ lỗi cho
anti-bot, Cloudflare hay nhà mạng.** Ba tầng, xét theo đúng thứ tự này:

| Thứ tự | Tầng | Câu hỏi cần trả lời | Công cụ soi |
|---|---|---|---|
| 1 | **Dữ liệu** | Nguồn có trả dữ liệu không? Dữ liệu có đúng hình dạng schema không? Khoá đã cấu hình chưa? | Gọi thẳng nguồn bằng `curl`, đọc body thô, xem `/api/v1/status` |
| 2 | **Ứng dụng** | Backend/frontend có xử lý đúng không? Mã lỗi trả về là gì? Cache có cũ không? | Đọc `code` trong `ApiError`, log backend, `/actuator/health` |
| 3 | **Mạng** | Có phân giải được tên miền không? Có mở được kết nối và bắt tay TLS không? | `getent hosts`, `openssl s_client`, `dig` |

Chỉ khi cả ba tầng đều "sạch" mà lỗi vẫn còn, và bằng chứng chỉ đúng vào chặn theo tên
miền (TCP mở được nhưng TLS bị reset ngay khi gửi SNI), lúc đó mới kết luận là bị chặn ở
biên mạng. Quy kết đó là **kết luận cuối cùng, không phải giả thuyết đầu tiên**.

Vì sao thứ tự này quan trọng: quy kết cho "anti-bot" hay "Cloudflare" là cái bẫy dễ chịu
nhất — nó nghe hợp lý, nó nằm ngoài tầm kiểm soát của ta, và nó cho phép ngừng điều tra.
Nhưng nếu nguyên nhân thật ở tầng dữ liệu, mọi công sức xoay quanh TLS/JA3 đều đổ sông.
Kỷ luật ở đây gói trong một câu của hiến pháp dự án: **Đo, không đoán.**

### Cách hệ thống tự xuống thang

Một điểm thiết kế giúp chẩn đoán dễ hơn: khi một nguồn phụ thiếu khoá hoặc hỏng, hệ thống
**xuống thang** thay vì sập cả API. Nắm rõ hành vi này để đọc đúng triệu chứng:

- Thiếu `ZCLOUD_API_KEY` / `ZCLOUD_PASSWORD` → nguồn `homelab` trả **rỗng**, không ném lỗi.
- Thiếu `TMDB_ACCESS_TOKEN` / `TMDB_API_KEY` → nhóm endpoint `/api/v1/tmdb/*` trả
  `503 TMDB_NOT_CONFIGURED`; phần còn lại của API, kể cả xuất NFO, vẫn chạy.
- Thiếu `RAPPHIM_ADMIN_TOKEN` → trang quản trị `503 ADMIN_NOT_CONFIGURED`, chỉ còn xem được.

Nghĩa là "một tính năng im lặng" thường là cấu hình thiếu ở tầng dữ liệu, **không phải**
sự cố mạng. Đừng nhầm xuống thang có chủ đích với hỏng hóc.

## Bảng tra nhanh: triệu chứng → nguyên nhân → cách xử lý

Dùng bảng này để định vị nhanh; mỗi dòng có mục chi tiết tương ứng bên dưới.

| Triệu chứng | Tầng nghi ngờ | Nguyên nhân thường gặp | Cách xử lý nhanh |
|---|---|---|---|
| `502` với `code = UPSTREAM_ERROR` | Dữ liệu → Mạng | Nguồn trả JSON dị dạng (parse fail) **hoặc** blip mạng thoáng qua | Gọi thẳng nguồn, đọc body thô; nếu parse fail thì sửa model, nếu chớp nhoáng thì retry đã nuốt |
| `502` với `code = UPSTREAM_BLOCKED` | Mạng | Không tra được tên miền, kết nối bị cắt ngay khi bắt tay | Kiểm DNS rồi TLS/SNI; đây mới là dấu hiệu chặn theo tên miền |
| Nguồn `homelab` trả rỗng | Dữ liệu | Thiếu `ZCLOUD_API_KEY` / `ZCLOUD_PASSWORD` | Đặt khoá qua env hoặc trang quản trị; xuống thang là **đúng thiết kế** |
| `/api/v1/tmdb/*` trả `503 TMDB_NOT_CONFIGURED` | Dữ liệu | Chưa cấu hình khoá TMDB | Đặt `TMDB_ACCESS_TOKEN` (v4) hoặc `TMDB_API_KEY` (v3); kiểm `/api/v1/tmdb/status` |
| Trang tải được nhưng mọi lời gọi API bị chặn | Ứng dụng | CORS: origin frontend không nằm trong danh sách cho phép | Đặt `RAPPHIM_CORS_ORIGINS` / `PUBLIC_WEB_URL` đúng gốc frontend |
| `I/O error`, nguồn "hỏng" ngẫu nhiên, đôi khi ra `127.0.0.1` | Mạng | ISP chèn/đầu độc phản hồi DNS | Trỏ backend vào CoreDNS DNS-over-TLS (`172.29.0.53`) |
| Riêng TMDB không gọi được dù DNS đã đúng | Mạng | Chặn theo tên miền trong bắt tay TLS (SNI) | Cho lưu lượng đi vòng (VPN/tunnel); **không sửa được từ mã** |
| Container bị OOM-killer giết, dịch vụ chập chờn | Hạ tầng | Homelab hết RAM (~7.4GB) | Giữ dịch vụ nặng (dub, stack rophim) ở trạng thái tắt; đặt `mem_limit` |
| `500` với `code = INTERNAL_ERROR` | Ứng dụng | Lỗi không lường trước phía server | Đọc log backend tại dòng `Loi khong mong doi tai ...` |
| `400` với `code = INVALID_PARAMETER` / `VALIDATION_FAILED` | Ứng dụng | Tham số sai định dạng hoặc ngoài miền (ví dụ `limit` > 64) | Sửa tham số theo thông điệp lỗi trả kèm |
| `404` với `code = MOVIE_NOT_FOUND` | Dữ liệu | Sai slug, hoặc dùng slug của nguồn này cho nguồn khác | Đối chiếu slug đúng nguồn (slug hai nguồn khác nhau) |

### Bảng mã lỗi tham chiếu

Mọi lỗi API đều trả về envelope `ApiError` với trường `code` để client xử lý theo từng
trường hợp. Các mã do `GlobalExceptionHandler` ánh xạ:

| `code` | HTTP | Ý nghĩa | Tầng |
|---|---|---|---|
| `INVALID_PARAMETER` | 400 | Tham số sai định dạng hoặc ngoài miền giá trị | Ứng dụng |
| `MISSING_PARAMETER` | 400 | Thiếu tham số bắt buộc | Ứng dụng |
| `VALIDATION_FAILED` | 400 | Không qua bước validate (ví dụ `limit` > 64) | Ứng dụng |
| `UNAUTHORIZED` | 401 | Sai hoặc thiếu khoá quản trị | Ứng dụng |
| `MOVIE_NOT_FOUND` | 404 | Không có phim với slug đã cho | Dữ liệu |
| `ENDPOINT_NOT_FOUND` | 404 | Sai đường dẫn | Ứng dụng |
| `TMDB_NOT_FOUND` | 404 | Phim không có bản ghi tương ứng trên TMDB | Dữ liệu |
| `UPSTREAM_ERROR` | 502 | Nguồn bên ngoài lỗi hoặc timeout, không rõ nguyên nhân | Dữ liệu / Mạng |
| `UPSTREAM_BLOCKED` | 502 | Không tra được tên miền, hoặc kết nối bị cắt khi bắt tay | Mạng |
| `TMDB_NOT_CONFIGURED` | 503 | Chưa cấu hình khoá TheMovieDB | Dữ liệu |
| `ADMIN_NOT_CONFIGURED` | 503 | Chưa đặt `RAPPHIM_ADMIN_TOKEN` | Dữ liệu |
| `INTERNAL_ERROR` | 500 | Lỗi không xác định phía server | Ứng dụng |

Hai mã `UPSTREAM_ERROR` và `UPSTREAM_BLOCKED` **cùng trả HTTP 502** nhưng mang ý nghĩa
chẩn đoán khác hẳn nhau — phân biệt được chúng là chìa khoá của cả tài liệu này. Mã nằm
trong `UpstreamException`; hàm `UpstreamException.network(...)` chọn mã dựa trên loại
ngoại lệ gốc (`UnknownHostException` và bắt tay TLS bị cắt → `UPSTREAM_BLOCKED`;
`SocketTimeoutException` và lỗi khác → `UPSTREAM_ERROR`).

## Kiểm tra sức khoẻ trước khi chẩn đoán

Trước mỗi phiên chẩn đoán, xác nhận bản thân backend còn sống. Đây là bước "tầng ứng
dụng" rẻ nhất và loại ngay nửa số giả thuyết.

```bash
# Backend con song khong (chay khi backend dang bat)
curl -s http://localhost:8080/actuator/health
```

**Kết quả** khi ứng dụng khoẻ:

```json
{"status":"UP"}
```

Xem nguồn nào đang hoạt động và trạng thái cấu hình khoá (không bao giờ lộ giá trị khoá,
chỉ báo *có/không*):

```bash
# Cac nguon dang hoat dong
curl -s http://localhost:8080/api/v1/providers

# Backend da co khoa TMDB hay chua
curl -s http://localhost:8080/api/v1/tmdb/status
```

Khi chạy bằng Docker trên homelab, xác nhận cả ba container đều `healthy`:

```bash
docker compose ps
```

Ba container cần thấy là `rapphim-dns`, `rapphim-backend` và `rapphim-web`.

## Sự cố 1 — 502 UPSTREAM_ERROR ở VSMOV (bài học phân tầng)

Đây là sự cố kinh điển của dự án và là lý do tồn tại của toàn bộ kỷ luật ở trên.

**Triệu chứng.** Gọi nguồn `vsmov` trả `502` với `code = UPSTREAM_ERROR`. Ban đầu sự cố
bị **chẩn đoán sai** là Cloudflare chặn dấu vân tay JA3/TLS của Java — một giả thuyết
nghe rất hợp lý vì VSMOV nằm sau Cloudflare.

**Nguyên nhân thật.** API của VSMOV đôi khi trả `poster_url={}` (một object rỗng) ở chỗ
lẽ ra là một chuỗi URL. Jackson gặp object khi mong đợi chuỗi thì **parse fail** — đây là
lỗi thuần **tầng dữ liệu**, không liên quan gì tới TLS hay anti-bot. Nếu đã gọi thẳng
nguồn và đọc body thô ngay từ đầu, sự cố lộ ra trong một phút.

### Bước chẩn đoán

**Tầng 1 — dữ liệu.** Gọi thẳng nguồn, đọc JSON thô, tìm trường dị dạng:

```bash
# Goi thang VSMOV, khong qua backend - xem hinh dang JSON that
curl -s "https://vsmov.com/api/danh-sach/phim-moi-cap-nhat?page=1" | head -c 2000
```

Soi các trường ảnh (`poster_url`, `thumb_url`): nếu thấy `{}` thay vì chuỗi, đó chính là
thủ phạm. Đối chiếu qua backend để thấy đúng nguồn nào hỏng:

```bash
# Goi qua backend, gioi han 5 phim de doc log cho gon
curl -s "http://localhost:8080/api/v1/movies/latest?provider=vsmov&limit=5"
```

**Tầng 2 — ứng dụng.** Đọc log backend. Khi `UpstreamException` được ném, handler ghi
theo mẫu `Loi tu nguon '{provider}': {message}`, còn `VsmovProvider` ghi
`Goi VSMOV that bai sau {n} lan: ...` sau khi hết lượt retry. Một stack trace của
`MismatchedInputException` / `JsonMappingException` xác nhận đây là parse fail, không phải
lỗi kết nối.

```bash
# Loc log backend theo tu khoa nguon (khi chay bang Docker)
docker logs rapphim-backend 2>&1 | grep -i "vsmov"
```

**Tầng 3 — mạng.** Chỉ xét tầng này *sau khi* đã loại tầng dữ liệu. Nếu body thô ở tầng 1
trả về bình thường và đầy đủ, mạng không phải vấn đề — dừng nghi Cloudflare tại đây.

### Cách khắc phục

Hai thay đổi đã đưa vào mã, phản ánh đúng hai nguyên nhân có thật:

1. **Chống dữ liệu dị dạng (nguyên nhân chính).** `VsmovProvider` đọc ảnh qua một hàm chỉ
   nhận giá trị khi nó thực sự là chuỗi, còn `{}` bị coi như ảnh thiếu:

   ```java
   // VSMOV doi khi tra {} (object rong) cho anh thieu; chi nhan khi la chuoi that.
   private static String asUrl(Object value) {
       return value instanceof String url && !url.isBlank() ? url : null;
   }
   ```

2. **Nuốt blip mạng thoáng qua (nguyên nhân phụ).** VSMOV nằm sau Cloudflare nên thỉnh
   thoảng bị ngắt ngang ngay sau khi container khởi động lại. Lời gọi được thử lại tối đa
   **3 lần** với backoff tăng dần (200ms nhân theo số lần), đủ để vượt qua các cú chớp
   nhoáng mà không cần đổ cho anti-bot:

   ```java
   // VSMOV nam sau Cloudflare nen thi thoang bi ngat ngang giua chung ("Request cancelled")
   // ngay sau khi container khoi dong lai. Thu lai vai lan de nuot cac cu chop nhoang nay.
   private static final int NETWORK_ATTEMPTS = 3;
   private static final long NETWORK_BACKOFF_MS = 200;
   ```

**Bài học rút ra.** Phân tầng trước khi quy kết. Cùng một triệu chứng `502` có thể là
parse fail (dữ liệu) hoặc kết nối chập chờn (mạng), và hai cái đòi hai cách sửa hoàn toàn
khác nhau. Retry không bao giờ sửa được một object JSON dị dạng; sửa model không bao giờ
cứu được một kết nối bị cắt.

## Sự cố 2 — nguồn homelab trả rỗng

**Triệu chứng.** Gọi `provider=homelab` trả về danh sách rỗng, trong khi kho thực sự có
phim. Không có lỗi, không có `502`.

**Nguyên nhân.** Thiếu cả `ZCLOUD_API_KEY` lẫn `ZCLOUD_PASSWORD`. Đây là hành vi **xuống
thang có chủ đích**: nguồn `homelab` trả rỗng thay vì ném lỗi, để phần còn lại của API
vẫn chạy bình thường. Rỗng ở đây là dấu hiệu tầng dữ liệu (thiếu cấu hình), không phải
tầng mạng.

### Bước chẩn đoán

```bash
# Bien khoa da duoc truyen vao container backend chua
docker exec rapphim-backend env | grep -i zcloud
```

Nếu cả hai biến đều trống, đó là nguyên nhân. Lưu ý thêm về mạng nội bộ khi chạy Docker:
từ trong container, `localhost` là chính container, nên ZCloud (chạy trên chính máy chủ,
không trong Docker) phải gọi qua `host.docker.internal` — compose đã đặt sẵn địa chỉ này
ở `RAPPHIM_ZCLOUD_BASE_URL` và khai báo `extra_hosts: host.docker.internal:host-gateway`.

### Cách khắc phục

Đặt một trong hai khoá rồi khởi động lại backend. `ZCLOUD_API_KEY` (gửi qua header
`x-api-key`) được ưu tiên; `ZCLOUD_PASSWORD` dùng khi chưa tạo khoá:

```bash
export ZCLOUD_API_KEY="<khoa goi thang>"
# hoac: export ZCLOUD_PASSWORD="<mat khau dang nhap>"
```

Trên homelab, điền vào tệp `.env` cạnh `docker-compose.yml` rồi dựng lại dịch vụ. Cũng có
thể đặt khoá ngay trên trang quản trị `/cms` (khoá đặt qua giao diện được ưu tiên hơn biến
môi trường). Để kiểm chứng khoá đã tới nơi: đặt sai khoá thì nguồn trả `502` kèm đúng lời
của kho (`401 Chưa đăng nhập`) — tức là khoá thật sự đi tới ZCloud.

## Sự cố 3 — TMDB trả 503 TMDB_NOT_CONFIGURED

**Triệu chứng.** Nhóm endpoint `/api/v1/tmdb/*` (và trang `/kham-pha`) trả
`503 TMDB_NOT_CONFIGURED`.

**Nguyên nhân.** Chưa cấu hình khoá TheMovieDB. Đây lại là xuống thang tầng dữ liệu: thiếu
khoá thì chỉ nhóm TMDB tắt, còn xuất file NFO vẫn chạy vì KKPhim đã nhúng sẵn mã TMDB/IMDb
trong mỗi phim.

### Bước chẩn đoán

```bash
# Backend da co khoa TMDB hay chua (chi bao co/khong, khong lo gia tri)
curl -s http://localhost:8080/api/v1/tmdb/status
```

### Cách khắc phục

Đặt token đọc v4 (ưu tiên) hoặc khoá v3, rồi khởi động lại:

```bash
export TMDB_ACCESS_TOKEN="<read access token v4>"
# hoac khoa v3:
export TMDB_API_KEY="<api key v3>"
cd backend && ./mvnw spring-boot:run
```

Một cái bẫy đã gặp thật: **lạc khoá v3 sang ô v4** (hoặc ngược lại). Nếu đã đặt mà vẫn
`503`, kiểm tra token nằm đúng biến — token v4 dạng chuỗi dài đặt vào `TMDB_ACCESS_TOKEN`,
khoá v3 ngắn hơn đặt vào `TMDB_API_KEY`.

Nếu khoá đã đúng mà TMDB vẫn không gọi được, vấn đề chuyển sang tầng mạng — xem Sự cố 5.

## Sự cố 4 — trình duyệt chặn API do CORS

**Triệu chứng.** Trang tải được phần vỏ nhưng mọi lời gọi API bị chặn; console trình duyệt
báo lỗi CORS (thiếu `Access-Control-Allow-Origin`). Bản thân backend vẫn khoẻ khi gọi bằng
`curl`.

**Nguyên nhân.** Đây là lỗi **tầng ứng dụng**, không phải nguồn hay mạng: origin của
frontend không nằm trong danh sách CORS được phép của backend. Thường gặp sau khi đổi cổng
hoặc địa chỉ triển khai mà quên cập nhật danh sách.

### Bước chẩn đoán

Xác nhận backend trả dữ liệu bình thường khi gọi trực tiếp (loại tầng dữ liệu và mạng):

```bash
# Goi thang backend - neu ra du lieu that thi loi nam o CORS, khong phai backend
curl -s "http://localhost:8080/api/v1/movies/latest?limit=1"
```

Kiểm tra header CORS mà backend trả cho đúng origin của frontend:

```bash
# Gia lap request tu trinh duyet o goc frontend
curl -s -I -H "Origin: http://localhost:7100" \
  "http://localhost:8080/api/v1/movies/latest?limit=1"
```

Nếu phản hồi **không** có `Access-Control-Allow-Origin` khớp origin vừa gửi, đó là nguyên
nhân.

### Cách khắc phục

Đặt danh sách origin cho phép đúng gốc frontend. Backend đọc từ `RAPPHIM_CORS_ORIGINS`
(mặc định `http://localhost:3000,http://127.0.0.1:3000`); trên Docker, compose truyền giá
trị này vào từ `PUBLIC_WEB_URL`:

```bash
# Vi du cho homelab: frontend chay o cong 7100
export RAPPHIM_CORS_ORIGINS="http://192.168.100.169:7100"
# Tren Docker, dat PUBLIC_WEB_URL trong .env de compose truyen vao RAPPHIM_CORS_ORIGINS
```

Lưu ý kiến trúc: trong luồng chính, trình duyệt **không** gọi thẳng backend — mọi lời gọi
đi qua route handler cùng gốc của Next, nên CORS chỉ ảnh hưởng các lời gọi khác gốc (ví
dụ gọi thẳng backend từ mã client). Nếu cả trang bị chặn, kiểm tra thêm `API_INTERNAL_URL`
(địa chỉ backend mà máy chủ Next gọi tới) đã đúng chưa.

## Sự cố 5 — ISP đầu độc DNS, và chặn TLS theo tên miền

Đây là hai sự cố tầng mạng khác nhau, hay bị gộp làm một. Tách rõ để sửa đúng.

### 5a. ISP chèn/đầu độc phản hồi DNS

**Triệu chứng.** Một nguồn "hỏng" ngẫu nhiên với `I/O error`, trông như backend hỏng.
Thực chất là **không bao giờ kết nối tới nơi** vì tên miền phân giải ra địa chỉ giả. Đo
thật trên máy chủ: hỏi `api.themoviedb.org` năm lần bằng DNS thường, ba lần trả về
`127.0.0.1`.

**Nguyên nhân.** Mạng ở một số nơi chèn phản hồi DNS giả cho vài tên miền. Backend nhận
địa chỉ giả rồi gọi vào hư không.

#### Bước chẩn đoán

```bash
# Hoi nhieu lan bang DNS thuong - neu ra 127.0.0.1 hoac dia chi doi lien tuc thi la bi dau doc
for i in 1 2 3 4 5; do getent hosts api.themoviedb.org; done
```

Nếu kết quả nhảy loạn hoặc có `127.0.0.1`, DNS đang bị đầu độc.

#### Cách khắc phục

Stack đã có sẵn một container CoreDNS chạy **DNS-over-TLS**: truy vấn đi trong đường mã
hoá nên ISP không chèn vào được. Backend được trỏ về bộ phân giải này bằng địa chỉ IP tĩnh
`172.29.0.53` (ở mức Docker chưa nhận tên dịch vụ, phải ghi IP). Cấu hình forward trong
`Corefile`:

```
.:53 {
    forward . tls://8.8.8.8 tls://8.8.4.4 {
        tls_servername dns.google
    }
    cache 300
    errors
}
```

Kiểm chứng qua CoreDNS cho ra địa chỉ thật và ổn định:

```bash
# Hoi qua bo phan giai rieng - sau lan hoi phai ra cung mot dia chi that
dig @172.29.0.53 api.themoviedb.org +short
```

Nếu container `rapphim-dns` không `healthy`, backend sẽ rơi lại DNS mặc định và triệu
chứng đầu độc quay lại — kiểm `docker compose ps` trước.

### 5b. Chặn TLS theo tên miền (SNI) — không sửa được từ mã

**Triệu chứng.** Riêng TMDB vẫn không gọi được **dù DNS đã đúng**. Backend trả `502` với
`code = UPSTREAM_BLOCKED` và thông điệp "Kết nối tới ... bị cắt ngay khi bắt tay".

**Nguyên nhân.** Cùng mạng đó còn chặn theo tên miền ngay trong bắt tay TLS: TCP mở được
tới cổng 443, nhưng vừa gửi tên miền (SNI) là kết nối bị reset. Đây **không phải** chuyện
ứng dụng sửa được — và cũng **không phải** anti-bot hay JA3, mà là chặn ở biên mạng.

#### Bước chẩn đoán

Đây chính là lúc kỷ luật phân tầng cho phép kết luận "bị chặn". Chạy đúng chuỗi đo dưới
đây; chỉ khi *toàn bộ* khớp thì mới quy cho chặn theo tên miền:

```bash
# 1. TCP toi IP cua dich co mo khong (thay <IP> bang dia chi that)
curl -s -o /dev/null -w "%{http_code}\n" --connect-timeout 5 https://<IP>:443

# 2. Bat tay TLS voi ten mien that - neu bi reset ngay thi la chan theo SNI
openssl s_client -connect <IP>:443 -servername api.themoviedb.org </dev/null

# 3. Doi chung: mot ten mien khac cung ha tang CDN co bat tay duoc khong
openssl s_client -connect <IP>:443 -servername www.google.com </dev/null
```

Kết luận "chặn theo tên miền" chỉ đúng khi: bước 1 mở được, bước 2 bị reset đúng lúc gửi
SNI, và bước 3 (tên miền khác, cùng IP/CDN) lại bắt tay bình thường. Thiếu bất kỳ điều
kiện nào thì chưa được đổ cho chặn — quay lại tầng dữ liệu và ứng dụng.

`UpstreamException.network(...)` tự nhận diện tình huống này: khi bắt tay bị cắt
(`SSLHandshakeException`, `Connection reset`, `terminated the handshake`), nó gắn mã
`UPSTREAM_BLOCKED` thay vì `UPSTREAM_ERROR`, để giao diện biết mà hiện hướng dẫn phù hợp.

#### Cách khắc phục

Không có cách sửa từ trong mã nguồn. Muốn dùng TMDB ở mạng như vậy phải cho lưu lượng đi
vòng ra ngoài: VPN, tunnel, hoặc một máy chủ trung gian. Phần còn lại của hệ thống
**không phụ thuộc TMDB**: xuất NFO vẫn chạy bằng mã TMDB/IMDb mà KKPhim nhúng sẵn, nên
file NFO vẫn đủ `title`, `year`, `plot` và `uniqueid`.

## Sự cố 6 — homelab hết RAM, OOM-killer giết dịch vụ

**Triệu chứng.** Dịch vụ chập chờn, container bị khởi động lại bất ngờ, hoặc `sshd` suýt
bị giết. Đây là sự cố **tầng hạ tầng**, không phải nguồn hay ứng dụng.

**Nguyên nhân.** Homelab chỉ có khoảng 7.4GB RAM. Các khối nặng — nhất là dịch vụ thuyết
minh (dub) với ML (PaddleOCR ONNX + ffmpeg + TTS) — vượt quá sức máy, kéo theo OOM-killer
ra tay và chém nhầm tiến trình khác.

### Bước chẩn đoán

```bash
# Bo nho con lai tren may chu
free -h

# Container nao dang ngon RAM
docker stats --no-stream
```

```bash
# Da tung bi OOM-killer ra tay chua (can quyen tren may chu)
dmesg | grep -i "killed process"
```

### Cách khắc phục

Giữ các dịch vụ nặng ở trạng thái tắt để giải phóng RAM. Dịch vụ dub **hiện đang tắt**
trong `docker-compose.yml`, mã nguồn vẫn còn ở thư mục `dub/`; stack rophim cũng đã được
tắt để nhường bộ nhớ. Đặt `mem_limit` cho từng container để khi có OOM thì chỉ một
container gánh, không lan sang `sshd` hay dịch vụ khác. Chỉ bật lại dub khi đã có đủ RAM
(thêm service, đặt `DUB_INTERNAL_URL` cho web và bật cờ `NEXT_PUBLIC_DUB_ENABLED`).

## Kết luận

Sợi chỉ xuyên suốt mọi sự cố trên là một kỷ luật duy nhất: **phân tầng trước, quy kết
sau**. Cùng một triệu chứng `502` có thể là JSON dị dạng ở tầng dữ liệu, blip mạng thoáng
qua, hay chặn TLS ở biên — và ba cái đòi ba cách sửa khác nhau. Câu chuyện VSMOV nhắc ta
rằng "Cloudflare chặn" là giả thuyết dễ chịu nhất và thường là sai nhất khi chưa đo. Đo,
không đoán.

### Checklist chẩn đoán nhanh

Chạy theo đúng thứ tự này; dừng lại ngay khi tìm ra tầng hỏng.

1. **Backend còn sống?** `curl -s http://localhost:8080/actuator/health` → mong đợi
   `{"status":"UP"}`. Nếu không, xem log khởi động backend trước mọi thứ khác.
2. **Đọc mã lỗi.** Lấy `code` trong `ApiError`. `TMDB_NOT_CONFIGURED` /
   `ADMIN_NOT_CONFIGURED` / nguồn rỗng → thiếu cấu hình (tầng dữ liệu), không phải mạng.
3. **Tầng dữ liệu — gọi thẳng nguồn.** `curl` trực tiếp tới nguồn, đọc body thô. JSON dị
   dạng hay trường lạ (`poster_url={}`) lộ ra ở đây. Đây là bước bị bỏ qua trong sự cố
   VSMOV.
4. **Tầng ứng dụng — đọc log.** `docker logs rapphim-backend | grep -i <nguon>`. Tìm dòng
   `Loi tu nguon '...'` và loại ngoại lệ (parse fail hay lỗi kết nối).
5. **Phân biệt 502.** `UPSTREAM_ERROR` = lỗi/parse/timeout (nghi dữ liệu trước);
   `UPSTREAM_BLOCKED` = không tra được tên miền hoặc bắt tay bị cắt (nghi mạng).
6. **Tầng mạng — DNS.** `for i in 1 2 3 4 5; do getent hosts <ten-mien>; done`. Ra
   `127.0.0.1` hay địa chỉ nhảy loạn → bị đầu độc DNS; kiểm container `rapphim-dns` và
   `dig @172.29.0.53`.
7. **Tầng mạng — TLS/SNI.** `openssl s_client -connect <IP>:443 -servername <ten-mien>`.
   Chỉ kết luận "chặn theo tên miền" khi TCP mở được, SNI bị reset, mà tên miền khác cùng
   CDN vẫn bắt tay được.
8. **Hạ tầng.** `free -h` và `docker stats --no-stream`. Container chập chờn kèm RAM cạn →
   OOM; giữ dịch vụ nặng ở trạng thái tắt.
9. **Chỉ bây giờ** mới được nói tới anti-bot / Cloudflare / chặn biên — và chỉ khi bằng
   chứng ở bước 6–7 đúng vào chặn theo tên miền.

### Tài liệu liên quan

- [`00-tong-quan-he-thong.md`](./00-tong-quan-he-thong.md) — kiến trúc hai tầng, danh sách
  nguồn, luồng dữ liệu và cache; nền để hiểu tầng nào đứng ở đâu.
- [`01-cai-dat-moi-truong-phat-trien.md`](./01-cai-dat-moi-truong-phat-trien.md) — dựng môi
  trường, health-check và các biến môi trường tối thiểu.
- [`06-tham-chieu-cau-hinh.md`](./06-tham-chieu-cau-hinh.md) — danh sách đầy đủ
  các biến môi trường và cách cấu hình cho từng môi trường.
- [`../../README.md`](../../README.md) — sổ tay dự án, mục "Giới hạn đã biết" và phần bộ
  phân giải tên miền riêng.
- [`../ebook/van-khan-deploy.md`](../ebook/van-khan-deploy.md) — coda vui cho sổ tay sự cố,
  điểm lại các sự cố deploy có thật dưới dạng "văn khấn".
