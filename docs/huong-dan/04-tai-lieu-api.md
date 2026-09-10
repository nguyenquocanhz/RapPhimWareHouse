# Tài liệu API

> **Tài liệu**: Tài liệu API
> **Phiên bản**: 1.0
> **Cập nhật**: 2026-09-11
> **Đối tượng đọc**: Người tích hợp API, lập trình viên frontend
> **Trạng thái**: Chính thức
> **Tag**: api, rest, openapi, swagger, backend, spring-boot

## Giới thiệu

RapPhim WareHouse phơi ra một REST API đóng vai trò lớp trung gian: backend Spring Boot gọi
nhiều nguồn phim khác nhau (KKPhim, NguonC, VSMOV, kho riêng trên homelab), bổ sung metadata từ
TheMovieDB và AniList/Jikan, rồi **chuẩn hoá tất cả về một schema DTO duy nhất** trước khi trả cho
frontend. Nhờ vậy phía giao diện chỉ phải làm việc với một định dạng nhất quán, không cần biết mỗi
nguồn trả JSON ra sao.

Tài liệu này mô tả bề mặt API mà chúng ta cần khi tích hợp: quy ước chung, vỏ bọc phản hồi, danh
sách endpoint theo từng nhóm, bảng mã lỗi và các ví dụ gọi thật. Toàn bộ nội dung được kiểm chứng
trực tiếp từ mã nguồn trong `backend/src/main/java/com/rapphim/warehouse/`, nên khớp với hiện thực.

Tài liệu API còn được **sinh tự động** bằng springdoc-openapi từ chính annotation trong code. Bản
sinh động luôn có sẵn ở Swagger UI, còn tài liệu này giải thích thêm bối cảnh và cách dùng.

## Các thành phần chính

| Thành phần | Vai trò |
|---|---|
| `ApiResponse<T>` | Vỏ bọc chuẩn cho **mọi** phản hồi thành công (`success`, `message`, `data`, `timestamp`). |
| `ApiError` | Vỏ bọc chuẩn cho **mọi** phản hồi lỗi (4xx/5xx), có trường `code` để client rẽ nhánh xử lý. |
| `PageResponse<T>` | Kết quả dạng danh sách, gồm `items`, `meta`, `provider`. |
| `PageMeta` | Thông tin phân trang: `page`, `limit`, `totalItems`, `totalPages`. |
| `GlobalExceptionHandler` | Gom mọi ngoại lệ của tầng web về một định dạng `ApiError` duy nhất. |
| Tham số `provider` | Chọn nguồn dữ liệu cho mỗi lời gọi (mặc định `kkphim`). |

Các nhóm endpoint (theo controller) gồm: **Movies**, **Anime**, **Homelab**, **Taxonomies**,
**TMDB & NFO**, **Quản trị** và **System**.

## Địa chỉ gốc và quy ước chung

Mọi endpoint đều nằm dưới base path `/api/v1`.

| Môi trường | Địa chỉ gốc |
|---|---|
| Backend local (nội bộ) | `http://localhost:8080/api/v1` |
| Homelab (cổng công bố) | `http://<homelab>:7101/api/v1` |

Các quy ước áp dụng cho toàn bộ API:

- **Định dạng**: request và response đều dùng JSON (`Content-Type: application/json`). Riêng hai
  endpoint xuất file trả về kiểu khác: NFO trả `application/xml`, phụ đề trả `text/vtt`.
- **Chọn nguồn**: hầu hết endpoint đọc nhận query param `provider`. Mặc định là `kkphim`; các mã
  hợp lệ dựng sẵn là `kkphim`, `nguonc`, `vsmov`, `homelab`. Danh sách nguồn đang bật thật sự lấy
  qua `GET /api/v1/providers`.
- **Phân trang**: `page` bắt đầu từ `1`. Với endpoint phim, `limit` mặc định `24` và tối đa `64`;
  với endpoint anime và TMDB, cỡ trang là `perPage` (tối đa `50`) hoặc cố định `20` (TMDB discover).
