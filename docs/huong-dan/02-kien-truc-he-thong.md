# Kiến trúc hệ thống

> Tài liệu: Kiến trúc hệ thống RapPhim WareHouse
> Phiên bản: 1.0
> Cập nhật: 2026-09-11
> Đối tượng đọc: Lập trình viên backend, kiến trúc sư
> Trạng thái: Chính thức
> Tag: kien-truc, backend, provider, cache, dns

## Giới thiệu

RapPhim WareHouse là một kho phim web gồm hai phần chạy độc lập: backend Spring Boot
4.1 (Java 17, dùng Maven Wrapper) nghe cổng `8080`, và frontend Next.js 16 + React 19
+ Tailwind 4 nghe cổng `3000`. Trên homelab hai tầng được đưa ra ngoài ở cổng `7101`
(backend) và `7100` (web).

Điều cốt lõi cần nắm trước khi đọc mã: **backend không phải là chủ của dữ liệu, nó là
một lớp trung gian**. Mỗi bộ phim, mỗi tập, mỗi thể loại đều đến từ một nguồn bên ngoài
(KKPhim, NguonC, VSMOV, kho riêng homelab), còn metadata thì đến từ TMDB, AniList và
Jikan. Các nguồn này trả về JSON theo những định dạng rất khác nhau. Nhiệm vụ của backend
là gọi các nguồn đó, đưa mọi thứ về **một schema DTO duy nhất**, đệm (cache) lại kết quả
rồi phục vụ frontend. Nhờ vậy frontend không cần biết nguồn nào trả về gì, và thêm một
nguồn mới không làm thay đổi tầng web.

Tài liệu này giải thích cách các tầng được xếp đặt, tầng nào chịu trách nhiệm gì, và một
request thật đi từ trình duyệt tới nguồn ngoài rồi quay về ra sao. Chúng ta sẽ đọc thẳng
từ mã nguồn để không nói sai một tên lớp hay một endpoint nào.

## Các thành phần chính

Mã backend phân tầng theo mô hình MVC quen thuộc của Spring, mỗi gói (package) một trách
nhiệm rõ ràng:

| Gói | Vai trò |
|---|---|
| `web/` | Controller: nhận request, validate tham số, bọc kết quả vào envelope. Không chứa nghiệp vụ. |
| `service/` | Nghiệp vụ và cache. `MovieService` chọn nguồn qua `ProviderRegistry` rồi gọi provider tương ứng. |
| `provider/` | Cổng ra ngoài. `MovieProvider` là interface, mỗi nguồn một cài đặt (`kkphim/`, `nguonc/`, `vsmov/`, `homelab/`, `tmdb/`, `anilist/`, `jikan/`). |
| `dto/` | Schema chuẩn hoá lộ ra REST API: `MovieSummary`, `MovieDetail`, `Taxonomy`, `ProviderType`... |
| `common/` | Vỏ bọc phản hồi dùng chung: `ApiResponse`, `PageResponse`, `PageMeta`, `ApiError`. |
| `config/` | Cấu hình hạ tầng: `CacheConfig`, `RestClientConfig`, `ProviderProperties`, CORS, OpenAPI. |
| `exception/` | `GlobalExceptionHandler` gom mọi lỗi về một định dạng thống nhất. |

Ngoài mã Java, tầng hạ tầng còn có một container CoreDNS (định nghĩa trong `Corefile`)
làm bộ phân giải tên miền riêng cho toàn bộ stack Docker.

## Sơ đồ các tầng và trách nhiệm

Một lời gọi luôn đi xuống theo đúng bốn tầng, và mỗi tầng chỉ làm việc của mình:

```text
Trình duyệt (React)
      │  HTTP (cùng gốc, không gọi thẳng backend)
      ▼
Next.js server  ──HTTP──>  Spring Boot backend
                               │
   ┌───────────────────────────┼───────────────────────────────────────┐
   │  web/         Controller: validate @Min/@Max/@NotBlank, bọc envelope │
   │  service/     MovieService: @Cacheable + chon nguon qua registry     │
   │  provider/    MovieProvider: goi nguon that, chuan hoa ve DTO        │
   │  config/      RestClient (timeout) + Caffeine cache + CoreDNS        │
   └───────────────────────────┼───────────────────────────────────────┘
                               │  RestClient.get() qua CoreDNS (DNS-over-TLS)
                               ▼
        Nguon ngoai: phimapi.com / phim.nguonc.com / vsmov.com /
                     ZCloud (homelab) / api.themoviedb.org / ...
```

