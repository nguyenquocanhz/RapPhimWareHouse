# Tham chiếu cấu hình

> **Tài liệu**
> **Phiên bản:** 1.0
> **Cập nhật:** 2026-09-11
> **Đối tượng đọc:** DevOps, lập trình viên
> **Trạng thái:** Chính thức
> **Tag:** cấu hình, biến môi trường, backend, Spring Boot, Docker, TMDB, ZCloud, CORS

## Giới thiệu

Backend của RapPhim WareHouse là một lớp trung gian: nó gọi nhiều nguồn phim, chuẩn hoá dữ
liệu về một schema DTO duy nhất, cache lại bằng Caffeine rồi phục vụ frontend. Toàn bộ hành
vi của lớp trung gian này — gọi nguồn nào, khoá dịch vụ ngoài nào, ai được phép gọi API —
đều điều khiển bằng **biến môi trường** và các giá trị mặc định trong `application.yml`.

Tài liệu này là bản tham chiếu đầy đủ cho các cấu hình đó. Chúng ta liệt kê từng biến kèm
giá trị mặc định, ánh xạ sang lớp `*Properties` tương ứng trong mã nguồn, và — quan trọng
nhất với vận hành — **hệ quả khi để trống** từng biến.

Một nguyên tắc xuyên suốt cần nhớ trước: dự án được thiết kế để **xuống thang có kiểm soát**
(graceful degradation). Không có biến nào là bắt buộc để khởi động được backend. Thiếu khoá
của một dịch vụ thì đúng phần dịch vụ đó tự tắt hoặc trả về rỗng, phần còn lại của API vẫn
chạy bình thường. Nhờ vậy chúng ta có thể chạy luồng chính chỉ với JDK và Node.js, và bật
thêm tính năng khi có khoá.

## Hai lớp biến môi trường

Điểm dễ nhầm nhất khi vận hành là dự án có **hai lớp** biến môi trường, tên không phải lúc
nào cũng trùng nhau:

1. **Biến trong tệp `.env`** — do `docker compose` đọc để thay vào các placeholder
   `${...}` trong `docker-compose.yml` / `docker-compose.prod.yml`. Đây là các biến ta sửa
   khi triển khai (ví dụ `PUBLIC_WEB_URL`, `ADMIN_TOKEN`, `ZCLOUD_BASE_URL`).
2. **Biến môi trường của container** — cái mà Spring Boot thật sự đọc. Compose chuyển các
   biến `.env` sang tên này trước khi trao cho backend. Một số đổi tên (ví dụ `.env`:
   `PUBLIC_WEB_URL` → container: `RAPPHIM_CORS_ORIGINS`).

Spring Boot ánh xạ biến môi trường của container sang thuộc tính cấu hình bằng **relaxed
binding**: viết HOA, thay mọi dấu chấm và gạch ngang bằng gạch dưới. Nhờ đó thuộc tính
`rapphim.zcloud.base-url` nhận giá trị từ biến `RAPPHIM_ZCLOUD_BASE_URL`, và bất kỳ thuộc
tính nào trong `application.yml` cũng có thể ghi đè bằng biến môi trường theo quy tắc này —
kể cả các thuộc tính không khai báo sẵn placeholder `${...}`.

Bảng dưới cho thấy toàn bộ đường đi từ `.env` tới thuộc tính Spring cho các biến có đổi tên
hoặc đáng lưu ý:

| Biến trong `.env` | Biến container (Spring đọc) | Thuộc tính | Ghi chú |
|---|---|---|---|
| `PUBLIC_WEB_URL` | `RAPPHIM_CORS_ORIGINS` | `rapphim.cors.allowed-origins` | Compose lấy `PUBLIC_WEB_URL` làm origin được phép gọi API |
| `ZCLOUD_BASE_URL` | `RAPPHIM_ZCLOUD_BASE_URL` | `rapphim.zcloud.base-url` | Đổi tên khi vào container |
| `ADMIN_TOKEN` | `RAPPHIM_ADMIN_TOKEN` | `rapphim.admin.token` | Đổi tên khi vào container |
| `ZCLOUD_API_KEY` | `ZCLOUD_API_KEY` | `rapphim.zcloud.api-key` | Giữ nguyên tên |
| `TMDB_ACCESS_TOKEN` | `TMDB_ACCESS_TOKEN` | `rapphim.tmdb.access-token` | Giữ nguyên tên |

Khi chạy backend **không qua Docker** (ví dụ `./mvnw spring-boot:run` lúc phát triển), không
có lớp compose, nên chúng ta đặt thẳng biến container. Ví dụ CORS lúc đó đọc từ
`RAPPHIM_CORS_ORIGINS`, không phải `PUBLIC_WEB_URL`.

## Các lớp cấu hình

Mỗi nhóm thuộc tính `rapphim.*` được nạp vào một record `@ConfigurationProperties` trong gói
`com.rapphim.warehouse.config`. Nắm được ánh xạ này giúp tra ngược từ log hoặc từ mã nguồn
về đúng biến cần sửa.

| Tiền tố thuộc tính | Lớp | Vai trò |
|---|---|---|
| `rapphim.provider` | `ProviderProperties` | Base URL và timeout của các nguồn phim công khai (KKPhim, NguonC, VSMOV) |
| `rapphim.tmdb` | `TmdbProperties` | Nguồn metadata TheMovieDB để sinh file NFO |
| `rapphim.zcloud` | `ZCloudProperties` | Kho phim riêng trên homelab (FastAPI + S3) |
| `rapphim.admin` | `AdminProperties` | Khoá và cấu hình trang quản trị |
| `rapphim.anilist` | `AniListProperties` | Nguồn metadata anime (GraphQL) |
| `rapphim.jikan` | `JikanProperties` | Nguồn metadata anime dự phòng (MyAnimeList/Jikan) |
| `rapphim.cors` | `WebConfig` (nạp bằng `@Value`) | Danh sách origin được phép gọi API |

Trừ CORS đọc trực tiếp bằng `@Value` vào một mảng `String[]`, tất cả nhóm còn lại là record
bất biến với constructor điền sẵn giá trị mặc định — nghĩa là ngay cả khi `application.yml`
bị xoá, các lớp này vẫn tự có mặc định an toàn.

## Cổng và URL

Cổng là cấu hình của lớp Docker, không phải của Spring. Bên trong mạng Docker backend luôn
nghe `8080` và web nghe `3000`; các biến dưới đây chỉ đổi **cổng đưa ra ngoài** (host port).