- **CORS**: chỉ các origin trong `rapphim.cors.allowed-origins` mới gọi được từ trình duyệt; các
  method cho phép là `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
- **User-Agent (chiều ra ngoài)**: khi backend gọi các nguồn bên ngoài, nó tự gắn header
  `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) RapPhimWareHouse/1.0`. Client gọi vào
  backend không cần header đặc biệt nào cho các endpoint đọc; riêng nhóm quản trị cần header
  `X-Admin-Token`.

## Vỏ bọc phản hồi

### ApiResponse — phản hồi thành công

Mọi phản hồi thành công đều được bọc trong `ApiResponse`. Trường `data` chứa dữ liệu nghiệp vụ
thật sự (một object, một danh sách, hoặc một `PageResponse`).

```json
{
  "success": true,
  "message": "OK",
  "data": { },
  "timestamp": "2026-09-08T16:20:00Z"
}
```

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `success` | boolean | Luôn `true` với phản hồi thành công. |
| `message` | string | Thông điệp mô tả, thường là `"OK"`. |
| `data` | T | Dữ liệu nghiệp vụ trả về. |
| `timestamp` | string (Instant, UTC) | Thời điểm server tạo phản hồi. |

### PageResponse và PageMeta — kết quả có phân trang

Các endpoint danh sách gói dữ liệu vào `PageResponse` rồi mới đặt vào `data` của `ApiResponse`.

```json
{
  "items": [ ],
  "meta": { "page": 1, "limit": 24, "totalItems": 8993, "totalPages": 375 },
  "provider": "kkphim"
}
```

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `items` | mảng T | Danh sách phần tử của trang hiện tại. |
| `meta.page` | int | Trang hiện tại, bắt đầu từ `1`. |
| `meta.limit` | int | Số phần tử tối đa trên một trang. |
| `meta.totalItems` | long | Tổng số phần tử tìm được. |
| `meta.totalPages` | int | Tổng số trang. |
| `provider` | string | Nguồn dữ liệu đã phục vụ request này. |

### ApiError — phản hồi lỗi

Khi thất bại, API trả về `ApiError` với `success = false` và trường `code` để client xử lý theo
từng trường hợp thay vì đọc chuỗi `message`.

```json
{
  "success": false,
  "status": 404,
  "code": "MOVIE_NOT_FOUND",
  "message": "Khong tim thay phim voi slug 'abc'",
  "path": "/api/v1/movies/abc",
  "details": [],
  "timestamp": "2026-09-08T16:20:00Z"
}
```

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `success` | boolean | Luôn `false`. |
| `status` | int | Mã HTTP status. |
| `code` | string | Mã lỗi nội bộ, dùng để client rẽ nhánh. |
| `message` | string | Mô tả lỗi cho người dùng. |
| `path` | string | Đường dẫn đã gọi. |
| `details` | mảng string | Chi tiết lỗi (ví dụ lỗi validate từng field), rỗng nếu không có. |
| `timestamp` | string (Instant, UTC) | Thời điểm xảy ra lỗi. |

## Endpoint nhóm Movies

Base: `/api/v1/movies`. Trừ khi ghi rõ, tham số chung là `page` (mặc định `1`, tối thiểu `1`),
`limit` (mặc định `24`, tối đa `64`) và `provider` (mặc định `kkphim`).

| Method | Đường dẫn | Mô tả | Tham số chính |
|---|---|---|---|
| GET | `/latest` | Phim mới cập nhật, dùng cho trang chủ. | `page`, `limit`, `provider` |
| GET | `/` | Danh sách theo nhóm, kèm bộ lọc và sắp xếp. | `type`, `category`, `country`, `year`, `sortField`, `sortType`, `page`, `limit`, `provider` |
| GET | `/search` | Tìm theo tên tiếng Việt hoặc tên gốc. | `keyword` (bắt buộc), `page`, `limit`, `provider` |
| GET | `/category/{slug}` | Phim theo thể loại. | `slug` (path), `country`, `year`, `page`, `limit`, `provider` |
| GET | `/country/{slug}` | Phim theo quốc gia. | `slug` (path), `category`, `year`, `page`, `limit`, `provider` |
| GET | `/year/{year}` | Phim theo năm phát hành. | `year` (path), `category`, `country`, `page`, `limit`, `provider` |
| GET | `/batch` | Trạng thái hiện tại của nhiều phim để dò tập mới. | `slugs` (bắt buộc, tối đa 30), `provider` |
| GET | `/{slug}` | Chi tiết phim kèm danh sách server và tập. | `slug` (path), `provider` |

Giá trị hợp lệ của `type` (enum `ListType`): `phim-bo`, `phim-le`, `tv-shows`, `hoat-hinh`,
`phim-vietsub`, `phim-thuyet-minh`, `phim-long-tieng`, `dang-chieu`. Với endpoint `/`, tham số
`sortField` nhận `modified.time` | `_id` | `year`, còn `sortType` nhận `asc` | `desc`.

> Lưu ý: nguồn `nguonc` chỉ hỗ trợ `phim-bo`, `phim-le`, `tv-shows`, `hoat-hinh` và bỏ qua các bộ
> lọc. Endpoint `/batch` bỏ qua các phim không còn tồn tại thay vì làm hỏng cả danh sách; client
> giữ bản chụp cũ rồi so `episodeCurrent` và `modifiedAt` để biết có tập mới.

## Endpoint nhóm Anime

Base: `/api/v1`. Metadata anime lấy từ AniList (chính) và Jikan/MyAnimeList (dự phòng);
danh sách và tìm kiếm tự động chuyển nguồn khi AniList lỗi — kiểm tra trường `source` để biết id
thuộc nguồn nào.

| Method | Đường dẫn | Mô tả | Tham số chính |
|---|---|---|---|
| GET | `/anime/trending` | Anime đang được quan tâm nhất. | `page` (1–500), `perPage` (1–50) |
| GET | `/anime/search` | Tìm anime theo từ khoá. | `keyword` (bắt buộc), `page` (1–500), `perPage` (1–50) |
| GET | `/anime/{id}` | Chi tiết một anime theo mã. | `id` (path, int), `source` (`anilist` \| `jikan`) |
| GET | `/anime/genres` | Danh mục thể loại anime để điền bộ lọc. | — |

> Quan trọng: khi gọi chi tiết `/anime/{id}` phải kèm đúng `source` của mã đó (lấy từ trường
> `source` trong kết quả danh sách), vì AniList và MyAnimeList có không gian mã khác nhau. Chi tiết
> **không** dự phòng sang nguồn khác.

## Endpoint nhóm Homelab

Base: `/api/v1/homelab`. Nhóm này phục vụ kho phim riêng chạy trên homelab (đọc qua ZCloud).

| Method | Đường dẫn | Mô tả | Tham số chính |
|---|---|---|---|
| GET | `/subtitle` | Tải phụ đề của kho riêng, đã chuyển sang WebVTT. | `key` (bắt buộc) |

Endpoint trả `Content-Type: text/vtt;charset=UTF-8` (không bọc trong `ApiResponse`) và đặt
`Cache-Control` giữ lại 6 giờ. Lý do phải đi qua backend: thẻ `<track>` của trình duyệt chỉ đọc
WebVTT trong khi phụ đề gốc thường là `.srt`/`.ass`, và kho đòi xác thực mà trình duyệt không được
giữ khoá.

## Endpoint nhóm Taxonomies

Base: `/api/v1`. Các danh mục dùng để dựng thanh lọc của giao diện.

| Method | Đường dẫn | Mô tả | Tham số chính |
|---|---|---|---|
| GET | `/categories` | Toàn bộ thể loại. | `provider` |
| GET | `/countries` | Toàn bộ quốc gia. | `provider` |

`slug` trả về ở đây dùng làm tham số cho `/movies/category/{slug}`, `/movies/country/{slug}` hoặc
các bộ lọc `category` / `country`.

## Endpoint nhóm TMDB & NFO

Base: `/api/v1`. Nhóm này bổ sung metadata từ TheMovieDB và xuất file NFO cho trình quản lý thư
viện phim.

| Method | Đường dẫn | Mô tả | Tham số chính |
|---|---|---|---|
| GET | `/movies/{slug}/tmdb` | Metadata TMDB của một phim (đối chiếu theo mã TMDB nguồn trả kèm). | `slug` (path), `provider` |
| GET | `/movies/{slug}/nfo` | Xuất file NFO (XML) cho Kodi / Jellyfin / Emby. | `slug` (path), `provider`, `enrich` (mặc định `true`) |
| GET | `/tmdb/discover` | Proxy của `discover/movie`, gợi ý phim theo điểm/thể loại/ngôn ngữ. | `page` (1–500), `sortBy`, `withGenres`, `withOriginalLanguage`, `year`, `voteAverageGte`, `voteCountGte`, `region`, `includeAdult` |
| GET | `/tmdb/movies/{id}` | Chi tiết một phim trên TMDB theo mã TMDB. | `id` (path), `type` (`movie` \| `tv`) |
| GET | `/tmdb/person/{id}` | Diễn viên kèm các phim từng đóng. | `id` (path) |
| GET | `/tmdb/genres` | Danh mục thể loại của TMDB. | `type` (`movie` \| `tv`) |
| GET | `/tmdb/status` | Backend đã cấu hình khoá TMDB hay chưa. | — |

> Các endpoint `/tmdb/*` cần khoá TMDB. Khi chưa cấu hình, chúng trả `503 TMDB_NOT_CONFIGURED`,
> phần còn lại của API không bị ảnh hưởng. Riêng `/movies/{slug}/nfo` **chạy được ngay không cần
> khoá** vì KKPhim đã trả sẵn mã TMDB/IMDb; tham số `enrich=false` sẽ bỏ qua bước bổ sung TMDB.
> Với `/tmdb/discover`, TMDB cố định 20 kết quả mỗi trang.

## Endpoint nhóm Quản trị

Base: `/api/v1/admin`. Cho phép thêm và sửa nguồn phim lúc đang chạy mà không phải sửa mã nguồn.
Các endpoint **đọc** thì ai cũng gọi được; các endpoint **sửa đổi** đòi khoá gửi qua header
`X-Admin-Token`.

| Method | Đường dẫn | Mô tả | Tham số chính |
|---|---|---|---|
| GET | `/audit` | Nhật ký các thay đổi gần đây (50 mục). | Header `X-Admin-Token` |
| GET | `/settings` | Tình trạng các khoá (không kèm giá trị). | — |
| POST | `/settings` | Đặt hoặc xoá một khoá. | Header `X-Admin-Token`, body `{ "name", "value" }` |
| GET | `/sources` | Danh sách nguồn tự thêm. | — |
| POST | `/sources` | Thêm hoặc cập nhật một nguồn. | Header `X-Admin-Token`, body `CustomSource` |
| POST | `/sources/probe` | Gọi thử một nguồn trước khi lưu. | Header `X-Admin-Token`, body `CustomSource` |
| DELETE | `/sources/{id}` | Xoá một nguồn. | Header `X-Admin-Token`, `id` (path) |

> Khi chưa đặt biến môi trường `RAPPHIM_ADMIN_TOKEN`, phần sửa đổi tự tắt hẳn và trả
> `503 ADMIN_NOT_CONFIGURED` — để mở cho ai cũng đổi được nguồn phim là mời kẻ khác trỏ hệ thống
> sang địa chỉ bất kỳ. Khoá sai trả `401 UNAUTHORIZED`. Nhật ký và tình trạng khoá cố ý **không**
> trả về giá trị khoá thật.

## Endpoint nhóm System

Base: `/api/v1`. Các endpoint mô tả chính hệ thống, hữu ích khi frontend dựng menu động.

| Method | Đường dẫn | Mô tả | Tham số chính |
|---|---|---|---|
| GET | `/status` | Tình trạng cấu hình của hệ thống (không trả về khoá nào). | — |
| GET | `/providers` | Các mã nguồn có thể truyền vào tham số `provider`. | — |
| GET | `/list-types` | Các nhóm danh sách kèm nhãn hiển thị. | — |

## Bảng mã lỗi

Mọi lỗi của tầng web được `GlobalExceptionHandler` gom về một `ApiError`. Bảng dưới liệt kê đầy đủ
các mã lỗi và HTTP status tương ứng.

| `code` | HTTP | Ý nghĩa |
|---|---|---|
| `INVALID_PARAMETER` | 400 | Tham số sai định dạng hoặc ngoài miền giá trị (ví dụ `type` không hợp lệ). |
| `MISSING_PARAMETER` | 400 | Thiếu tham số bắt buộc (ví dụ thiếu `keyword`). |
| `VALIDATION_FAILED` | 400 | Không qua bước validate (ví dụ `limit` > 64, `page` < 1). |
| `UNAUTHORIZED` | 401 | Khoá quản trị `X-Admin-Token` không đúng. |
| `MOVIE_NOT_FOUND` | 404 | Không có phim với slug đã cho. |
| `ANIME_NOT_FOUND` | 404 | Nguồn không có anime với mã (và `source`) đã cho. |
| `TMDB_NOT_FOUND` | 404 | Không có bản ghi tương ứng trên TheMovieDB. |
| `SUBTITLE_NOT_FOUND` | 404 | Không tìm thấy phụ đề với `key` đã cho trong kho homelab. |
| `SOURCE_NOT_FOUND` | 404 | Không có nguồn tự thêm với `id` đã cho. |
| `ENDPOINT_NOT_FOUND` | 404 | Sai đường dẫn endpoint. |
| `UPSTREAM_ERROR` | 502 | Nguồn phim bên ngoài lỗi hoặc timeout. |
| `UPSTREAM_BLOCKED` | 502 | Kết nối tới nguồn bị cắt/chặn theo tên miền (thường do DNS hoặc TLS bị chặn). |
| `TMDB_NOT_CONFIGURED` | 503 | Chưa cấu hình khoá TheMovieDB. |
| `ADMIN_NOT_CONFIGURED` | 503 | Chưa đặt `RAPPHIM_ADMIN_TOKEN` nên không sửa được nguồn. |
| `INTERNAL_ERROR` | 500 | Lỗi không xác định phía server. |

## Ví dụ request và response

### Lấy phim mới cập nhật

Gọi endpoint trang chủ với 2 phim mỗi trang.

```http
GET /api/v1/movies/latest?page=1&limit=2&provider=kkphim HTTP/1.1
Host: localhost:8080
Accept: application/json
```

Phản hồi là một `PageResponse<MovieSummary>` nằm trong `data`:

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "items": [
      {
        "id": "b107d3b6dba125cdb0732029601eeee9",
        "slug": "doi-chung",
        "name": "Doi Chung",
        "originName": "Cause Of Death",
        "posterUrl": "https://phimimg.com/uploads/movies/doi-chung-poster.webp",
        "thumbUrl": "https://phimimg.com/uploads/movies/doi-chung-thumb.webp",
        "year": 2026,
        "type": "series",
        "quality": "FHD",
        "lang": "Long Tieng",
        "time": "45 phut/tap",
        "episodeCurrent": "Tap 2",
        "categories": [
          { "id": "9822be111d2ccc29c7172c78b8af8ff5", "name": "Hanh Dong", "slug": "hanh-dong" }
        ],
        "countries": [
          { "id": "3e64d0e0d9c1d2f7e0e3f4a5b6c7d8e9", "name": "Han Quoc", "slug": "han-quoc" }
        ],
        "tmdb": null,
        "imdb": null,
        "provider": "kkphim",
        "modifiedAt": "2026-09-08T20:42:25Z"
      }
    ],
    "meta": { "page": 1, "limit": 2, "totalItems": 8993, "totalPages": 4497 },
    "provider": "kkphim"
  },
  "timestamp": "2026-09-08T16:20:00Z"
}
```

### Lấy chi tiết một phim

```http
GET /api/v1/movies/doi-chung?provider=kkphim HTTP/1.1
Host: localhost:8080
Accept: application/json
```

Phản hồi là một `MovieDetail` (rút gọn phần `servers` để dễ đọc):

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "b107d3b6dba125cdb0732029601eeee9",
    "slug": "doi-chung",
    "name": "Doi Chung",
    "originName": "Cause Of Death",
    "content": "Noi dung phim...",
    "year": 2026,
    "type": "series",
    "status": "ongoing",
    "quality": "FHD",
    "lang": "Long Tieng",
    "time": "45 phut/tap",
    "episodeCurrent": "Tap 2",
    "episodeTotal": "25",
    "actors": [],
    "directors": [],
    "categories": [
      { "id": "9822be111d2ccc29c7172c78b8af8ff5", "name": "Hanh Dong", "slug": "hanh-dong" }
    ],
    "countries": [],
    "servers": [],
    "tmdb": null,
    "imdb": null,
    "provider": "kkphim",
    "modifiedAt": "2026-09-08T20:42:25Z"
  },
  "timestamp": "2026-09-08T16:20:00Z"
}
```

### Tìm kiếm bằng dòng lệnh

Ba lời gọi mẫu bằng `curl` (nhớ mã hoá URL cho khoảng trắng trong `keyword`):

```bash
curl "http://localhost:8080/api/v1/movies/latest?page=1&limit=12"
curl "http://localhost:8080/api/v1/movies?type=phim-bo&country=han-quoc&year=2026"
curl "http://localhost:8080/api/v1/movies/search?keyword=nguoi%20nhen&provider=nguonc"
```

### Một phản hồi lỗi

Gọi chi tiết với slug không tồn tại sẽ nhận `404` kèm `code = MOVIE_NOT_FOUND`:

```http
GET /api/v1/movies/khong-co-that HTTP/1.1
Host: localhost:8080
Accept: application/json
```

```json
{
  "success": false,
  "status": 404,
  "code": "MOVIE_NOT_FOUND",
  "message": "Khong tim thay phim voi slug 'khong-co-that'",
  "path": "/api/v1/movies/khong-co-that",
  "details": [],
  "timestamp": "2026-09-08T16:20:00Z"
}
```

### Thêm một nguồn qua endpoint quản trị

Endpoint sửa đổi đòi header `X-Admin-Token`:

```http
POST /api/v1/admin/sources HTTP/1.1
Host: localhost:8080
Content-Type: application/json
X-Admin-Token: <RAPPHIM_ADMIN_TOKEN>

{
  "id": "my-source",
  "name": "Nguon rieng",
  "baseUrl": "https://vi-du.local",
  "enabled": true
}
```

Nếu chưa đặt `RAPPHIM_ADMIN_TOKEN`, phản hồi là `503` với `code = ADMIN_NOT_CONFIGURED`; nếu khoá
sai là `401` với `code = UNAUTHORIZED`.

## Swagger UI và OpenAPI JSON

Tài liệu API được sinh tự động từ annotation trong code (springdoc-openapi), nên không bao giờ lệch
với hiện thực. Swagger UI còn cho phép gọi thử trực tiếp từng endpoint qua nút *Try it out*.

| Tài nguyên | Địa chỉ (local) |
|---|---|
| Swagger UI | `http://localhost:8080/swagger-ui.html` |
| OpenAPI JSON (động) | `http://localhost:8080/v3/api-docs` |
| Bản xuất tĩnh trong repo | [`../openapi.json`](../openapi.json) |

Trên homelab, thay `localhost:8080` bằng `<homelab>:7101`. Nếu chỉ cần kiểm tra nhanh backend đã có
những khoá và nguồn nào mà không lộ giá trị, gọi `GET /api/v1/status`:

```bash
curl "http://localhost:8080/api/v1/status"
```

Phản hồi có dạng dưới đây (các giá trị boolean phản ánh cấu hình hiện tại của máy):

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "providers": ["kkphim", "nguonc"],
    "builtInCount": 4,
    "customCount": 0,
    "customEnabledCount": 0,
    "tmdbConfigured": false,
    "tmdbKeyShape": "none",
    "homelabConfigured": false,
    "adminConfigured": false
  },
  "timestamp": "2026-09-08T16:20:00Z"
}
```

## Kết luận

REST API của RapPhim WareHouse gói mọi phản hồi vào `ApiResponse` (thành công) hoặc `ApiError`
(thất bại), phân trang qua `PageResponse`/`PageMeta`, và chọn nguồn qua tham số `provider`. Khi tích
hợp, hãy luôn đọc trường `code` của lỗi để rẽ nhánh xử lý thay vì dựa vào chuỗi `message`, và tôn
trọng ràng buộc `limit` tối đa `64` cùng `page` bắt đầu từ `1`.

Khi cần tra cứu chi tiết một schema hoặc thử một endpoint, hãy mở **Swagger UI** — đó là nguồn sự
thật cập nhật theo code. Bản OpenAPI tĩnh nằm ở [`../openapi.json`](../openapi.json) tiện cho việc
sinh client hoặc diff giữa các phiên bản.
