# RapPhim WareHouse

Kho phim web gồm hai phần chạy độc lập:

| Thành phần | Công nghệ | Cổng | Vai trò |
|---|---|---|---|
| `backend/` | Spring Boot 4.1 (Java 17), Maven | 8080 | REST API tổng hợp và chuẩn hoá dữ liệu từ KKPhim + NguonC, bổ sung metadata TMDB và xuất file NFO, có Swagger UI |
| `frontend/` | Next.js 16 (App Router), React 19, Tailwind CSS 4 | 3000 | Giao diện xem phim theo phong cách YouTube |

Backend đóng vai trò lớp trung gian: gọi hai nguồn phim bên ngoài, đưa hai định dạng
JSON rất khác nhau về **một schema duy nhất**, cache lại kết quả rồi phục vụ frontend.
Nhờ vậy frontend không cần biết nguồn nào trả về gì.

```
Next.js  ──HTTP──>  Spring Boot REST API  ──HTTP──>  phimapi.com      (KKPhim)
                            │                    ├─>  phim.nguonc.com  (NguonC)
                            │                    └─>  api.themoviedb.org (TMDB, tuỳ chọn)
                            └─ Caffeine cache
```

---

## Chạy dự án

Cần **JDK 17 trở lên** và **Node.js 20 trở lên**. Không cần cài Maven — dự án dùng Maven Wrapper.

### 1. Backend

```bash
cd backend && ./mvnw spring-boot:run
```

- API: <http://localhost:8080/api/v1>
- **Swagger UI: <http://localhost:8080/swagger-ui.html>**
- OpenAPI JSON: <http://localhost:8080/v3/api-docs>
- Health check: <http://localhost:8080/actuator/health>

Trên Windows dùng `mvnw.cmd spring-boot:run`.

### 2. Frontend

```bash
cd frontend && npm install && npm run dev
```

Mở <http://localhost:3000>. Địa chỉ backend đọc từ `frontend/.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

---

## Tài liệu API (Swagger / OpenAPI 3.1)

Tài liệu được sinh tự động bằng **springdoc-openapi 3.1** từ chính annotation trong code,
nên không bao giờ lệch với hiện thực. Bản xuất tĩnh nằm ở [`docs/openapi.json`](docs/openapi.json).

Swagger UI cho phép gọi thử trực tiếp từng endpoint (nút *Try it out*).

### Quy ước chung

Mọi response đều bọc trong envelope `ApiResponse`:

```json
{
  "success": true,
  "message": "OK",
  "data": { },
  "timestamp": "2026-09-08T16:20:00Z"
}
```

Kết quả dạng danh sách nằm trong `PageResponse`:

```json
{
  "items": [ ],
  "meta": { "page": 1, "limit": 24, "totalItems": 29966, "totalPages": 1249 },
  "provider": "kkphim"
}
```

Mọi endpoint đều nhận query param `provider` (`kkphim` mặc định, hoặc `nguonc`).
`page` bắt đầu từ `1`, `limit` tối đa `64`.

