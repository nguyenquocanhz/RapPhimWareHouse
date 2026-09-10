# Hướng dẫn thêm một nguồn phim (Provider) mới

> **Tài liệu**
> **Phiên bản:** 1.0
> **Cập nhật:** 2026-09-11
> **Đối tượng đọc:** Lập trình viên backend mở rộng nguồn phim
> **Trạng thái:** Chính thức
> **Tag:** `provider`, `backend`, `spring-boot`, `huong-dan`

## Giới thiệu

Backend của RapPhim WareHouse là một **lớp trung gian**: nó gọi nhiều nguồn phim khác nhau, chuẩn hoá dữ liệu thô về **một schema DTO duy nhất**, cache lại bằng Caffeine rồi phục vụ cho frontend. Nhờ vậy frontend chỉ cần biết một dạng dữ liệu, còn việc mỗi nguồn trả JSON một kiểu là chuyện của tầng provider.

Tài liệu này hướng dẫn **từng bước thêm một nguồn phim mới ở mức mã nguồn** — nghĩa là nguồn có cấu trúc API riêng, cần một lớp Java biên dịch cùng ứng dụng. Đây là loại việc quan trọng nhất khi mở rộng kho phim, nên chúng ta đi kỹ và kèm ví dụ trích từ hai nguồn đã có: **NguonC** (`phim.nguonc.com`) và **VSMOV** (`vsmov.com`).

Có hai cách thêm nguồn, đừng nhầm lẫn:

- **Nguồn cấu hình lúc chạy** (runtime): các nguồn nói *đúng giọng KKPhim*, chỉ khác `base-url`. Quản trị viên thêm ngay trên trang quản trị, `CustomSourceService` lo phần còn lại. Không cần đụng mã nguồn.
- **Nguồn ở mức mã nguồn** (tài liệu này): nguồn có **cấu trúc phản hồi riêng** — vỏ bọc khác, tên trường khác, kiểu dữ liệu lệch — nên phải viết một lớp `MovieProvider` riêng, biên dịch cùng ứng dụng.

Xuyên suốt tài liệu, chúng ta lấy một nguồn ví dụ giả định tên **OPhim** (mã `ophim`) — một API kiểu PHP giống VSMOV/NguonC — để minh hoạ. Hãy thay `ophim`/`OPhim`/`Ophim` bằng nguồn thật của bạn.

## Các thành phần chính

Trước khi viết, cần nắm các mảnh ghép và vai trò của chúng:

| Thành phần | Đường dẫn | Vai trò |
| --- | --- | --- |
| `MovieProvider` | `provider/MovieProvider.java` | Hợp đồng chung mọi nguồn phải cài đặt. Controller chỉ làm việc qua interface này. |
| `ProviderRegistry` | `provider/ProviderRegistry.java` | Tự phát hiện mọi bean `MovieProvider` và định tuyến theo mã trên URL. |
| `ProviderType` | `dto/ProviderType.java` | Enum liệt kê các nguồn dựng sẵn kèm mã dùng trên URL. |
| `ProviderProperties` | `config/ProviderProperties.java` | Cấu hình `base-url`, CDN ảnh, timeout — đọc từ tiền tố `rapphim.provider`. |
| `RestClientConfig` | `config/RestClientConfig.java` | Tạo sẵn một `RestClient` riêng cho mỗi nguồn, kèm timeout và header mặc định. |
| `ProviderSupport` | `provider/ProviderSupport.java` | Hàm tiện ích dùng chung: `slugify`, `absoluteImage`, `normalizeInstant`, `parseInt`, `orEmpty`... |
| Model records | `provider/<nguon>/model/...` | Các record Jackson ánh xạ 1-1 với JSON thô của nguồn. |
| DTO chuẩn | `dto/MovieSummary.java`, `dto/MovieDetail.java`, `dto/Taxonomy.java` | Schema thống nhất mà mọi nguồn phải chuyển về. |

Điểm cần nhớ đầu tiên: **`ProviderRegistry` tự phát hiện nguồn**. Hãy nhìn constructor của nó:

```java
public ProviderRegistry(List<MovieProvider> discovered, @Lazy CustomSourceService customSources) {
    discovered.forEach(provider -> providers.put(provider.type(), provider));
    this.customSources = customSources;
}
```