| Biến (`.env`) | Mặc định | Bắt buộc? | Mô tả |
|---|---|---|---|
| `WEB_PORT` | `7100` | Không | Cổng host cho frontend, ánh xạ tới `3000` trong container |
| `BACKEND_PORT` | `7101` | Không | Cổng host cho backend, ánh xạ tới `8080` trong container |
| `PUBLIC_WEB_URL` | `http://localhost:7100` | Không | Địa chỉ web nhìn từ trình duyệt; compose dùng nó làm origin CORS (xem mục [CORS](#cors)) |

Trên homelab, `8080` đã có ZCloud dùng nên dự án chọn cặp cổng `7100` / `7101`. Muốn đổi
cổng khi triển khai, chỉ cần sửa `.env`:

```bash
# .env - doi cong dua ra ngoai
WEB_PORT=8090
BACKEND_PORT=8091
```

Riêng cổng nội bộ `8080` của backend khai báo trong `application.yml` và hiếm khi cần đổi:

```yaml
server:
  port: 8080
```

## Nguồn ZCloud (kho phim homelab)

ZCloud là kho phim riêng chạy trong mạng nội bộ (FastAPI + S3). Nó bắt xác thực, và giống
mọi khoá khác, **không được đặt khoá trực tiếp trong mã nguồn**. Cấu hình nạp vào
`ZCloudProperties` (`rapphim.zcloud`).

| Biến (Spring) | Alias trong `.env` | Mặc định | Bắt buộc? | Mô tả |
|---|---|---|---|---|
| `RAPPHIM_ZCLOUD_BASE_URL` | `ZCLOUD_BASE_URL` | `http://192.168.100.169:8080` | Không | Gốc REST API của ZCloud. Trong `.env` mặc định là `http://host.docker.internal:8080` để container gọi ngược về máy chủ |
| `ZCLOUD_API_KEY` | `ZCLOUD_API_KEY` | *(rỗng)* | Không | Khoá gọi thẳng, gửi qua header `x-api-key`. **Được ưu tiên** hơn mật khẩu |
| `ZCLOUD_PASSWORD` | `ZCLOUD_PASSWORD` | *(rỗng)* | Không | Mật khẩu đăng nhập, chỉ dùng khi chưa có khoá |
| `ZCLOUD_PREFIX` | `ZCLOUD_PREFIX` | *(rỗng)* | Không | Thư mục gốc chứa phim trong kho. Để rỗng nghĩa là quét cả kho |
| `RAPPHIM_ZCLOUD_PRESIGN_EXPIRY` | — | `6h` | Không | Thời hạn của đường dẫn phát trực tiếp (presigned URL) |
| `RAPPHIM_ZCLOUD_PAGE_SIZE` | — | `1000` | Không | Số mục lấy mỗi lần gọi khi duyệt kho |

Logic chọn cách xác thực nằm ngay trong record: có khoá thì dùng khoá, không thì thử mật
khẩu.

```java
// ZCloudProperties.java
public boolean isConfigured() {
    return apiKey != null || password != null;
}

// Khoa goi thang khong can giu phien, nen luon uu tien hon dang nhap bang mat khau.
public boolean usesApiKey() {
    return apiKey != null;
}
```

Thuộc tính `prefix` được chuẩn hoá để luôn kết thúc bằng `/` (và bỏ dấu `/` ở đầu), nên ta
viết `phim` hay `/phim/` đều cho kết quả như nhau.

**Hệ quả khi để trống:** thiếu **cả** `ZCLOUD_API_KEY` lẫn `ZCLOUD_PASSWORD` thì
`isConfigured()` trả `false`, **nguồn `homelab` tự tắt** — các endpoint của nó trả về danh
sách rỗng thay vì làm hỏng cả API. Đây là hành vi cố ý, giống cách TMDB xử lý khi thiếu
khoá.

## TheMovieDB (TMDB)

TMDB là nguồn metadata để sinh file NFO cho Kodi / Jellyfin / Emby. Cấu hình nạp vào
`TmdbProperties` (`rapphim.tmdb`).

| Biến (Spring) | Mặc định | Bắt buộc? | Mô tả |
|---|---|---|---|
| `TMDB_ACCESS_TOKEN` | *(rỗng)* | Không | Token đọc v4, gửi qua header `Authorization: Bearer`. **Được ưu tiên** |
| `TMDB_API_KEY` | *(rỗng)* | Không | Khoá API v3, gửi qua query param `api_key` |
| `RAPPHIM_TMDB_BASE_URL` | `https://api.themoviedb.org/3` | Không | Gốc REST API của TMDB |
| `RAPPHIM_TMDB_IMAGE_BASE_URL` | `https://image.tmdb.org/t/p` | Không | Gốc CDN ảnh, ghép với đường dẫn tương đối |
| `RAPPHIM_TMDB_LANGUAGE` | `vi-VN` | Không | Ngôn ngữ metadata mong muốn |

Cách chọn kiểu xác thực và trạng thái cấu hình được quyết định trong record:

```java
// TmdbProperties.java
public boolean isConfigured() {
    return apiKey != null || accessToken != null;
}

// Uu tien token v4 vi TMDB dang khuyen nghi dung dang nay.
public boolean usesBearerToken() {
    return accessToken != null;
}
```

**Hệ quả khi để trống:** thiếu **cả** `TMDB_ACCESS_TOKEN` lẫn `TMDB_API_KEY` thì các
endpoint TMDB trả về **`503` kèm mã `TMDB_NOT_CONFIGURED`**. Riêng endpoint xuất NFO vẫn
chạy được bằng dữ liệu của chính nguồn phim, chỉ là thiếu phần metadata bổ sung từ TMDB.

## Nguồn metadata anime (AniList và Jikan)

Hai nguồn này chỉ cung cấp metadata anime (không phát video) qua API công khai, **không cần
khoá**. Chúng chỉ có duy nhất một base URL, nạp vào `AniListProperties` và `JikanProperties`.

| Biến (Spring) | Mặc định | Bắt buộc? | Mô tả |
|---|---|---|---|
| `RAPPHIM_ANILIST_BASE_URL` | `https://graphql.anilist.co` | Không | Endpoint GraphQL của AniList |
| `RAPPHIM_JIKAN_BASE_URL` | `https://api.jikan.moe/v4` | Không | Gốc REST API của Jikan v4, dùng làm nguồn **dự phòng** cho AniList |

Ảnh của cả hai nguồn trả về là URL tuyệt đối nên không cần ghép CDN. Thường ta chỉ đổi hai
biến này khi cần trỏ qua proxy nội bộ.

## Khoá quản trị (Admin token)

Trang quản trị cho phép thêm / sửa nguồn phim lúc đang chạy. Cấu hình nạp vào
`AdminProperties` (`rapphim.admin`).

| Biến (Spring) | Alias trong `.env` | Mặc định | Bắt buộc? | Mô tả |
|---|---|---|---|---|
| `RAPPHIM_ADMIN_TOKEN` | `ADMIN_TOKEN` | *(rỗng)* | Không | Khoá gọi các endpoint sửa đổi. Nên đặt chuỗi dài, ngẫu nhiên |
| `RAPPHIM_SOURCES_FILE` | — | `data/custom-sources.json` | Không | Nơi lưu danh sách nguồn tự thêm. Trong Docker được đặt `/app/data/custom-sources.json` (gắn với volume) |
| `RAPPHIM_ADMIN_CONNECT_TIMEOUT` | — | `5s` | Không | Thời gian chờ mở kết nối tới nguồn tự thêm |
| `RAPPHIM_ADMIN_READ_TIMEOUT` | — | `20s` | Không | Thời gian chờ dữ liệu từ nguồn tự thêm |

So khoá gửi lên với khoá đã cấu hình được thực hiện ngay trong record:

```java
// AdminProperties.java
public boolean isConfigured() {
    return token != null;
}

public boolean matches(String candidate) {
    return token != null && token.equals(candidate);
}
```

**Hệ quả khi để trống:** thiếu `RAPPHIM_ADMIN_TOKEN` thì các endpoint sửa đổi trả về `503`
và **trang quản trị chỉ còn xem được**. Đây là mặc định an toàn: thà khoá phần sửa đổi còn
hơn để mở cho bất kỳ ai cũng đổi được nguồn phim của cả hệ thống.

Lưu ý về `RAPPHIM_SOURCES_FILE`: trong Docker giá trị này trỏ vào `/app/data` được gắn với
volume `rapphim-data`, nên nguồn tự thêm sống qua các lần dựng lại container. Đổi sang đường
dẫn ngoài volume đồng nghĩa mất danh sách nguồn mỗi lần dựng lại ảnh.

## Nguồn phim: base URL và timeout

Nhóm này cấu hình các nguồn phim công khai và ngưỡng thời gian chờ khi gọi ra ngoài, nạp
vào `ProviderProperties` (`rapphim.provider`). Các thuộc tính này **không khai báo sẵn
placeholder `${...}`** trong `application.yml`, nhưng vẫn ghi đè được bằng biến môi trường
theo quy tắc relaxed binding.

| Biến (Spring) | Mặc định | Bắt buộc? | Mô tả |
|---|---|---|---|
| `RAPPHIM_PROVIDER_CONNECT_TIMEOUT` | `5s` | Không | Thời gian tối đa để mở kết nối tới nguồn |
| `RAPPHIM_PROVIDER_READ_TIMEOUT` | `20s` | Không | Thời gian tối đa chờ một phản hồi |
| `RAPPHIM_PROVIDER_KKPHIM_BASE_URL` | `https://phimapi.com` | Không | Gốc REST API của KKPhim |
| `RAPPHIM_PROVIDER_KKPHIM_CDN_IMAGE` | `https://phimimg.com` | Không | Gốc CDN ảnh của KKPhim (ghép với đường dẫn ảnh tương đối) |
| `RAPPHIM_PROVIDER_NGUONC_BASE_URL` | `https://phim.nguonc.com` | Không | Gốc REST API của NguonC |
| `RAPPHIM_PROVIDER_NGUONC_CDN_IMAGE` | *(rỗng)* | Không | NguonC trả URL ảnh tuyệt đối nên gốc CDN để trống |
| `RAPPHIM_PROVIDER_VSMOV_BASE_URL` | `https://vsmov.com` | Không | Gốc REST API của VSMOV |
| `RAPPHIM_PROVIDER_VSMOV_CDN_IMAGE` | *(rỗng)* | Không | VSMOV trả URL ảnh tuyệt đối nên gốc CDN để trống |

Các mặc định này được điền ngay trong constructor của record, nên đúng ngay cả khi
`application.yml` bị lược bỏ:

```java
// ProviderProperties.java
public ProviderProperties {
    kkphim = kkphim == null ? new Endpoint("https://phimapi.com", "https://phimimg.com") : kkphim;
    nguonc = nguonc == null ? new Endpoint("https://phim.nguonc.com", "") : nguonc;
    // Anh cua VSMOV la URL tuyet doi nen goc CDN de trong.
    vsmov = vsmov == null ? new Endpoint("https://vsmov.com", "") : vsmov;
    connectTimeout = connectTimeout == null ? Duration.ofSeconds(5) : connectTimeout;
    readTimeout = readTimeout == null ? Duration.ofSeconds(20) : readTimeout;
}
```

Timeout nhận cú pháp `Duration` của Spring: `5s`, `20s`, `1m`, `500ms`… Muốn nới thời gian
chờ cho một mạng chậm, ta đặt:

```bash
# Cho phep cho lau hon khi nguon phim phan hoi cham
RAPPHIM_PROVIDER_READ_TIMEOUT=40s
```

## CORS

CORS quyết định origin (trình duyệt) nào được gọi thẳng vào API. Giá trị đọc bằng `@Value`
vào một mảng `String[]` trong `WebConfig`, tách theo dấu phẩy.

| Biến (Spring) | Mặc định | Bắt buộc? | Mô tả |
|---|---|---|---|
| `RAPPHIM_CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Không | Danh sách origin được phép, ngăn cách bằng dấu phẩy |

Trong Docker, biến này **không lấy từ `.env` trực tiếp** mà được compose điền từ
`PUBLIC_WEB_URL`:

```yaml
# docker-compose.yml (dich vu backend)
environment:
  RAPPHIM_CORS_ORIGINS: ${PUBLIC_WEB_URL:-http://localhost:7100}
```

Chính sách CORS áp cho đường dẫn `/api/**` với các phương thức và ngưỡng cache preflight cố
định trong mã:

```java
// WebConfig.java
registry.addMapping("/api/**")
        .allowedOrigins(allowedOrigins)
        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        .allowedHeaders("*")
        .maxAge(3600);
```

Một điểm dễ hiểu lầm: **bản thân trang web không cần biến này**. Mọi lời gọi của frontend
Next.js đều đi qua route handler của chính nó (server-to-server), không phải từ trình duyệt.
`RAPPHIM_CORS_ORIGINS` chỉ có tác dụng khi có ai đó gọi thẳng API từ một trang khác trong
trình duyệt. Vì vậy để trống không làm hỏng trang web; nó chỉ giới hạn lời gọi chéo origin
trực tiếp về đúng danh sách mặc định.

## Giới hạn RAM (tuỳ chọn)

Nhóm cuối cùng thuộc lớp Docker và JVM, không phải thuộc tính Spring. Mặc định trong
`docker-compose.prod.yml` hợp cho VPS 2GB; chỉ đặt khi cần siết cho máy nhỏ hơn.

| Biến (`.env`) | Mặc định | Bắt buộc? | Mô tả |
|---|---|---|---|
| `BACKEND_MEM_LIMIT` | `1g` | Không | Trần RAM Docker cấp cho container backend |
| `JAVA_OPTS` | `-Xmx640m` | Không | Tuỳ chọn JVM; ghim trần heap để tránh JVM đọc RAM cả host |
| `WEB_MEM_LIMIT` | `512m` | Không | Trần RAM Docker cấp cho container web |

Trên VPS 1GB, `.env.example` gợi ý cặp giá trị chặt hơn:

```bash
# .env - siet cho VPS 1GB
BACKEND_MEM_LIMIT=640m
JAVA_OPTS=-Xmx384m
WEB_MEM_LIMIT=384m
```

## Tổng hợp hệ quả khi để trống

Bảng này gom lại các điểm xuống thang quan trọng nhất để tra nhanh khi vận hành:

| Biến để trống | Hệ quả |
|---|---|
| `ZCLOUD_API_KEY` **và** `ZCLOUD_PASSWORD` | Nguồn `homelab` tự tắt, trả về danh sách rỗng; phần còn lại của API vẫn chạy |
| `TMDB_ACCESS_TOKEN` **và** `TMDB_API_KEY` | Endpoint TMDB trả `503 TMDB_NOT_CONFIGURED`; xuất NFO vẫn chạy bằng dữ liệu nguồn phim |
| `RAPPHIM_ADMIN_TOKEN` | Endpoint sửa đổi trả `503`; trang quản trị chỉ còn xem được |
| `RAPPHIM_CORS_ORIGINS` | Dùng mặc định `http://localhost:3000,http://127.0.0.1:3000`; không ảnh hưởng trang web (gọi server-to-server) |
| Các base URL / timeout của provider | Dùng giá trị mặc định điền sẵn trong record `*Properties` |

## Kết luận

Cấu hình của RapPhim WareHouse xoay quanh vài nguyên tắc gọn: biến `.env` phục vụ lớp
Docker, Spring đọc biến container qua relaxed binding, và mọi thứ đều có mặc định an toàn nên
thiếu khoá thì đúng phần đó xuống thang chứ không sập cả hệ thống. Khi cần sửa một hành vi,
cách làm chuẩn là tra biến trong bảng nhóm tương ứng, đối chiếu với lớp `*Properties` để hiểu
mặc định, rồi kiểm tra bảng hệ quả để biết trước điều gì xảy ra khi để trống.

Các tài liệu liên quan trong bộ hướng dẫn:

- [01 – Cài đặt môi trường phát triển](./01-cai-dat-moi-truong-phat-trien.md) — dựng backend
  và frontend cục bộ, kèm danh sách biến môi trường tối thiểu để chạy luồng chính.
- Bản xuất tĩnh của API: [`docs/openapi.json`](../openapi.json), hoặc mở Swagger UI tại
  <http://localhost:8080/swagger-ui.html> khi backend đang chạy.