### Danh sách endpoint

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/v1/movies/latest` | Phim mới cập nhật (trang chủ) |
| GET | `/api/v1/movies?type=` | Danh sách theo nhóm, kèm lọc `category` / `country` / `year` và `sortField` / `sortType` |
| GET | `/api/v1/movies/search?keyword=` | Tìm kiếm theo tên tiếng Việt hoặc tên gốc |
| GET | `/api/v1/movies/category/{slug}` | Phim theo thể loại |
| GET | `/api/v1/movies/country/{slug}` | Phim theo quốc gia |
| GET | `/api/v1/movies/year/{year}` | Phim theo năm phát hành |
| GET | `/api/v1/movies/{slug}` | Chi tiết phim kèm danh sách server và tập |
| GET | `/api/v1/movies/batch?slugs=` | Trạng thái hiện tại của nhiều phim, tối đa 30 slug |
| GET | `/api/v1/categories` | Toàn bộ thể loại |
| GET | `/api/v1/countries` | Toàn bộ quốc gia |
| GET | `/api/v1/providers` | Các nguồn dữ liệu đang hoạt động |
| GET | `/api/v1/list-types` | Các nhóm danh sách kèm nhãn hiển thị |
| GET | `/api/v1/movies/{slug}/nfo` | Xuất file NFO (XML) cho Kodi / Jellyfin / Emby |
| GET | `/api/v1/movies/{slug}/tmdb` | Metadata đầy đủ từ TheMovieDB |
| GET | `/api/v1/tmdb/discover` | Proxy của `discover/movie` trên TMDB |
| GET | `/api/v1/tmdb/movies/{id}` | Chi tiết một phim trên TMDB, tra theo mã TMDB |
| GET | `/api/v1/tmdb/genres` | Danh mục thể loại của TMDB |
| GET | `/api/v1/tmdb/status` | Backend đã có khoá TMDB hay chưa |

Giá trị hợp lệ của `type`: `phim-bo`, `phim-le`, `tv-shows`, `hoat-hinh`,
`phim-vietsub`, `phim-thuyet-minh`, `phim-long-tieng`, `dang-chieu`.
Hai nhóm cuối không có ở cả hai nguồn — xem bảng khác biệt bên dưới.

### Mã lỗi

Khi thất bại, API trả về `ApiError` với trường `code` để client xử lý theo từng trường hợp:

| `code` | HTTP | Ý nghĩa |
|---|---|---|
| `INVALID_PARAMETER` | 400 | Tham số sai định dạng hoặc ngoài miền giá trị |
| `MISSING_PARAMETER` | 400 | Thiếu tham số bắt buộc |
| `VALIDATION_FAILED` | 400 | Không qua bước validate (ví dụ `limit` > 64) |
| `MOVIE_NOT_FOUND` | 404 | Không có phim với slug đã cho |
| `ENDPOINT_NOT_FOUND` | 404 | Sai đường dẫn |
| `TMDB_NOT_FOUND` | 404 | Phim không có bản ghi tương ứng trên TMDB |
| `UPSTREAM_ERROR` | 502 | Nguồn phim bên ngoài lỗi hoặc timeout |
| `TMDB_NOT_CONFIGURED` | 503 | Chưa cấu hình khoá TheMovieDB |
| `INTERNAL_ERROR` | 500 | Lỗi không xác định phía server |

### Ví dụ

```bash
curl "http://localhost:8080/api/v1/movies/latest?page=1&limit=12"
curl "http://localhost:8080/api/v1/movies?type=phim-bo&country=han-quoc&year=2026"
curl "http://localhost:8080/api/v1/movies/search?keyword=nguoi%20nhen&provider=nguonc"
curl "http://localhost:8080/api/v1/movies/doi-chung"
```

---

## TheMovieDB và file NFO

`GET /api/v1/movies/{slug}/nfo` xuất file NFO chuẩn Kodi / Jellyfin / Emby:
`<movie>` cho phim lẻ, `<tvshow>` cho phim bộ, kèm `<uniqueid>` của cả TMDB lẫn IMDb
để trình quản lý thư viện khớp đúng phim.

**Endpoint này chạy được ngay, không cần khoá TMDB.** Lý do: KKPhim đã trả sẵn mã
TMDB/IMDb cùng điểm số trong mỗi phim, backend đọc thẳng từ đó.

```bash
curl -O -J "http://localhost:8080/api/v1/movies/quy-ong-the-gioi-ngam-phan-2/nfo"
```

Cấu hình khoá để lấy thêm metadata (tóm tắt tiếng Việt, thời lượng, hãng phim,
đạo diễn, vai diễn, ảnh độ phân giải cao) và mở khoá nhóm endpoint `/api/v1/tmdb/*`:

```bash
export TMDB_ACCESS_TOKEN="<read access token v4>"   # hoặc TMDB_API_KEY cho khoá v3
cd backend && ./mvnw spring-boot:run
```

Khi chưa có khoá, `/api/v1/tmdb/*` trả 503 `TMDB_NOT_CONFIGURED`, phần còn lại của
API không bị ảnh hưởng. Kiểm tra nhanh bằng `GET /api/v1/tmdb/status`.

### Trang khám phá

`/kham-pha` duyệt kho phim của TMDB theo thể loại, năm, điểm tối thiểu và ngôn ngữ gốc.
Bấm vào một phim sẽ mở `/kham-pha/{id}` — trang chi tiết đầy đủ: poster, ảnh nền, tóm tắt,
điểm số, thời lượng, thể loại, đạo diễn, hãng sản xuất và dàn diễn viên kèm vai diễn.

TMDB chỉ có metadata chứ không có link phát, nên ngay dưới phần thông tin, trang chi tiết
tự tìm **tên gốc** trên hai nguồn của RapPhim và hiện các bản xem được. Đây là cách bắc cầu
giữa kho metadata phong phú của TMDB và hai nguồn có link xem.

Vài chi tiết đã xử lý:

- Sắp xếp theo điểm tự thêm `vote_count.gte=200`. Thiếu ngưỡng này thì kết quả toàn
  phim chỉ vài người chấm nhưng đạt 10 điểm.
- Trang bị chặn ở 500 vì TMDB không cho duyệt sâu hơn.
- Bộ lọc dùng form GET thuần nên chạy cả khi tắt JavaScript; các ô bỏ trống không được
  gửi lên TMDB.
- Chưa có khoá thì trang hiện hướng dẫn cấu hình thay vì báo lỗi chung chung.

> **Lưu ý về mạng**: trên máy đang phát triển, `api.themoviedb.org` phân giải về
> `127.0.0.1` nên không gọi được (CDN ảnh `image.tmdb.org` vẫn bình thường). Đây là
> chặn ở phía DNS/máy, không phải lỗi code. Cần đổi DNS hoặc dùng VPN để phần
> enrich hoạt động; file NFO thì không phụ thuộc vào việc này.

---

## Kiến trúc backend

Phân tầng theo mô hình MVC quen thuộc của Spring, mỗi tầng một trách nhiệm:

```
web/          Controller - nhận request, validate, trả envelope. Không chứa nghiệp vụ.
service/      Nghiệp vụ + cache. Chọn nguồn qua ProviderRegistry. NfoService sinh XML.
provider/     Cổng ra ngoài. MovieProvider là interface, mỗi nguồn một cài đặt.
  kkphim/     KKPhimProvider  + model JSON thô của phimapi.com
  nguonc/     NguonCProvider  + model JSON thô của phim.nguonc.com
  tmdb/       TmdbClient      + model JSON thô của api.themoviedb.org
dto/          Schema chuẩn hoá lộ ra REST API (MovieSummary, MovieDetail, ...)
common/       ApiResponse, PageResponse, PageMeta, ApiError
exception/    GlobalExceptionHandler gom mọi lỗi về một định dạng
config/       OpenAPI, cache, RestClient, CORS, converter cho enum
```

Thêm một nguồn phim mới chỉ cần cài đặt `MovieProvider` và thêm một hằng vào
`ProviderType` — controller và service không phải sửa.

### Khác biệt giữa hai nguồn

Hai nguồn không đồng đều, tầng provider chịu trách nhiệm che đi khác biệt đó:

| | KKPhim | NguonC |
|---|---|---|
| `limit` mỗi trang | tuỳ chỉnh, tối đa 64 | cố định 10 (trả về đúng trong `meta.limit`) |
| Lọc thể loại / quốc gia / năm | có | không |
| Thể loại ở mức danh sách | có | không, chỉ có ở chi tiết phim |
| Link phát | embed **và** `.m3u8` | chỉ embed |
| Endpoint liệt kê danh mục | có | không — dùng danh sách chép từ menu của nguồn |
| Nhóm danh sách hỗ trợ | 7 nhóm, không có `dang-chieu` | `phim-bo`, `phim-le`, `tv-shows`, `hoat-hinh`, `dang-chieu` |
| Mã TMDB / IMDb | có sẵn trong mọi phim | không có |

**Slug thể loại và quốc gia của hai nguồn khác nhau**, nên mỗi nguồn trả về danh mục
của riêng nó: "Hài" là `phim-hai` trên NguonC nhưng `hai-huoc` trên KKPhim; NguonC còn có
`gay-can`, `mien-tay`, `quoc-gia-khac` mà KKPhim không có. Dùng nhầm slug sẽ ra 404.

Vài chi tiết đã được xử lý riêng vì nguồn trả về không nhất quán:

- KKPhim trả `status` khi là boolean `true`, khi là chuỗi `"success"` — model nhận cả hai.
- Nguồn dùng `"Đang cập nhật"` làm giá trị rỗng cho đạo diễn/diễn viên; bộ lọc so sánh
  trên slug nên khớp cả bản có dấu lẫn không dấu.
- Ảnh của nhóm endpoint `/v1/api` là đường dẫn tương đối, được ghép với CDN trả kèm response.
- NguonC không có trường thể loại/quốc gia dạng slug, nên slug được sinh từ tên.
- NguonC chỉ công bố 7 endpoint (xem [tài liệu chính thức](https://phim.nguonc.com/api-document))
  và không có endpoint danh mục, nên danh mục được chép sẵn trong `NguonCTaxonomy`.

### Cache

Kết quả gọi nguồn ngoài được cache trong bộ nhớ bằng Caffeine:

| Cache | Thời gian sống | Dung lượng |
|---|---|---|
| `movieLists` | 5 phút | 500 mục |
| `movieDetails` | 30 phút | 1.000 mục |
| `taxonomies` | 12 giờ | 32 mục |

Xem trạng thái tại <http://localhost:8080/actuator/caches>.

---

## Kiến trúc frontend

Giao diện mô phỏng bố cục YouTube để người dùng Việt Nam thấy quen thuộc ngay:

- **Masthead** cố định: nút menu, logo, ô tìm kiếm viền thuốc, nút đổi sáng/tối.
- **Sidebar** 240px, tự thu thành thanh ray 72px trên màn hình hẹp, thành ngăn kéo trên mobile.
- **Dải chip** cuộn ngang ngay dưới masthead để lọc nhanh và đổi nguồn dữ liệu.
- **Lưới thẻ phim**: ảnh ngang 16:9 bo góc, badge số tập ở góc, avatar tròn, tiêu đề hai dòng.
- **Trang xem phim**: trình phát tự dựng bên trái, danh sách tập và phim liên quan bên phải,
  hộp mô tả nền xám, hàng thao tác có nút Lưu / Trailer / Tải NFO.
- **Trang tìm kiếm**: hàng ngang ảnh lớn bên trái, thông tin bên phải.
- **Trang khám phá** (`/kham-pha`): lưới poster dọc 2:3 lấy từ TheMovieDB, kèm điểm số
  và bộ lọc thể loại / năm / điểm tối thiểu / ngôn ngữ gốc.
- **Chi tiết TMDB** (`/kham-pha/[id]`): ảnh nền mờ dần, poster, thông tin đầy đủ,
  dàn diễn viên cuộn ngang và danh sách bản xem được đối chiếu từ hai nguồn.
- **Hồ sơ** (`/ho-so`), **lịch sử tìm kiếm** (`/lich-su-tim-kiem`), **thông báo**
  (`/thong-bao`) và **menu tài khoản** mở từ ô đại diện.

### Trang thông báo

`/thong-bao` đối chiếu ảnh chụp phim trong thư viện với trạng thái hiện tại của nguồn
(qua `GET /api/v1/movies/batch`) để tìm phim đã có tập mới. Chuông trên thanh trên cùng
hiện số thông báo chưa đọc.

Một chi tiết đã phải xử lý: KKPhim báo `modifiedAt` sớm hơn đồng hồ máy vài tiếng, nên
mốc "đã đọc" phải lấy giá trị lớn hơn giữa thời điểm hiện tại và thông báo mới nhất -
nếu không, bấm "đánh dấu đã đọc" sẽ không bao giờ xoá hết.

### Chạy bằng Docker

Hai tầng đều có `Dockerfile` riêng, ghép lại bằng `docker-compose.yml` ở gốc kho.

```bash
cp .env.example .env      # sửa cho hợp máy của bạn
docker compose up -d --build
```

Xong thì mở `http://<địa-chỉ-máy>:3000`.

#### Ba chỗ dễ sai khi chuyển sang Docker

**Cổng 8080 trên homelab đã có ZCloud dùng.** Backend bên trong vẫn nghe 8080 nhưng
được đưa ra ngoài ở **8081**, đổi bằng `BACKEND_PORT`.

**Hai chiều gọi API là hai địa chỉ khác nhau.** Trình duyệt của người xem gọi
`http://<máy>:8081`, còn mã chạy trên server nằm trong mạng riêng của Docker nên gọi
thẳng `http://backend:8080`. Đây không phải chuyện lý thuyết: lần deploy đầu tôi dùng
một địa chỉ cho cả hai, và từ trong container gọi ra địa chỉ LAN của chính máy chủ thì
**treo cho tới khi timeout** — trang tải ra chỉ có phần vỏ, không một thẻ phim nào.

Nên `lib/api.ts` tách làm hai: `NEXT_PUBLIC_API_BASE_URL` cho trình duyệt (bị nhúng
thẳng vào mã lúc build nên phải là `build args`, không đổi được lúc chạy), và
`API_INTERNAL_URL` cho phía server. Riêng đường tải NFO luôn dùng địa chỉ công khai dù
render ở phía nào — đó là liên kết trình duyệt mở, không phải lời gọi từ server.

**CORS phải mở cho địa chỉ mới.** Trước đây danh sách cắm cứng `localhost:3000`; giờ đọc
từ `RAPPHIM_CORS_ORIGINS`, compose truyền vào bằng `PUBLIC_WEB_URL`. Thiếu bước này thì
trang tải được nhưng mọi lời gọi API bị trình duyệt chặn.

Ngoài ra, ZCloud chạy trên **chính máy chủ** chứ không phải trong Docker, nên từ trong
container phải gọi qua `host.docker.internal` (đã khai báo `extra_hosts: host-gateway`
để dùng được trên Linux), không phải `localhost` — trong container `localhost` là chính
container đó.

#### Đã chạy thật trên homelab

Bản đang chạy ở `192.168.100.169`, dựng trên chính máy đó (Ubuntu 24.04, x86_64,
Docker 29.7.2):

| Kiểm | Kết quả |
|---|---|
| Hai container | `rapphim-backend` và `rapphim-web` đều `healthy` |
| Trang chủ | 319KB HTML, **24 thẻ phim**, đủ dải chip nguồn |
| API | `/api/v1/movies/latest` trả phim thật từ KKPhim |
| Trang xem phim | có thẻ `<video>`, nút tập trước/sau, chip `Tập n/x`, bảng Chương |
| CORS | `Access-Control-Allow-Origin: http://192.168.100.169:3000` |
| Đường NFO | trỏ địa chỉ công khai, **không lộ `backend:8080`** ra HTML |
| Nguồn kho riêng | trả rỗng vì chưa cắm khoá — đúng cách xuống thang đã thiết kế |

Các container sẵn có trên máy (`webui-film-*`, `socialdownloader`, `studocu`…) không bị
đụng tới; cổng 3000 và 8081 đều trống trước khi dùng.

### Kho phim riêng trên homelab

Nguồn thứ ba, mã `homelab`, đọc kho phim tự lưu ở `192.168.100.169`. Đây là chỗ duy
nhất có **phụ đề rời** — hai nguồn công cộng đều nướng phụ đề vào hình.

Máy đó chạy **ZCloud** (FastAPI + S3) trên cổng 8080. Hai điểm trong API của nó quyết
định cách làm:

- `GET /v1/download/{key}` nhận header `Range`, và `POST /v1/presign` cấp đường dẫn có
  hạn dùng. Nên **byte video không đi vòng qua Spring**: backend chỉ xin một đường tạm
  rồi đưa cho trình duyệt tải thẳng, vẫn tua được.
- `GET /v1/objects?flat=true` trả cả cây file trong vài lần gọi, nên nguồn này duyệt
  hết kho một lần rồi lọc và phân trang trong bộ nhớ — nhanh và đơn giản hơn hẳn so với
  hỏi kho theo từng truy vấn. Kết quả được đệm 3 phút, chép phim mới vào là chờ một lát
  sẽ thấy.

Phía trình duyệt, thẻ `<track>` lấy phụ đề qua route handler của chính ứng dụng Next
(`/api/subtitle`) chứ không gọi thẳng backend: `<track>` đòi cùng gốc, mà bật
`crossOrigin` trên thẻ `<video>` thì đường phát có hạn của kho cũng bị đòi CORS theo.
Đường đang bật được điều khiển qua `textTracks[i].mode` thay vì thuộc tính `default`
của thẻ — React không đồng bộ lại `default` khi đổi đường.

Phụ đề thì ngược lại, **phải đi qua backend**: thẻ `<track>` của trình duyệt chỉ đọc
WebVTT trong khi phụ đề tự làm gần như luôn là `.srt` hoặc `.ass`, mà trình duyệt cũng
không được giữ khoá của kho. Endpoint `GET /api/v1/homelab/subtitle?key=…` tải file về,
chuyển sang WebVTT rồi trả ra ([`SubtitleService`](backend/src/main/java/com/rapphim/warehouse/service/SubtitleService.java)
xử lý cả SRT lẫn ASS, bỏ thẻ `{\pos(...)}`, và thử lại bằng Windows-1258 khi file
không phải UTF-8 — bảng mã hay gặp ở phụ đề tiếng Việt cũ).

#### Quy ước thư mục

```
<prefix>/Thánh Khư/Thánh Khư - Tập 01.mkv
<prefix>/Thánh Khư/Thánh Khư - Tập 01.vi.srt
```

Thư mục đầu tiên là một bộ phim, mọi file video bên trong là một tập, file phụ đề khớp
theo tên gốc — không khớp được thì lùi về khớp theo số tập (`03.srt` vẫn nhận đúng tập
3). Số tập đọc được từ `Tập 01`, `S01E07`, `E12`, `[05]`, `- 108` và tên trần `03`.

Đây là **phần duy nhất phụ thuộc vào cách đặt tên file**, gói gọn trong
[`MediaLibrary`](backend/src/main/java/com/rapphim/warehouse/provider/homelab/MediaLibrary.java);
kho sắp xếp khác đi thì chỉ phải sửa lớp đó.

#### Cấu hình

Giống khoá TMDB, **không đặt khoá trong mã nguồn**. Đặt biến môi trường trước khi chạy:

| Biến | Ý nghĩa |
|---|---|
| `ZCLOUD_API_KEY` | Khoá gọi thẳng, gửi qua header `x-api-key` (ưu tiên) |
| `ZCLOUD_PASSWORD` | Mật khẩu đăng nhập, dùng khi chưa tạo khoá |
| `ZCLOUD_PREFIX` | Thư mục gốc chứa phim, để rỗng là quét cả kho |

Thiếu cả hai khoá thì nguồn `homelab` trả về rỗng chứ không ném lỗi — phần còn lại của
API vẫn chạy bình thường, đúng cách TMDB đang làm.

### Trình phát

KKPhim trả về link HLS (`.m3u8`) nên trang xem phim dùng trình phát tự dựng bằng
`<video>` + hls.js thay vì nhúng iframe của nguồn:

- Phát được cả **HLS lẫn file rời**: nguồn công cộng trả `.m3u8` nên dùng hls.js, kho
  riêng để nguyên `.mp4`/`.mkv` nên gán thẳng vào thẻ `<video>`. Tầng trên biết mình
  đang cầm gì nên truyền xuống, không đoán theo đuôi file — đường phát của kho là
  đường ký có hạn, đuôi file bị chuỗi tham số che mất.
- **Phụ đề rời**: nút CC trên thanh điều khiển (phím `C`) và mục *Phụ đề* trong cài đặt
  để đổi đường hoặc tắt. Chỉ kho riêng mới có, hai nguồn công cộng nướng phụ đề vào hình.
- **Tăng tiếng và cân bằng tần số** trong mục *Âm thanh* của cài đặt (xem mục dưới).
- **Đang xem tập mấy** hiện ngay trên thanh điều khiển và cạnh tiêu đề (`Tập 5/24`),
  khỏi phải kéo xuống danh sách tập mới biết.
- **Nút tập trước / tập sau** ngay trên thanh điều khiển (phím `P` và `N`). Phim bộ thì
  luôn vẽ cả hai, cái nào không dùng được thì làm mờ chứ không ẩn — ẩn một bên sẽ làm
  cả cụm nút xê dịch mỗi lần đổi tập. Phim lẻ thì giấu hẳn cả hai.
- Thanh tiến độ có phần đã tải sẵn, kéo để tua, **chia thành từng đoạn theo chương**
  kiểu YouTube, và **ảnh xem trước khi rê chuột** (xem mục dưới) kèm vạch vàng đánh
  dấu mốc hết giới thiệu
- Hai nút **tua lùi / tua tới** kèm số giây ngay trong icon; bước tua chọn được
  5 / 10 / 15 / 30 giây trong menu cài đặt và được nhớ lại (`rapphim.seekstep`)
- Âm lượng trượt ra khi rê, nhớ mức đã chọn; tốc độ phát 0.25x–2x
- Chọn chất lượng theo các mức HLS của luồng, mặc định tự động theo băng thông
- Chế độ rạp, toàn màn hình, **ảnh trong ảnh** (phím `I`), và **nút xoay ngang màn
  hình** cho điện thoại. Cả hai nút chỉ hiện sau khi hydrate: `pictureInPictureEnabled`
  và `screen.orientation` không tồn tại phía server, đọc sớm sẽ làm HTML hai bên lệch
  nhau. Nút xoay còn đòi con trỏ thô (`pointer: coarse`) nên máy bàn không thấy —
  khoá hướng màn hình ở đó vừa không được phép vừa vô nghĩa.
- **Hết tập thì đếm ngược 5 giây rồi sang tập kế**, có nút *Huỷ* và vòng đếm bấm được
  để đi ngay. Trước đây hết tập là nhảy luôn — đang xem đoạn kết mà bị cướp mất màn
  hình thì khó chịu. Tập cuối thì không đếm, vì không còn tập nào để sang.
- Nhớ vị trí đang xem của từng tập, mở lại là phát tiếp đúng chỗ
- Trong lúc chờ luồng về: hiện ảnh phim làm nền kèm dòng *"Đang tải từ nguồn…"*
  thay vì khung đen, để biết là đang tải chứ không phải bấm hụt
- Phím tắt: `Space`/`K` phát-dừng, `J`/`L` tua theo bước đã chọn, `←`/`→` ±5 giây,
  `↑`/`↓` âm lượng, `M` tắt tiếng, `C` phụ đề, `F` toàn màn hình, `T` chế độ rạp,
  `I` ảnh trong ảnh, `P`/`N` tập trước / tập kế, `0`–`9` nhảy theo phần trăm

##### Vài chỗ trong cách dựng

Khoá hướng màn hình chỉ được phép khi đang toàn màn hình, nên một nút làm cả hai việc:
vào toàn màn hình rồi mới khoá ngang. Thoát toàn màn hình bằng đường nào khác thì trình
duyệt tự bỏ khoá, nên nhãn nút bám theo sự kiện `fullscreenchange` chứ không tự ghi nhớ.

Bộ đếm ngược nằm trong một component riêng để giá trị đầu đặt được ngay trong
`useState`; đếm ngay trong trình phát thì phải đặt lại bộ đếm từ trong effect. Và việc
sang tập được gọi từ một effect khi bộ đếm về 0, **không gọi trong hàm cập nhật state** —
React có thể gọi hàm cập nhật hai lần, sang tập hai lần là nhảy mất một tập.

`ScreenOrientation.lock` chưa có trong lib DOM của TypeScript bản này nên được khai báo
lại đúng phần cần dùng, thay vì hạ mức kiểm tra kiểu của cả tệp.

#### Tăng tiếng và cân bằng tần số

Thanh âm lượng sẵn của thẻ `<video>` chặn trên ở 100%. Nhiều bản phim — nhất là bản
thuyết minh tự làm — thu nhỏ hơn hẳn, vặn hết cỡ vẫn không nghe rõ. Đường duy nhất vượt
qua mức đó là Web Audio: đưa tiếng qua một chuỗi xử lý rồi mới ra loa
([`useAudioChain.ts`](frontend/src/components/watch/useAudioChain.ts)).

```
<video> ─▶ 6 bộ lọc peaking ─▶ khuếch đại (1–3×) ─▶ chặn đỉnh 0 dB ─▶ loa
```

- **Tăng tiếng** tới 300%, có bộ chặn đỉnh (`DynamicsCompressor` ngưỡng 0 dB, tỉ số 20)
  đứng sau để không vỡ tiếng ở các đoạn ồn.
- **Cân bằng tần số** 6 dải (60 / 230 / 910 Hz, 3 / 6 / 14 kHz), mỗi dải ±12 dB, kèm bốn
  mức đặt sẵn: *Chuẩn*, *Rõ lời thoại*, *Bass mạnh*, *Đêm khuya*.
- Mức đã chỉnh được nhớ lại (`rapphim.boost`, `rapphim.eq`).

##### Cái bẫy phải biết

`createMediaElementSource` làm tiếng của thẻ video **chỉ còn đi qua chuỗi xử lý**, không
ra thẳng loa nữa. Nếu nguồn tiếng khác gốc với trang và không khai báo CORS thì trình
duyệt coi là dữ liệu cấm, và kết quả là **im hoàn toàn — hỏng mà không báo lỗi gì**. Trớ
trêu hơn nữa, gọi hàm đó một lần là không gỡ lại được.

Nên tính năng này chỉ bật khi chắc chắn an toàn: luồng HLS chạy qua hls.js cho ra địa chỉ
`blob:` cùng gốc với trang, còn file rời của kho riêng thì khác gốc — nguồn nào không
chắc thì bảng *Âm thanh* nói thẳng là không dùng được, chứ không đánh cược bằng tiếng của
người xem.

Chuỗi xử lý được giữ trong một `WeakMap` gắn theo **thẻ video** chứ không theo component,
vì `createMediaElementSource` chỉ được gọi một lần cho mỗi thẻ — gọi lần hai là ném lỗi.

##### Đo được gì

| Kiểm | Kết quả |
|---|---|
| Tiếng có ra không (RMS ở mức 1×) | 0.173 — có, không bị câm |
| Khuếch đại 2× | RMS 0.346, đúng **2.00 lần** |
| Dải 230 Hz: 0 dB → +12 dB → −12 dB | 0.173 → 0.284 → 0.105 |
| Chặn đỉnh: nguồn to, đẩy 3× | lẽ ra 1.863 (vỡ tiếng), đo được **0.758** |

#### Ảnh xem trước trên thanh tiến độ

KKPhim không kèm sprite hay WebVTT thumbnail nên ảnh xem trước phải tự dựng
([`usePreview.ts`](frontend/src/components/watch/usePreview.ts)): một thẻ `<video>` ẩn
dùng chung link HLS, tua tới giây đang rê rồi vẽ khung hình đó lên `<canvas>` 160×90.

Vài điểm đáng lưu ý trong cách làm:

- **Instance hls.js riêng**, không dùng lại của trình phát chính — tua qua tua lại
  trên luồng đang chiếu sẽ làm người xem giật hình.
- **Chỉ dựng khi cần**: đường ống chỉ bật ở lần con trỏ chạm vào thanh tiến độ đầu
  tiên, ai xem một mạch thì không tốn thêm kết nối nào.
- **Luôn ở mức chất lượng thấp nhất** (`startLevel: 0`) với bộ đệm ngắn, để nhường
  băng thông cho luồng đang chiếu.
- Rê chuột sinh hàng trăm sự kiện mỗi giây nên các yêu cầu được **gom lại 80ms** một
  lần, và bỏ qua nếu lệch dưới 0.4 giây.
- Thẻ ảnh được **kê lại trong hai mép** thanh tiến độ để ở đầu và cuối tập nó không
  thò ra ngoài khung phát.

Vì vẽ từ MediaSource cùng nguồn gốc nên canvas không bị "tainted" — đây cũng là cách
kiểm chứng: đọc thẳng pixel bằng `getImageData` để chắc chắn khung hình thật sự được vẽ
chứ không phải ô đen.

#### Chương

Cả KKPhim lẫn NguonC đều không trả về mốc chương, và không có cách nào đoán đúng từ
luồng video, nên đây là dữ liệu người xem tự đánh dấu — cùng hướng với mốc giới thiệu.

- Bảng **Chương** ngay dưới khung phát: dừng ở đoạn muốn đánh dấu, bấm *Thêm tại vị
  trí đang xem*, gõ tên rồi Lưu. Xoá và bấm để nhảy tới đều ở đó.
- Mỗi dòng hiện **ảnh khung hình ngay tại giây đó**, và ô tên **gõ được tại chỗ** -
  nhìn ảnh là biết đoạn ấy diễn gì để đặt tên (xem mục dưới).
- Thanh tiến độ **cắt thành từng đoạn** theo các mốc, mỗi đoạn có phần đã xem và phần
  đã tải riêng.
- **Rê chuột tới đâu thì đoạn chương ở đó nổi cao hẳn lên** và các khe giữa các đoạn
  giãn ra, nhìn một cái là thấy ranh giới chương nằm ở đâu - giống thanh tiến độ của
  YouTube. Rời chuột thì mọi đoạn phẳng lại như cũ.
- Kèm theo đó, **tên chương hiện ngay trên ảnh xem trước**.
- Khác mốc giới thiệu (đặt cho cả bộ vì tập nào cũng chung một đoạn đầu), chương gắn
  với nội dung từng tập nên lưu theo khoá `provider:slug:server:tập` (`rapphim.chapters`).

Giây được chốt ngay lúc bấm *Thêm* chứ không phải lúc bấm *Lưu*: phim vẫn chạy trong
lúc gõ tên, không chốt trước thì chương sẽ rơi vào chỗ khác hẳn.

##### Vì sao không tự đặt tên chương theo nội dung

Đặt tên tự động thì phải đọc được nội dung, mà nguồn không cho chỗ nào để đọc:

- API của KKPhim không có trường phụ đề nào (`sub`, `vtt`, `srt`, `caption`) - chỉ có
  `linkM3u8`, `linkEmbed`, `content`…
- Master playlist HLS không có `#EXT-X-MEDIA`, tức là không có track phụ đề.
- Phụ đề của nguồn **cháy thẳng vào hình**, muốn đọc phải OCR từng khung.

Không còn chữ để đọc thì chỉ còn cách nhìn ảnh, tức là phải gọi một model vision -
thêm khoá API, thêm tiền, thêm một phụ thuộc mạng cho một việc mỗi tập làm một lần.
Nên chỗ này chọn hướng ngược lại: **đưa ảnh đến tận mắt người dùng**. Mỗi dòng chương
hiện ảnh khung hình tại đúng giây đó và ô tên gõ được tại chỗ, đặt tên cả tập mất
chừng một phút mà không tốn gì.

Ảnh được dựng lại bằng đúng cách của ảnh xem trước (một thẻ `<video>` ẩn, tua tới rồi
vẽ lên `<canvas>`), mỗi ảnh khoảng 3-6KB. Ảnh **chỉ sống trong phiên đang mở**, không
ghi vào `localStorage`: vài KB mỗi ảnh nhân với nhiều tập sẽ làm đầy chỗ lưu trữ của
cả ứng dụng.

Tên chỉ được ghi xuống khi rời ô hoặc bấm Enter (bấm Esc để bỏ) - ghi theo từng phím
sẽ viết lại cả cụm chương sau mỗi ký tự.

##### Tự chia theo cảnh

Nút *Tự chia theo cảnh* đặt sẵn khoảng chục mốc chỉ trong chưa tới một giây, và không
tải một khung hình nào về.

Mẹo nằm ở chính danh sách phát HLS. Bộ mã hoá của nguồn đặt khung hình khoá ở đúng chỗ
chuyển cảnh, mà mỗi đoạn `.ts` luôn bắt đầu bằng một khung khoá — nên **ranh giới các
đoạn chính là các cú cắt cảnh thật**. Tập 43 phút của *Đối Chứng* có 656 đoạn dài từ
0.16 đến 7.64 giây, tổng đúng 2609 giây khớp thời lượng video, và cả danh sách chỉ
nặng khoảng 30KB. Từ đó chọn ra các mốc nằm ở chỗ "lặng" nhất (đoạn trước và sau cú
cắt đều dài) và cách nhau đủ xa để trải đều cả tập.

Hướng làm quen thuộc hơn — cho một thẻ `<video>` ẩn chạy 16x rồi so từng khung hình
kiểu PySceneDetect — đã thử và **đo ra là không dùng được** với nguồn này:

| Đo được | Kết quả |
|---|---|
| Số mức chất lượng của luồng | 1 (1080p, 3.5 Mbps) — không có bản nhẹ để quét |
| Dung lượng phải tải cho một tập | ~1.1 GB |
| Tốc độ giải mã thực tế | 0.19x, dù đã đặt `playbackRate = 16` |

Hai giới hạn cần biết:

- Cách này **biết chỗ cắt chứ không hiểu nội dung**, nên tên chương chỉ là *Cảnh 1*,
  *Cảnh 2*… — nên đổi lại cho đúng.
- Nguồn nào cắt đoạn đều tăm tắp (độ lệch chuẩn dưới 0.15 giây) thì không còn tín hiệu
  gì; lúc đó ứng dụng vẫn đặt mốc nhưng **nói thẳng là chỉ chia đều** chứ không nhận
  vơ là đã dò được cảnh.

NguonC chỉ có link nhúng nên vẫn dùng iframe của nguồn. Trang cũng có nút chuyển
sang trình phát của nguồn khi một tập nào đó không phát được, và tự chuyển nếu
sau vài giây vẫn chưa đọc được thời lượng.

### Tự động bỏ qua giới thiệu

Không có sẵn danh sách mốc giới thiệu cho từng phim, nên ứng dụng học từ chính thao
tác của người dùng — nhưng không bao giờ đoán bừa:

- **Chưa có mốc thì không có nút.** Không dùng một con số mặc định: đoán sai thì
  người xem mất luôn đoạn đầu tập.
- **Học từ một cú tua thật.** Tua tới ở phần đầu tập (nhảy từ 20 giây trở lên, cả
  điểm đi lẫn điểm đến còn trong 5 phút đầu) thì mốc đó được ghi cho cả bộ phim
  (`rapphim.intro`), kèm thông báo **"Đã ghi nhớ hết giới thiệu ở m:ss"** và nút
  *Hoàn tác*.
- **Các tập sau tự nhảy qua**, cũng kèm nút *Hoàn tác*. Việc tự nhảy gắn vào sự kiện
  `playing` của thẻ `<video>` chứ không gắn vào nút phát: đổi tập giữa chừng thì
  trình duyệt phát tiếp tập mới mà không đi qua nút nào cả — đúng trường hợp chính
  của phim bộ.
- **Sửa tay được.** Menu cài đặt có mục *Mốc hết giới thiệu* để đặt tại vị trí đang
  xem hoặc xoá hẳn. Rê chuột trên thanh tiến độ để xem trước từng khung hình là cách
  nhanh nhất để dò đúng giây hết giới thiệu; mốc đang có hiện thành vạch vàng ngay
  trên thanh.
- Vị trí xem dở vẫn được ưu tiên: đang xem giữa tập rồi thì mở lại sẽ tiếp tục chỗ cũ.

Thông báo trong trình phát trượt lên khi hiện, có vạch đếm ngược cho biết còn bao lâu,
và **dừng đếm khi rê chuột lên** để kịp bấm *Hoàn tác*; bấm xong thì đổi ngay thành
*"Đã hoàn tác"* rồi tự mờ đi.

### Thư viện cá nhân

Không có đăng nhập nên toàn bộ thư viện nằm trong `localStorage` của trình duyệt:
riêng tư, không cần server, nhưng chỉ tồn tại trên đúng máy đó. Muốn đồng bộ nhiều
máy thì phải thêm đăng nhập và một nơi lưu trữ phía backend.

| Tính năng | Cách dùng | Khoá lưu |
|---|---|---|
| **Phim đã lưu** | Bấm dấu trang ở góc ảnh phim, hoặc nút *Lưu* ở trang xem phim | `rapphim.favorites` |
| **Đang xem** | Tự ghi khi mở phim và mỗi lần đổi tập; mở lại là phát tiếp đúng tập | `rapphim.history` |
| **Lịch sử tìm kiếm** | Gợi ý dưới ô tìm kiếm, xem đầy đủ ở `/lich-su-tim-kiem` | `rapphim.searches` |
| **Giao diện sáng/tối** | Nút mặt trời / mặt trăng ở thanh trên | `rapphim.theme` |

| **Hồ sơ** | Tên hiển thị và màu đại diện, đặt ở `/ho-so` | `rapphim.profile` |
| **Thông báo** | Tập mới của phim đang theo dõi, xem ở `/thong-bao` | `rapphim.notifications` |
| **Vị trí xem** | Giây đang xem của từng tập | `rapphim.positions` |
| **Mốc giới thiệu** | Giây kết thúc phần giới thiệu của từng bộ | `rapphim.intro` |
| **Âm lượng** | Mức âm lượng của trình phát | `rapphim.volume` |
| **Bước tua** | Số giây của hai nút tua và phím `J`/`L` | `rapphim.seekstep` |
| **Chương** | Các mốc chương do người xem đặt cho từng tập | `rapphim.chapters` |
| **Tăng tiếng** | Hệ số khuếch đại âm thanh, 1–3 | `rapphim.boost` |
| **Cân bằng tần số** | Mức chỉnh của 6 dải, tính bằng dB | `rapphim.eq` |

Ngoài ra: dải **"Tiếp tục xem"** ở đầu trang chủ (tự ẩn khi chưa xem gì),
hai trang `/da-luu` và `/dang-xem` có nút xoá từng phim và xoá tất cả,
số đếm hiện ngay trên sidebar, và phím tắt `/` hoặc `Ctrl+K` để nhảy vào ô tìm kiếm.

### Trang lịch sử tìm kiếm

`/lich-su-tim-kiem` liệt kê toàn bộ từ khoá đã tìm kèm mốc thời gian, có ô lọc ngay
trong lịch sử, xoá từng mục hoặc xoá tất cả. Ô gợi ý dưới thanh tìm kiếm chỉ hiện
8 mục gần nhất, còn lịch sử giữ tới 30 mục.

Mỗi từ khoá được lưu kèm mốc thời gian. Bản trước chỉ lưu mảng chuỗi, nên hàm đọc
nhận cả hai dạng và tự quy về dạng mới — người dùng không mất lịch sử đã có.

### Trang hồ sơ và menu tài khoản

`/ho-so` gom mọi thứ thuộc về người dùng: tên hiển thị đổi được, sáu màu đại diện,
số liệu thư viện, hai hàng tóm tắt "Tiếp tục xem" / "Phim đã lưu", và mục
**Quản lý dữ liệu** cho phép xuất ra file JSON, nhập lại từ file, hoặc xoá sạch.
Xuất / nhập chính là cách mang thư viện sang máy khác khi chưa có đăng nhập.

Ô đại diện trên thanh trên cùng mở **menu tài khoản** theo đúng bố cục của YouTube:
khối thông tin ở đầu, các mục điều hướng, rồi hai mục cài đặt mở ra bảng phụ ngay
trong menu (*Giao diện* chọn tối/sáng, *Phím tắt* liệt kê tổ hợp phím). Menu đóng khi
bấm ra ngoài hoặc bấm `Esc`, và trả con trỏ về nút mở. Vì toàn bộ nội dung chỉ render
sau khi người dùng bấm, phần phụ thuộc `localStorage` trong đó không gây lệch hydrate.

Cấu trúc thư mục:

```
src/app/          Route: /, /danh-sach/[type], /the-loai/[slug], /quoc-gia/[slug],
                  /nam/[year], /tim-kiem, /phim/[slug], /kham-pha, /kham-pha/[id],
                  /da-luu, /dang-xem, /ho-so, /lich-su-tim-kiem
src/components/   layout/ (shell, masthead, sidebar, ô tìm kiếm, menu tài khoản)
                  movie/ (card, grid, row, chip, phân trang) - watch/ (player, mô tả)
                  tmdb/ (thẻ và bộ lọc khám phá)
                  library/ (lưu phim, đang xem, lịch sử tìm kiếm)
                  profile/ (hồ sơ) - ui/ (icon, trạng thái)
src/lib/          api.ts (client gọi backend), types.ts (khớp schema Swagger),
                  format.ts, nav.ts, browser-store.ts, library.ts, profile.ts
```

Ghi chú kỹ thuật:

- Toàn bộ trang là Server Component, gọi backend ngay trên server rồi mới trả HTML,
  nên không lộ backend ra trình duyệt và không cần CORS cho luồng chính.
- Chỉ 4 component là client: shell, masthead, thẻ ảnh (xử lý ảnh hỏng), và màn xem phim.
- Chủ đề sáng/tối lưu ở `localStorage`, được áp bằng script nhỏ trong `<head>` nên
  không nháy màu khi tải lại. Icon đổi bằng CSS chứ không theo state để tránh lệch hydrate.
- Tập đang xem dở được nhớ theo từng phim, mở lại là phát tiếp đúng tập đó.
- Trạng thái trình duyệt đọc qua `useSyncExternalStore` để mọi component cùng cập nhật
  tức thì (lưu một phim thì số đếm trên sidebar đổi ngay).
- `useHydrated` bắt buộc phải có: lúc hydrate React *render* bằng `getServerSnapshot`
  nhưng lại *ghi nhớ* kết quả của `getSnapshot`, nên nó không phát hiện khác biệt và
  không bao giờ render lại. Thiếu nó thì mở thẳng `/da-luu` bằng F5 sẽ ra danh sách rỗng.
- `loading.tsx` chỉ đặt ở các route thực sự gọi mạng, **không** đặt ở gốc `app/`.
  Đặt ở gốc thì nó bọc cả hai trang thư viện (render đồng bộ, chỉ đọc localStorage) và
  fallback ở đó không bao giờ được thay thế — màn hình kẹt ở khung xương.

---

## Kiểm thử

```bash
cd backend && ./mvnw test          # 24 test: provider, sinh NFO, tham số discover, MockMvc
cd frontend && npm run build       # kiểm tra type và build production
cd frontend && npx eslint .        # lint
```

Phần gọi TMDB được kiểm chứng bằng cách trỏ backend vào một mock server cục bộ,
không cần khoá thật cũng không cần mạng:

```bash
python backend/tmdb_mock.py &              # phục vụ /3/discover/movie, /3/genre/*/list, /3/movie/{id}
TMDB_API_KEY=mock-key ./mvnw spring-boot:run   -Dspring-boot.run.arguments=--rapphim.tmdb.base-url=http://127.0.0.1:8099/3
```

Cách này đã bắt được một lỗi thật: `image.tmdb.org` chưa nằm trong `remotePatterns`
của `next.config.ts`, đủ để làm vỡ trang khám phá ngay khi TMDB hoạt động.

---

## Giới hạn đã biết

- Dữ liệu phụ thuộc hoàn toàn vào hai nguồn công khai; nguồn đổi cấu trúc thì tầng
  `provider` phải cập nhật theo.
- Cache nằm trong bộ nhớ tiến trình, chạy nhiều instance sẽ không dùng chung cache.
  Muốn dùng chung thì thay `CacheConfig` bằng Redis.
- Video phát qua iframe của nguồn nên chất lượng và quảng cáo do nguồn quyết định.
- Thư viện cá nhân (phim đã lưu, đang xem, tìm kiếm gần đây) chỉ nằm trong trình duyệt.
  Xoá dữ liệu duyệt web hoặc đổi máy là mất; muốn đồng bộ phải thêm đăng nhập + database.
- Phần enrich TMDB và trang `/kham-pha` cần khoá API và cần gọi được `api.themoviedb.org`.
  File NFO không phụ thuộc vào cả hai điều kiện đó.
- Phim trên trang khám phá không chắc có trên hai nguồn; bấm vào là tìm theo tên gốc
  chứ không đảm bảo tìm ra bản xem được.
- NguonC không trả mã TMDB/IMDb nên file NFO xuất từ nguồn này sẽ thiếu `uniqueid` —
  dùng nguồn `kkphim` nếu cần nạp vào Kodi / Jellyfin.