Spring tiêm vào `discovered` **mọi** bean cài đặt `MovieProvider`, rồi registry lập chỉ mục theo `ProviderType` mà `type()` trả về. Do đó, **chỉ cần đánh dấu lớp mới bằng `@Component`** là nó tự vào registry — không có bảng đăng ký thủ công nào phải sửa.

## Trước khi bắt đầu

Hãy khảo sát nguồn mới bằng `curl` để biết chính xác hình dạng JSON: vỏ bọc nằm ở đâu (`items` ở gốc hay lồng trong `data`?), tên trường phân trang, ảnh là URL tuyệt đối hay đường dẫn tương đối, và các trường nào có thể **thiếu**. Chính những khác biệt này quyết định bộ model bạn phải viết.

```bash
# Khao sat endpoint danh sach cua nguon moi truoc khi viet model
curl -s "https://ophim.example/api/danh-sach/phim-moi-cap-nhat?page=1" | head -c 2000
```

## Bước 1 — Thêm giá trị vào enum `ProviderType`

Mở `dto/ProviderType.java` và thêm một hằng enum kèm mã dùng trên URL. Mã này chính là chuỗi client gửi lên (`?provider=ophim`).

```java
public enum ProviderType {

    /** KKPhim - phimapi.com */
    KKPHIM("kkphim"),

    /** NguonC - phim.nguonc.com */
    NGUONC("nguonc"),

    /** VSMOV - vsmov.com */
    VSMOV("vsmov"),

    /** Kho phim rieng tren homelab, doc qua ZCloud. */
    HOMELAB("homelab"),

    /** OPhim - ophim.example (nguon vi du them moi). */
    OPHIM("ophim");

    // ... phan con lai giu nguyen
}
```

Lưu ý: `ProviderType.from(String)` ném lỗi kèm danh sách mã hợp lệ được **viết cứng** trong thông báo:

```java
.orElseThrow(() -> new IllegalArgumentException(
        "Nguon '" + value + "' khong hop le. Chi chap nhan: kkphim, nguonc, vsmov, homelab"));
```

Hãy cập nhật chuỗi này để bổ sung `ophim`, nếu không thông báo lỗi sẽ lạc hậu.

Sau bước này, `ProviderRegistry.get(String)` đã định tuyến được URL có `provider=ophim`: nó duyệt `ProviderType.values()`, thấy mã khớp và trả về bean tương ứng (bean đó ta tạo ở Bước 5). Vì `type()` nằm trong enum, ta **không cần** ghi đè `code()` — mặc định `code()` trả về `type().code()`.

## Bước 2 — Khai báo cấu hình trong `ProviderProperties` và `application.yml`

`ProviderProperties` là một `record` gắn với tiền tố `rapphim.provider`. Thêm một thành phần `Endpoint` cho nguồn mới, và đặt giá trị mặc định trong compact constructor để ứng dụng vẫn chạy khi cấu hình để trống.

```java
@ConfigurationProperties(prefix = "rapphim.provider")
public record ProviderProperties(
        Endpoint kkphim,
        Endpoint nguonc,
        Endpoint vsmov,
        Endpoint ophim,          // them moi
        Duration connectTimeout,
        Duration readTimeout
) {

    public ProviderProperties {
        kkphim = kkphim == null ? new Endpoint("https://phimapi.com", "https://phimimg.com") : kkphim;
        nguonc = nguonc == null ? new Endpoint("https://phim.nguonc.com", "") : nguonc;
        vsmov = vsmov == null ? new Endpoint("https://vsmov.com", "") : vsmov;
        // Neu anh cua OPhim la URL tuyet doi thi de goc CDN trong ("").
        ophim = ophim == null ? new Endpoint("https://ophim.example", "") : ophim;
        connectTimeout = connectTimeout == null ? Duration.ofSeconds(5) : connectTimeout;
        readTimeout = readTimeout == null ? Duration.ofSeconds(20) : readTimeout;
    }

    public record Endpoint(String baseUrl, String cdnImage) {
    }
}
```

Trường `cdnImage` chỉ cần khi nguồn trả **đường dẫn ảnh tương đối** (như KKPhim). Nếu nguồn trả URL tuyệt đối (như VSMOV), để trống — `ProviderSupport.absoluteImage(...)` sẽ giữ nguyên URL đó.

Không cần khai báo `@EnableConfigurationProperties`: `WarehouseApplication` đã bật `@ConfigurationPropertiesScan`, mọi lớp `@ConfigurationProperties` được nạp tự động.