- **Tầng web (`MovieController`)** chỉ nhận request, kiểm tra tham số (`@Min(1)`,
  `@Max(64)`, `@NotBlank`) rồi gói kết quả vào `ApiResponse`. Nó không biết dữ liệu từ
  đâu ra.
- **Tầng service (`MovieService`)** quyết định *lấy từ nguồn nào* và *có cache hay không*.
  Nó không tự gọi HTTP; nó nhờ `ProviderRegistry` tìm cài đặt phù hợp.
- **Tầng provider** là nơi duy nhất biết định dạng thật của từng nguồn. Nó gọi HTTP, đọc
  JSON thô, rồi dịch sang DTO chuẩn.
- **Tầng config** cung cấp công cụ cho các tầng trên: `RestClient` đã cài sẵn timeout,
  `CacheManager` của Caffeine, và bộ phân giải DNS riêng.

## Trừu tượng Provider

Đây là trái tim của kiến trúc. Tầng service chỉ làm việc qua một interface, nhờ đó thêm
nguồn mới không đụng tới controller hay service.

### Interface `MovieProvider`

`MovieProvider` là hợp đồng chung cho mọi nguồn phim. Trích từ
[`MovieProvider.java`](../../backend/src/main/java/com/rapphim/warehouse/provider/MovieProvider.java):

```java
public interface MovieProvider {

    /** Nguon ma cai dat nay dai dien. */
    ProviderType type();

    /** Ma dinh danh dung tren URL. */
    default String code() {
        return type().code();
    }

    PageResponse<MovieSummary> latest(MovieQuery query);
    PageResponse<MovieSummary> listByType(ListType listType, MovieQuery query);
    PageResponse<MovieSummary> search(String keyword, MovieQuery query);
    PageResponse<MovieSummary> listByCategory(String categorySlug, MovieQuery query);
    PageResponse<MovieSummary> listByCountry(String countrySlug, MovieQuery query);
    PageResponse<MovieSummary> listByYear(int year, MovieQuery query);
    Optional<MovieDetail> findBySlug(String slug);
    List<Taxonomy> categories();
    List<Taxonomy> countries();
}
```

Hai điểm đáng chú ý:

- `type()` trả về nguồn mà cài đặt đại diện, dùng làm khoá tra cứu.
- `code()` là mã xuất hiện trên URL (`?provider=kkphim`). Mặc định nó lấy thẳng mã của
  `ProviderType`, nhưng nguồn do người dùng tự thêm — vốn không nằm trong enum — sẽ ghi
  đè hàm này bằng mã riêng của mình.

### Enum `ProviderType`

Các nguồn dựng sẵn được liệt kê trong
[`ProviderType.java`](../../backend/src/main/java/com/rapphim/warehouse/dto/ProviderType.java),
mỗi hằng gắn với một mã dùng trên URL:

```java
public enum ProviderType {
    KKPHIM("kkphim"),   // phimapi.com
    NGUONC("nguonc"),   // phim.nguonc.com
    VSMOV("vsmov"),     // vsmov.com
    HOMELAB("homelab"); // Kho phim rieng tren homelab, doc qua ZCloud
    ...
}
```

Enum cũng đóng vai trò bộ chuyển đổi khi Jackson đọc/ghi JSON: `@JsonValue` xuất ra mã
chữ thường, còn `@JsonCreator from(...)` nhận cả mã lẫn tên hằng, giá trị rỗng thì rơi về
`KKPHIM` làm mặc định.

### `ProviderRegistry` — tự phát hiện `@Component` theo `type()`

`ProviderRegistry` là chỗ Spring gom mọi cài đặt lại. Điểm mấu chốt: constructor nhận
`List<MovieProvider>` — Spring tự tiêm **mọi bean nào cài đặt interface này** (mỗi provider
được đánh dấu `@Component`) — rồi lập chỉ mục theo `type()`. Trích từ
[`ProviderRegistry.java`](../../backend/src/main/java/com/rapphim/warehouse/provider/ProviderRegistry.java):