Tiếp theo, khai báo giá trị trong `application.yml` dưới `rapphim.provider`:

```yaml
rapphim:
  provider:
    connect-timeout: 5s
    read-timeout: 20s
    ophim:
      base-url: https://ophim.example
      # Anh cua OPhim la URL tuyet doi nen khong can goc CDN.
      cdn-image: ""
```

Bảng tham chiếu cấu hình:

| Khoá | Ý nghĩa | Ví dụ |
| --- | --- | --- |
| `rapphim.provider.ophim.base-url` | Gốc REST API của nguồn | `https://ophim.example` |
| `rapphim.provider.ophim.cdn-image` | Gốc CDN ảnh (để trống nếu ảnh là URL tuyệt đối) | `""` |
| `rapphim.provider.connect-timeout` | Thời gian tối đa để mở kết nối (dùng chung) | `5s` |
| `rapphim.provider.read-timeout` | Thời gian tối đa chờ một phản hồi (dùng chung) | `20s` |

> **Lưu ý cho test:** thêm một thành phần vào `ProviderProperties` sẽ làm các lời gọi constructor rút gọn trong test bị thiếu tham số. Ví dụ `VsmovProviderTest` dựng `new ProviderProperties(null, null, null, null, null)`; sau khi thêm `ophim`, phải bổ sung một `null` nữa. Trình biên dịch sẽ nhắc bạn.

## Bước 3 — Tạo các record model Jackson

Tạo gói `provider/ophim/model` và một lớp `OphimModels` gói các `record` ánh xạ **1-1** với JSON thô. Mỗi record đánh dấu `@JsonIgnoreProperties(ignoreUnknown = true)` để bỏ qua trường lạ, và dùng `@JsonProperty` khi tên JSON là `snake_case`.

> **CẢNH BÁO — API kiểu PHP có thể trả `{}` (object rỗng) cho trường thiếu.** Đây là bài học thật từ VSMOV: trường `poster_url`/`thumb_url` từng được khai báo là `String`, nhưng nguồn trả về `{}` khi thiếu ảnh. Jackson gặp object ở nơi mong đợi chuỗi liền ném `MismatchedInputException` và **làm hỏng cả phản hồi**. Cách xử lý: khai báo kiểu **`Object`** cho các trường có nguy cơ này, rồi ép về chuỗi bằng một helper chỉ nhận khi *thực sự là chuỗi*. **Không dùng `String`.**

Trích chính model của VSMOV — chú thích ngay trên trường ghi rõ vì sao:

```java
@JsonIgnoreProperties(ignoreUnknown = true)
public record Item(
        @JsonProperty("_id") String id,
        String name,
        String slug,
        @JsonProperty("origin_name") String originName,
        // VSMOV tra {} (object rong) cho anh thieu thay vi chuoi/null - de Object roi
        // loc trong provider, neu de String se vo khi gap {}.
        @JsonProperty("poster_url") Object posterUrl,
        @JsonProperty("thumb_url") Object thumbUrl,
        Integer year,
        TmdbRaw tmdb,
        ImdbRaw imdb,
        Modified modified) {
}
```

Áp dụng đúng khuôn cho nguồn mới. Khai báo vỏ bọc danh sách, phân trang, chi tiết và các khối con. Ví dụ khung `OphimModels`:

```java
public final class OphimModels {

    private OphimModels() {
    }

    /** Vo boc danh sach. Bo qua truong khong dung (status, pathImage...). */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ListEnvelope(List<Item> items, Pagination pagination) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Pagination(Integer totalItems, Integer totalItemsPerPage,
                             Integer currentPage, Integer totalPages) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Item(
            @JsonProperty("_id") String id,
            String name,
            String slug,
            @JsonProperty("origin_name") String originName,
            // Truong anh CO THE la {} - khai bao Object, ep chuoi trong provider.
            @JsonProperty("poster_url") Object posterUrl,
            @JsonProperty("thumb_url") Object thumbUrl,
            Integer year) {
    }

    /** Vo boc chi tiet: mot phim + danh sach server phat. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DetailEnvelope(Movie movie, List<ServerRaw> episodes) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Movie(
            @JsonProperty("_id") String id,
            String name,
            String slug,
            @JsonProperty("origin_name") String originName,
            String content,
            @JsonProperty("poster_url") Object posterUrl,
            @JsonProperty("thumb_url") Object thumbUrl,
            Integer year,
            String type,
            String status,
            @JsonProperty("episode_current") String episodeCurrent,
            List<TaxonomyItem> category,
            List<TaxonomyItem> country) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ServerRaw(
            @JsonProperty("server_name") String serverName,
            @JsonProperty("server_data") List<EpisodeRaw> serverData) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EpisodeRaw(
            String name,
            String slug,
            @JsonProperty("link_embed") String linkEmbed,
            @JsonProperty("link_m3u8") String linkM3u8) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TaxonomyItem(String name, String slug) {
    }
}
```

Nếu nguồn gom phân loại theo *kiểu NguonC* (một `Map` khoá bằng số thứ tự, mỗi phần tử có `group` + `list`) thì mô phỏng `NguonCModels.CategoryGroup`/`GroupInfo` thay cho `List<TaxonomyItem>`. Luôn để bộ model **nội bộ** trong tầng provider, không để lộ ra REST API.

## Bước 4 — Tạo `RestClient` bean trong `RestClientConfig`

Mỗi nguồn có một `RestClient` riêng, chia sẻ chung một `ClientHttpRequestFactory` đã đặt timeout. Thêm một `@Bean` cho nguồn mới, tái dùng helper `baseClient(...)` sẵn có:

```java
@Bean
public RestClient ophimRestClient(RestClient.Builder builder, ClientHttpRequestFactory factory) {
    return baseClient(builder, factory, properties.ophim().baseUrl());
}
```

`baseClient(...)` đã gắn `base-url`, `User-Agent` và `Accept: application/json`:

```java
private RestClient baseClient(RestClient.Builder builder, ClientHttpRequestFactory factory, String baseUrl) {
    return builder.clone()
            .requestFactory(factory)
            .baseUrl(baseUrl)
            .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
            .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
            .build();
}
```

Không cần sửa constructor của `RestClientConfig`: nó đã nhận sẵn `ProviderProperties`, và `properties.ophim()` là thành phần ta vừa thêm ở Bước 2.

> **Lưu ý Spring 7 (đi kèm Spring Boot 4):** từ Spring Framework 7, `HttpHeaders` **không còn `implements Map<String, List<String>>`**. Đoạn `baseClient` trên vẫn an toàn vì `HttpHeaders.USER_AGENT`/`HttpHeaders.ACCEPT` chỉ là các hằng `String` tên header. Nhưng nếu bạn viết interceptor để nhào nặn header, hãy dùng chính API của `HttpHeaders` (`set`, `add`, `forEach`, `headerNames()`) — **đừng** gọi các phương thức của `Map` như `get(key)`, `entrySet()`, `putAll()`; chúng không còn nữa và sẽ không biên dịch.

## Bước 5 — Cài đặt `MovieProvider`

Đây là phần lõi: đọc JSON từ nguồn, **map sang DTO chuẩn**. Tạo lớp `OphimProvider` đánh dấu `@Component`, tiêm `RestClient` bằng `@Qualifier` đúng tên bean ở Bước 4, và trả `ProviderType.OPHIM` ở `type()`.

Hợp đồng cần cài đặt (từ `MovieProvider`):

| Phương thức | Trả về | Ví dụ endpoint (mô phỏng VSMOV) |
| --- | --- | --- |
| `type()` | `ProviderType` | — |
| `latest(query)` | `PageResponse<MovieSummary>` | `/api/danh-sach/phim-moi-cap-nhat` |
| `listByType(listType, query)` | `PageResponse<MovieSummary>` | `/api/danh-sach/{slug}` |
| `search(keyword, query)` | `PageResponse<MovieSummary>` | `/api/tim-kiem?keyword=` |
| `listByCategory(slug, query)` | `PageResponse<MovieSummary>` | `/api/the-loai/{slug}` |
| `listByCountry(slug, query)` | `PageResponse<MovieSummary>` | `/api/quoc-gia/{slug}` |
| `listByYear(year, query)` | `PageResponse<MovieSummary>` | `/api/nam/{year}` |
| `findBySlug(slug)` | `Optional<MovieDetail>` | `/api/phim/{slug}` |
| `categories()` | `List<Taxonomy>` | `/api/the-loai` |
| `countries()` | `List<Taxonomy>` | `/api/quoc-gia` |