```java
@Component
public class ProviderRegistry {

    private final Map<ProviderType, MovieProvider> providers = new EnumMap<>(ProviderType.class);
    private final CustomSourceService customSources;

    public ProviderRegistry(List<MovieProvider> discovered, @Lazy CustomSourceService customSources) {
        discovered.forEach(provider -> providers.put(provider.type(), provider));
        this.customSources = customSources;
    }
    ...
}
```

Nhờ cách này, thêm một nguồn dựng sẵn mới chỉ cần viết một lớp `@Component` cài đặt
`MovieProvider` và thêm một hằng vào `ProviderType`. Registry sẽ tự nhận, không phải sửa
danh sách nào bằng tay.

Việc tra cứu tách làm hai lối, thấy rõ trong hàm `get(String code)`:

```java
public MovieProvider get(String code) {
    if (code == null || code.isBlank()) {
        return get(ProviderType.KKPHIM);          // rong -> nguon mac dinh
    }
    String wanted = code.trim().toLowerCase();
    for (ProviderType type : ProviderType.values()) {
        if (type.code().equals(wanted)) {
            return get(type);                       // nguon dung san
        }
    }
    MovieProvider custom = customSources.activeProviders().get(wanted);
    if (custom == null) {
        throw new IllegalArgumentException("Nguon '" + code + "' khong hop le. ...");
    }
    return custom;                                  // nguon nguoi dung tu them
}
```

Tìm trong các nguồn dựng sẵn trước, rồi mới đến nguồn người dùng tự thêm (nạp lúc chạy từ
`CustomSourceService`). Mã sai vẫn ném `IllegalArgumentException` kèm danh sách các nguồn
đang có — cuối cùng ra HTTP 400. Tham chiếu `@Lazy` tới `CustomSourceService` là để phá
vòng phụ thuộc: dịch vụ nguồn tự thêm dùng lại cách đọc của KKPhim, còn registry lại phải
hỏi nó để biết có những mã nào.

## Chuẩn hoá DTO

Mỗi nguồn trả về JSON một kiểu, nhưng tầng service và tầng web chỉ thấy **một schema
chung**. Việc quy đổi nằm gọn trong tầng provider.

### `MovieSummary` và `MovieDetail`

Hai DTO trung tâm là `MovieSummary` (bản rút gọn, dùng cho lưới danh sách) và `MovieDetail`
(bản đầy đủ, kèm danh sách server và tập). Cả hai đều là `record` bất biến. Ví dụ hàm
chuyển đổi trong
[`KKPhimProvider.java`](../../backend/src/main/java/com/rapphim/warehouse/provider/kkphim/KKPhimProvider.java)
gom JSON thô của `phimapi.com` về `MovieSummary`:

```java
private MovieSummary toSummary(KKPhimModels.Item item, String cdn) {
    return new MovieSummary(
            item.id(),
            item.slug(),
            item.name(),
            item.originName(),
            ProviderSupport.absoluteImage(item.posterUrl(), cdn),
            ProviderSupport.absoluteImage(item.thumbUrl(), cdn),
            item.year(),
            item.type(),
            item.quality(),
            item.lang(),
            item.time(),
            item.episodeCurrent(),
            toTaxonomies(item.category()),
            toTaxonomies(item.country()),
            toTmdb(item.tmdb()),
            toImdb(item.imdb()),
            code,
            item.modified() == null ? null : ProviderSupport.normalizeInstant(item.modified().time()));
}
```

Điểm cần nhớ: dù JSON gốc của KKPhim, NguonC hay VSMOV khác nhau ra sao, chúng đều được
dồn về đúng các trường này. `MovieSummary` còn có hàm tĩnh `from(MovieDetail)` để rút một
bản chi tiết thành mục danh sách khi cần.

### Vai trò của `ProviderSupport`

`ProviderSupport` là bộ hàm tiện ích dùng chung cho **mọi provider** khi dịch dữ liệu thô
sang DTO. Nó gom những phép chuẩn hoá mà nguồn nào cũng cần, để không nơi nào phải chép
lại. Trích từ
[`ProviderSupport.java`](../../backend/src/main/java/com/rapphim/warehouse/provider/ProviderSupport.java):