Khung lớp provider và các endpoint (trích lược, mô phỏng `VsmovProvider`):

```java
@Component
public class OphimProvider implements MovieProvider {

    private static final Logger log = LoggerFactory.getLogger(OphimProvider.class);
    private static final String PROVIDER_CODE = "ophim";

    private final RestClient client;
    private final String cdnImage;

    public OphimProvider(@Qualifier("ophimRestClient") RestClient client, ProviderProperties properties) {
        this.client = client;
        this.cdnImage = properties.ophim().cdnImage();
    }

    @Override
    public ProviderType type() {
        return ProviderType.OPHIM;
    }

    @Override
    public PageResponse<MovieSummary> latest(MovieQuery query) {
        return fetchList("/api/danh-sach/phim-moi-cap-nhat", query, Function.identity());
    }

    @Override
    public PageResponse<MovieSummary> search(String keyword, MovieQuery query) {
        return fetchList("/api/tim-kiem", query, builder -> builder.queryParam("keyword", keyword));
    }

    @Override
    public Optional<MovieDetail> findBySlug(String slug) {
        OphimModels.DetailEnvelope envelope = call(
                builder -> builder.path("/api/phim/{slug}").build(slug),
                OphimModels.DetailEnvelope.class);
        if (envelope == null || envelope.movie() == null) {
            return Optional.empty();
        }
        return Optional.of(toDetail(envelope, slug));
    }

    // ... listByType / listByCategory / listByCountry / listByYear / categories / countries
}
```

Phần đọc danh sách gom vào một hàm `fetchList` dùng chung — trả `PageResponse.empty(...)` khi nguồn không có `items`, tránh `NullPointerException`:

```java
private PageResponse<MovieSummary> fetchList(String path, MovieQuery query,
                                             Function<UriBuilder, UriBuilder> extraParams) {
    OphimModels.ListEnvelope response = call(builder -> {
        UriBuilder uri = builder.path(path).queryParam("page", query.page());
        return extraParams.apply(uri).build();
    }, OphimModels.ListEnvelope.class);

    if (response == null || response.items() == null) {
        return PageResponse.empty(query.page(), query.limit(), PROVIDER_CODE);
    }

    List<MovieSummary> items = response.items().stream().map(this::toSummary).toList();
    return PageResponse.of(items, toMeta(response.pagination(), query), PROVIDER_CODE);
}
```

Bước **map sang DTO** là nơi bài học `{}` phát huy tác dụng. Dùng helper `asUrl(...)` (trích nguyên từ VSMOV) để **chỉ nhận khi là chuỗi thật**, rồi mới ghép CDN qua `ProviderSupport.absoluteImage`:

```java
/** OPhim doi khi tra {} (object rong) cho anh thieu; chi nhan khi la chuoi that. */
private static String asUrl(Object value) {
    return value instanceof String url && !url.isBlank() ? url : null;
}

private MovieSummary toSummary(OphimModels.Item item) {
    // Thu tu tham so trung khop record MovieSummary; truong nguon khong co -> null hoac List.of().
    return new MovieSummary(
            item.id(),
            item.slug(),
            item.name(),
            item.originName(),
            ProviderSupport.absoluteImage(asUrl(item.posterUrl()), cdnImage),
            ProviderSupport.absoluteImage(asUrl(item.thumbUrl()), cdnImage),
            item.year(),
            null,            // type
            null,            // quality
            null,            // lang
            null,            // time
            null,            // episodeCurrent
            List.of(),       // categories
            List.of(),       // countries
            null,            // tmdb
            null,            // imdb
            PROVIDER_CODE,
            null);           // modifiedAt
}
```

Với chi tiết phim, dựng `MovieDetail` theo đúng thứ tự 24 trường của record. Danh sách server/tập dùng `EpisodeServer` + `Episode(name, slug, filename, linkEmbed, linkM3u8)`; nếu nguồn chỉ có link embed (như NguonC/VSMOV) thì để `linkM3u8` là `null`:

```java
private List<EpisodeServer> toServers(List<OphimModels.ServerRaw> servers) {
    return ProviderSupport.orEmpty(servers).stream()
            .map(server -> new EpisodeServer(
                    server.serverName(),
                    ProviderSupport.orEmpty(server.serverData()).stream()
                            .map(ep -> new Episode(ep.name(), ep.slug(), null,
                                    ep.linkEmbed(), ep.linkM3u8()))
                            .toList()))
            .toList();
}

private List<Taxonomy> toTaxonomies(List<OphimModels.TaxonomyItem> items) {
    // Nguon nay khong co id chuoi cho phan loai -> dung slug lam ca id (giong VSMOV).
    return ProviderSupport.orEmpty(items).stream()
            .filter(item -> item.slug() != null && !item.slug().isBlank())
            .map(item -> new Taxonomy(item.slug(), item.name(), item.slug()))
            .toList();
}
```

Tận dụng `ProviderSupport`: `slugify` (sinh slug từ tên tiếng Việt khi nguồn không trả slug), `normalizeInstant` (chuẩn hoá thời gian ISO-8601), `parseInt`, `splitCsv`, `isPlaceholder` (loại các giá trị "đang cập nhật"). Đừng viết lại các hàm này.

Ngay khi lớp có `@Component`, `ProviderRegistry` sẽ tự nạp — **không cần đăng ký thủ công**.

## Bước 6 — Thêm retry cho lỗi mạng chớp nhoáng

Nguồn nằm sau Cloudflare (như VSMOV) thi thoảng bị ngắt ngang giữa chừng ngay sau khi container khởi động lại. Bọc lời gọi trong một vòng thử lại có backoff tăng dần, theo đúng khuôn mẫu của `VsmovProvider` (và `JikanClient`):

```java
// Nguon nam sau Cloudflare nen thi thoang bi ngat ngang ("Request cancelled")
// ngay sau khi container khoi dong lai. Thu lai vai lan de nuot cac cu chop nhoang nay.
private static final int NETWORK_ATTEMPTS = 3;
private static final long NETWORK_BACKOFF_MS = 200;

private <T> T call(Function<UriBuilder, URI> uriFunction, Class<T> responseType) {
    UpstreamException last = null;
    for (int attempt = 1; attempt <= NETWORK_ATTEMPTS; attempt++) {
        try {
            return client.get()
                    .uri(uriFunction::apply)
                    .retrieve()
                    // 4xx kem body JSON: doc body de xu ly nhu du lieu rong thay vi nem loi.
                    .onStatus(HttpStatusCode::is4xxClientError, (request, response) -> {
                    })
                    .body(responseType);
        } catch (RestClientException ex) {
            last = UpstreamException.network(PROVIDER_CODE, "OPhim", ex);
            log.debug("OPhim loi mang lan {}/{}: {}", attempt, NETWORK_ATTEMPTS, ex.getMessage());
            if (attempt == NETWORK_ATTEMPTS || !pause(attempt)) {
                log.warn("Goi OPhim that bai sau {} lan: {}", attempt, ex.getMessage());
                throw last;
            }
        }
    }
    throw last;
}

/** Nghi giua hai lan thu, dan dan lau hon. Tra false neu luong bi ngat de dung thu ngay. */
private boolean pause(int attempt) {
    try {
        Thread.sleep(NETWORK_BACKOFF_MS * attempt);
        return true;
    } catch (InterruptedException interrupted) {
        Thread.currentThread().interrupt();
        return false;
    }
}
```

Nguyên tắc thử lại — đừng thử lại mù quáng:

| Loại lỗi | Thử lại? | Vì sao |
| --- | --- | --- |
| Lỗi mạng (`RestClientException`, kết nối rớt) | Có | Cú chớp nhoáng, làm lại thường ăn. |
| `5xx` (máy chủ nguồn quá tải) | Có (như `JikanClient`) | Endpoint nặng hay trả `504` tạm thời. |
| `404` | Không — trả `Optional.empty()` / danh sách rỗng | Đơn giản là không có dữ liệu. |
| `429` (bị giới hạn) | **Không** | Thử lại chỉ càng bị siết. |

Xử lý `4xx` kèm body JSON bằng `onStatus(...)` để coi như dữ liệu rỗng thay vì ném lỗi, đúng như NguonC/VSMOV đang làm.

## Bước 7 — Viết test cho provider mới

Kiểm thử tập trung vào **ánh xạ JSON → DTO**, dùng `MockRestServiceServer` để giả nguồn. Lấy fixture cắt từ phản hồi thật của nguồn để bắt được đúng những chỗ dễ sai. Bám theo `VsmovProviderTest`:

```java
class OphimProviderTest {

    private OphimProvider providerWith(MockRestServiceServer[] holder) {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://ophim.example");
        holder[0] = MockRestServiceServer.bindTo(builder).build();
        // Constructor rut gon cua ProviderProperties tu dien mac dinh (gom ophim).
        ProviderProperties props = new ProviderProperties(null, null, null, null, null, null);
        return new OphimProvider(builder.build(), props);
    }

    @Test
    @DisplayName("Anh tra ve {} (object rong): map thanh null, khong vo")
    void toleratesEmptyObjectPoster() {
        MockRestServiceServer[] server = new MockRestServiceServer[1];
        OphimProvider provider = providerWith(server);

        String json = """
                {"items":[
                  {"_id":1,"name":"A","slug":"a","poster_url":{},
                   "thumb_url":"https://ophim.example/t.jpg","year":2026}],
                 "pagination":{"totalItems":1,"totalItemsPerPage":24,"currentPage":1,"totalPages":1}}
                """;
        server[0].expect(requestTo(org.hamcrest.Matchers.startsWith(
                        "https://ophim.example/api/danh-sach/phim-moi-cap-nhat")))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        PageResponse<MovieSummary> page = provider.latest(MovieQuery.of(1, 24));

        assertThat(page.items()).hasSize(1);
        assertThat(page.items().get(0).posterUrl()).isNull();
        assertThat(page.items().get(0).thumbUrl()).isEqualTo("https://ophim.example/t.jpg");
    }
}
```

Bộ test tối thiểu nên bao gồm:

- `type()` và `code()` trả đúng mã.
- **Ảnh `{}` → `null`, không vỡ** (bài học VSMOV — bắt buộc có).
- `latest`/`search` map đúng danh sách và phân trang, gắn đúng tham số `keyword`/`page`.
- `findBySlug` parse chi tiết, dựng đúng server/tập.
- `findBySlug` gặp `404` trả `Optional.empty()`, không ném lỗi.
- `categories()`/`countries()` đọc đúng danh mục.

Chạy test:

```bash
cd backend
./mvnw test -Dtest=OphimProviderTest
```

## Kết luận

Thêm một nguồn phim ở mức mã nguồn là chuỗi bảy bước có trật tự. Danh sách kiểm tra nhanh:

- [ ] **Bước 1** — Thêm hằng vào `ProviderType` (kèm mã URL) và cập nhật thông báo lỗi trong `from(...)`.
- [ ] **Bước 2** — Thêm `Endpoint` vào `ProviderProperties` (kèm mặc định) và khai báo trong `application.yml`.
- [ ] **Bước 3** — Viết record model Jackson `@JsonIgnoreProperties(ignoreUnknown = true)`; trường ảnh có nguy cơ để **`Object`**, không dùng `String`.
- [ ] **Bước 4** — Tạo `RestClient` bean trong `RestClientConfig`; nhớ Spring 7 `HttpHeaders` không còn là `Map`.
- [ ] **Bước 5** — Cài đặt `MovieProvider` (`@Component`), map sang `MovieSummary`/`MovieDetail`; ép ảnh qua `asUrl(...)`.
- [ ] **Bước 6** — Bọc lời gọi trong vòng retry backoff cho lỗi mạng / `5xx`; **không** thử lại `404`/`429`.
- [ ] **Bước 7** — Viết test `MockRestServiceServer`, bắt buộc có ca ảnh `{}` và ca `404`.
- [ ] Cập nhật constructor `ProviderProperties(null, ...)` trong các test hiện có cho khớp số tham số mới.

Nhờ `ProviderRegistry` tự phát hiện bean, **không có bảng đăng ký thủ công** nào phải sửa — đánh dấu `@Component` là đủ.

Tài liệu và mã nguồn liên quan trong bộ:

- Mẫu tham chiếu: `backend/src/main/java/com/rapphim/warehouse/provider/vsmov/VsmovProvider.java` và `provider/nguonc/NguonCProvider.java`.
- Khuôn retry nâng cao (có xử lý `5xx`/`429`): `provider/jikan/JikanClient.java`.
- Hàm tiện ích dùng chung: `provider/ProviderSupport.java`.
- Sổ tay xử lý sự cố DevOps khi triển khai: [`../ebook/van-khan-deploy.md`](../ebook/van-khan-deploy.md).