| Hàm | Việc nó làm |
|---|---|
| `slugify(value)` | Sinh slug từ tên tiếng Việt (`"Hành Động"` thành `"hanh-dong"`), dùng cho nguồn chỉ trả về tên mà không trả slug. |
| `absoluteImage(path, cdn)` | Ghép đường dẫn ảnh tương đối với gốc CDN; giữ nguyên nếu đã là URL tuyệt đối. |
| `isPlaceholder(value)` | Nhận diện giá trị rỗng kiểu `"Đang cập nhật"` / `"updating"`, so trên slug nên khớp cả có dấu lẫn không dấu. |
| `splitCsv(value)` | Tách chuỗi ngăn bằng dấu phẩy, bỏ phần tử rỗng và phần tử placeholder. |
| `normalizeInstant(raw)` | Đưa chuỗi thời gian về ISO-8601 chuẩn, trả nguyên bản nếu không đọc được. |
| `parseInt(raw)` | Chuyển chuỗi sang số nguyên an toàn, trả `null` nếu không hợp lệ. |
| `orEmpty(list)` | Trả danh sách rỗng thay vì `null`, tránh `NullPointerException` khi nguồn thiếu trường. |

Nhờ tập hàm này, mỗi provider chỉ còn phải lo phần khác biệt thật sự của nguồn mình.

## Vỏ bọc phản hồi và phân trang

Mọi phản hồi REST đều đi qua hai vỏ bọc chung, giúp client xử lý nhất quán bất kể endpoint.

### `ApiResponse` — envelope chuẩn

[`ApiResponse.java`](../../backend/src/main/java/com/rapphim/warehouse/common/ApiResponse.java)
là một `record` bọc mọi kết quả thành công lẫn thất bại:

```java
public record ApiResponse<T>(boolean success, String message, T data, Instant timestamp) {
    public static <T> ApiResponse<T> ok(T data)   { return new ApiResponse<>(true,  "OK",    data, Instant.now()); }
    public static <T> ApiResponse<T> fail(String message) { return new ApiResponse<>(false, message, null, Instant.now()); }
}
```

Hình dạng JSON quen thuộc client luôn nhận được:

```json
{
  "success": true,
  "message": "OK",
  "data": { },
  "timestamp": "2026-09-08T16:20:00Z"
}
```

### `PageResponse` — kết quả có phân trang

Kết quả dạng danh sách nằm trong
[`PageResponse.java`](../../backend/src/main/java/com/rapphim/warehouse/common/PageResponse.java),
kèm khối `meta` phân trang và trường `provider` cho biết nguồn nào đã phục vụ:

```java
public record PageResponse<T>(List<T> items, PageMeta meta, String provider) {
    public static <T> PageResponse<T> of(List<T> items, PageMeta meta, String provider) {
        return new PageResponse<>(items == null ? List.of() : items, meta, provider);
    }
    public static <T> PageResponse<T> empty(int page, int limit, String provider) {
        return new PageResponse<>(List.of(), PageMeta.of(page, limit, 0), provider);
    }
}
```

Hàm `empty(...)` được dùng khi nguồn trả rỗng (ví dụ 404 kèm body JSON), để trả một trang
rỗng hợp lệ thay vì ném lỗi. Trong lời gọi danh sách, controller lồng cả hai vỏ:
`ApiResponse<PageResponse<MovieSummary>>`.

## Cache Caffeine

Gọi nguồn ngoài là phần chậm và dễ hỏng nhất, nên kết quả được đệm trong bộ nhớ bằng
Caffeine. Cấu hình nằm trong
[`CacheConfig.java`](../../backend/src/main/java/com/rapphim/warehouse/config/CacheConfig.java):
mỗi loại dữ liệu một cache riêng, thời gian sống và dung lượng chọn theo mức độ đổi thay
của dữ liệu.

```java
@Configuration
@EnableCaching
public class CacheConfig {

    public static final String MOVIE_LIST_CACHE      = "movieLists";
    public static final String MOVIE_DETAIL_CACHE    = "movieDetails";
    public static final String TAXONOMY_CACHE        = "taxonomies";
    public static final String HOMELAB_LIBRARY_CACHE = "homelabLibrary";

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.registerCustomCache(MOVIE_LIST_CACHE, Caffeine.newBuilder()
                .maximumSize(500).expireAfterWrite(Duration.ofMinutes(5)).build());
        // ... cac cache con lai
        return manager;
    }
}
```

Bảng tóm tắt bốn cache:

| Cache (hằng) | Tên | Thời gian sống | Dung lượng | Lý do |
|---|---|---|---|---|
| `MOVIE_LIST_CACHE` | `movieLists` | 5 phút | 500 mục | Danh sách đổi nhanh nên giữ ngắn. |
| `MOVIE_DETAIL_CACHE` | `movieDetails` | 30 phút | 1.000 mục | Chi tiết ổn định hơn, giữ lâu hơn. |
| `TAXONOMY_CACHE` | `taxonomies` | 12 giờ | 32 mục | Thể loại / quốc gia gần như tĩnh. |
| `HOMELAB_LIBRARY_CACHE` | `homelabLibrary` | 3 phút | 4 mục | Duyệt cả cây file kho riêng nên bắt buộc phải đệm; giữ ngắn để chép phim mới vào là thấy ngay. |

Cache được kích hoạt ở tầng service. `MovieService` gắn `@Cacheable` lên từng phương thức,
lấy khoá từ chính tham số truy vấn — trích từ
[`MovieService.java`](../../backend/src/main/java/com/rapphim/warehouse/service/MovieService.java):

```java
@Cacheable(cacheNames = CacheConfig.MOVIE_LIST_CACHE,
        key = "'latest:' + #provider + ':' + #query.page() + ':' + #query.limit()")
public PageResponse<MovieSummary> latest(String provider, MovieQuery query) {
    return resolve(provider).latest(query);
}

@Cacheable(cacheNames = CacheConfig.MOVIE_DETAIL_CACHE, key = "#provider + ':' + #slug")
public MovieDetail findBySlug(String provider, String slug) {
    return resolve(provider).findBySlug(slug)
            .orElseThrow(() -> new ResourceNotFoundException("MOVIE_NOT_FOUND", "..."));
}
```

Khoá cache luôn có tiền tố `provider` để hai nguồn không đè kết quả của nhau. Xem trạng
thái các cache tại `http://localhost:8080/actuator/caches`.

## Cấu hình RestClient và timeout

Mọi lời gọi ra ngoài đi qua `RestClient` của Spring. Các bean được dựng sẵn trong
[`RestClientConfig.java`](../../backend/src/main/java/com/rapphim/warehouse/config/RestClientConfig.java),
mỗi nguồn một client riêng, tất cả dùng chung một factory có gắn timeout:

```java
@Bean
public ClientHttpRequestFactory providerRequestFactory() {
    HttpClientSettings settings = HttpClientSettings.defaults()
            .withTimeouts(properties.connectTimeout(), properties.readTimeout());
    return ClientHttpRequestFactoryBuilder.detect().build(settings);
}

@Bean
public RestClient kkphimRestClient(RestClient.Builder builder, ClientHttpRequestFactory factory) {
    return baseClient(builder, factory, properties.kkphim().baseUrl());
}
```

Giá trị timeout đến từ `ProviderProperties` (tiền tố `rapphim.provider`) và được đặt trong
`application.yml`:

| Tham số | Giá trị mặc định | Ý nghĩa |
|---|---|---|
| `rapphim.provider.connect-timeout` | `5s` | Thời gian tối đa để mở kết nối tới nguồn. |
| `rapphim.provider.read-timeout` | `20s` | Thời gian tối đa chờ một phản hồi. |

Mục đích của timeout: một nguồn chậm sẽ không kéo treo cả API. Khi `RestClient` ném lỗi,
provider bắt lại và chuyển thành `UpstreamException` — cuối cùng ra HTTP 502
`UPSTREAM_ERROR` cho client, thay vì để request treo vô hạn. Xem cách bắt lỗi trong
`KKPhimProvider.call(...)`:

```java
try {
    return client.get().uri(uriFunction::apply).retrieve()
            .onStatus(HttpStatusCode::is4xxClientError, (request, response) -> { /* doc body nhu du lieu rong */ })
            .body(responseType);
} catch (RestClientException ex) {
    log.warn("Goi KKPhim that bai: {}", ex.getMessage());
    throw new UpstreamException(code, "Khong lay duoc du lieu tu KKPhim: " + ex.getMessage(), ex);
}
```

Mỗi client còn được gắn sẵn header `User-Agent` và `Accept: application/json`. Riêng client
cho TMDB, AniList, Jikan và ZCloud (kho riêng) **không** gắn sẵn thông tin xác thực ở tầng
này: khoá đổi được lúc chạy trong khi client chỉ dựng một lần lúc khởi động, nên token/khoá
được gắn vào từng request ở lớp client tương ứng.

## CoreDNS với DNS-over-TLS

Stack Docker có thêm một container CoreDNS. Đây không phải chi tiết trang trí, mà là cách
xử lý một vấn đề mạng có thật.

### Tại sao cần

Trên một số mạng (đo thật trên máy chủ homelab), nhà mạng **chèn phản hồi DNS giả** cho
vài tên miền. Hỏi `api.themoviedb.org` năm lần bằng DNS thường thì ba lần trả về
`127.0.0.1`. Backend gọi vào địa chỉ đó và nhận lỗi `I/O error`, trông như mã hỏng, thực
ra là không bao giờ kết nối tới đúng nơi.

DNS-over-TLS đưa truy vấn DNS đi trong một đường mã hoá, nên nhà mạng không đọc được tên
miền để mà chèn phản hồi giả. Đổi lại, ta phải tự chạy một bộ phân giải — và đó chính là
lý do container CoreDNS tồn tại. Cấu hình trong [`Corefile`](../../Corefile):

```text
.:53 {
    forward . tls://8.8.8.8 tls://8.8.4.4 {
        tls_servername dns.google
    }

    # Dem lai cho do phai mo ket noi TLS moi lan hoi.
    cache 300

    errors
}
```

CoreDNS nhận truy vấn DNS thường ở cổng `53` từ các container khác, rồi chuyển tiếp qua
đường TLS tới `8.8.8.8` / `8.8.4.4` với tên máy chủ `dns.google`. Khối `cache 300` đệm kết
quả 300 giây để đỡ phải mở kết nối TLS mới mỗi lần hỏi.

Trong `docker-compose.yml`, container `dns` được gán địa chỉ IP tĩnh `172.29.0.53`, và
backend trỏ tới nó bằng chính IP đó (`dns: [172.29.0.53]`) — ở mức này Docker không nhận
tên dịch vụ, buộc phải ghi bằng IP.

> Lưu ý phạm vi: DNS-over-TLS chỉ chống được việc **chèn phản hồi DNS giả**. Nếu mạng còn
> chặn theo tên miền ngay trong bắt tay TLS (như trường hợp `api.themoviedb.org` trên
> homelab), thì DNS riêng không đủ — phải cho lưu lượng đi vòng ra ngoài bằng VPN hoặc
> tunnel. Đây là giới hạn của mạng, không sửa được từ trong mã nguồn.

Chi tiết triển khai, số liệu đo được và các phép kiểm mạng liên quan nằm trong tài liệu
triển khai chính, mục *Bộ phân giải tên miền riêng* của [README dự án](../../README.md).

## Luồng một request thực tế

Để thấy các tầng ăn khớp ra sao, hãy theo một lời gọi thật: người dùng mở trang chủ, cần
danh sách phim mới cập nhật từ nguồn `kkphim`.

1. **Trình duyệt** render trang chủ. Vì các trang là Server Component của Next.js, lời gọi
   dữ liệu chạy trên **máy chủ Next**, không phải trong trình duyệt — nên trình duyệt không
   gọi thẳng backend và không cần CORS cho luồng chính.
2. **Máy chủ Next** gọi backend qua địa chỉ nội bộ (`API_INTERNAL_URL`, ví dụ
   `http://backend:8080`): `GET /api/v1/movies/latest?page=1&limit=24&provider=kkphim`.
3. **`MovieController.latest(...)`** nhận request. Spring validate tham số bằng annotation
   (`@Min(1) int page`, `@Min(1) @Max(64) int limit`), dựng `MovieQuery.of(page, limit)`
   rồi gọi tầng service.
4. **`MovieService.latest("kkphim", query)`** được đánh dấu `@Cacheable` trên cache
   `movieLists` với khoá `"latest:kkphim:1:24"`. Nếu khoá đã có, kết quả trả về ngay, không
   đi tiếp bước nào.
5. Nếu cache trượt, service gọi `resolve("kkphim")`, tức
   **`ProviderRegistry.get("kkphim")`**, trả về bean `KKPhimProvider`.
6. **`KKPhimProvider.latest(query)`** dựng URL
   `/v1/api/danh-sach/phim-moi-cap-nhat?page=1&limit=24&sort_field=modified.time&sort_type=desc`
   rồi gọi qua `kkphimRestClient` (đã cài timeout 5s / 20s).
7. **Phân giải tên miền**: để mở kết nối tới `phimapi.com`, container backend hỏi DNS qua
   **CoreDNS** (`172.29.0.53`), CoreDNS chuyển tiếp bằng DNS-over-TLS và trả về địa chỉ IP
   thật, không bị chèn giả.
8. **Nguồn KKPhim** trả về JSON thô. Provider dịch mỗi phần tử sang `MovieSummary` bằng
   `toSummary(...)` (ghép ảnh với CDN, chuẩn hoá thời gian, gom thể loại/quốc gia), rồi gói
   vào `PageResponse.of(items, meta, "kkphim")`.
9. Kết quả quay ngược lên **`MovieService`**, được Caffeine ghi vào cache `movieLists` dưới
   khoá bước 4 để 5 phút tới không phải gọi lại nguồn.
10. **`MovieController`** bọc `PageResponse` vào `ApiResponse.ok(...)` và trả HTTP 200:
    `ApiResponse<PageResponse<MovieSummary>>`.
11. **Máy chủ Next** nhận JSON, render HTML trang chủ rồi trả về **trình duyệt**. Người
    dùng thấy lưới thẻ phim; nếu một tập nào đó cần chi tiết, chu trình lặp lại với endpoint
    `GET /api/v1/movies/{slug}` và cache `movieDetails`.

Nếu nguồn lỗi hoặc timeout ở bước 6–8, provider ném `UpstreamException`, `GlobalExceptionHandler`
gom về `ApiError` với `code = UPSTREAM_ERROR` và HTTP 502 — client nhận lỗi có cấu trúc
thay vì một request treo.

## Kết luận

Kiến trúc RapPhim WareHouse xoay quanh một ý tưởng: **cô lập sự khác biệt của các nguồn
vào tầng provider**, để mọi tầng phía trên chỉ làm việc với một schema DTO chung.

- Tầng web validate và bọc envelope (`ApiResponse`, `PageResponse`), không chứa nghiệp vụ.
- Tầng service chọn nguồn qua `ProviderRegistry` và đệm kết quả bằng Caffeine.
- Tầng provider — mỗi nguồn một `@Component` cài đặt `MovieProvider`, được registry tự phát
  hiện theo `type()` — là nơi duy nhất biết định dạng thật, dịch về DTO nhờ `ProviderSupport`.
- Tầng config cung cấp `RestClient` có timeout, cache, và một bộ phân giải CoreDNS
  DNS-over-TLS để vượt qua việc nhà mạng chèn phản hồi DNS giả.

Nhờ vậy, thêm một nguồn phim mới chỉ cần một lớp cài đặt `MovieProvider` và một hằng trong
`ProviderType` — controller và service không phải sửa.

Tài liệu liên quan trong bộ:

- [README dự án](../../README.md) — tổng quan, danh sách endpoint, và tài liệu triển khai
  (bao gồm mục *Bộ phân giải tên miền riêng* giải thích sâu về CoreDNS).
- [`docs/openapi.json`](../openapi.json) — đặc tả OpenAPI 3.1 sinh tự động, dùng để tra
  cứu chính xác từng endpoint và schema.
- [Từ Commit Đến Container](../ebook/README.md) — sổ tay sự cố DevOps rút từ chính nhật ký
  triển khai dự án (Git, Docker, CI/CD).
