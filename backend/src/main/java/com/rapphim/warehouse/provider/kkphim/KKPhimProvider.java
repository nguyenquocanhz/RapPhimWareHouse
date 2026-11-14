package com.rapphim.warehouse.provider.kkphim;

import com.rapphim.warehouse.common.PageMeta;
import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.config.ProviderProperties;
import com.rapphim.warehouse.dto.Episode;
import com.rapphim.warehouse.dto.EpisodeServer;
import com.rapphim.warehouse.dto.ImdbRef;
import com.rapphim.warehouse.dto.ListType;
import com.rapphim.warehouse.dto.MovieDetail;
import com.rapphim.warehouse.dto.MovieQuery;
import com.rapphim.warehouse.dto.MovieSummary;
import com.rapphim.warehouse.dto.ProviderType;
import com.rapphim.warehouse.dto.Taxonomy;
import com.rapphim.warehouse.dto.TmdbRef;
import com.rapphim.warehouse.exception.UpstreamException;
import com.rapphim.warehouse.provider.MovieProvider;
import com.rapphim.warehouse.provider.ProviderSupport;
import com.rapphim.warehouse.provider.kkphim.model.KKPhimModels;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriBuilder;

import java.net.URI;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;

/**
 * Cai dat {@link MovieProvider} cho nguon KKPhim (phimapi.com).
 *
 * <p>Moi truy van danh sach deu dung nhom endpoint {@code /v1/api/...} vi nhom nay
 * ho tro tham so {@code limit}, loc theo the loai / quoc gia / nam va tra ve goc CDN anh.
 * Rieng chi tiet phim dung {@code /phim/...} vi chi endpoint do co day du danh sach tap.</p>
 */
@Component
public class KKPhimProvider implements MovieProvider {

    private static final Logger log = LoggerFactory.getLogger(KKPhimProvider.class);

    /** Phim moi - endpoint cu, ton trong limit. */
    static final String LATEST_PATH = "/v1/api/danh-sach/phim-moi-cap-nhat";

    /** Phim moi - endpoint moi theo tai lieu, nhung bo qua limit. Chi dung khi cu tra 404. */
    static final String LATEST_FALLBACK_PATH = "/v1/api/danh-sach";

    /** So phim/trang co dinh cua endpoint du phong (do that 2026-11). */
    static final int FALLBACK_PAGE_SIZE = 24;
    private static final String PROVIDER_CODE = "kkphim";

    private final RestClient client;
    private final String cdnImage;

    /** Ma bao ra ngoai. Nguon do nguoi dung them dung ma rieng cua no. */
    private final String code;

    // Co hai constructor nen phai chi ro cai nao danh cho Spring, neu khong no khong
    // biet chon cai nao va bo cuoc.
    @org.springframework.beans.factory.annotation.Autowired
    public KKPhimProvider(@Qualifier("kkphimRestClient") RestClient client, ProviderProperties properties) {
        this(client, properties.kkphim().cdnImage(), PROVIDER_CODE);
    }

    /**
     * Dung lai chinh cach doc nay cho mot nguon khac.
     *
     * <p>Rat nhieu trang phim Viet dung chung dinh dang API cua KKPhim, chi khac ten
     * mien. Voi nhung trang do thi khong can viet lai gi, chi can tro sang dia chi khac.</p>
     */
    public KKPhimProvider(RestClient client, String cdnImage, String code) {
        this.client = client;
        this.cdnImage = cdnImage;
        this.code = code;
    }

    @Override
    public String code() {
        return code;
    }

    @Override
    public ProviderType type() {
        return ProviderType.KKPHIM;
    }

    /**
     * Phim moi: goi endpoint cu truoc, endpoint moi chi la du phong.
     *
     * <p>Tai lieu KKPhim moi chi ghi "Phim moi" v1 la {@code /v1/api/danh-sach} (khong
     * slug) va da bo {@code phim-moi-cap-nhat} khoi danh sach type, nen endpoint cu co
     * the bi go. Nhung endpoint moi BO QUA {@code limit} (luon tra co dinh 24 phim/trang,
     * da do that), con endpoint cu van chay va ton trong {@code limit}. Nen: dung endpoint
     * cu; chi khi no tra 404 (KKPhim tra 404 cho duong dan khong ton tai, con trang vuot
     * qua so trang van la 200) moi chuyen sang endpoint moi va tu cat cho dung limit.</p>
     */
    @Override
    public PageResponse<MovieSummary> latest(MovieQuery query) {
        try {
            return fetchList(LATEST_PATH, query, Function.identity(), true);
        } catch (EndpointGoneException gone) {
            log.warn("KKPhim tra 404 cho {}, chuyen sang {}", LATEST_PATH, LATEST_FALLBACK_PATH);
            return latestFromFallback(query);
        }
    }

    /**
     * Doc endpoint du phong (co dinh N phim/trang) roi cat lai cho dung trang + limit
     * nguoi goi xin. Khong chi cat dau trang: trang 2 voi limit 12 la phim 13-24, nam
     * trong trang 1 cua nguon chu khong phai trang 2.
     */
    private PageResponse<MovieSummary> latestFromFallback(MovieQuery query) {
        long start = (long) (query.page() - 1) * query.limit();
        long end = start + query.limit();

        KKPhimModels.V1Envelope first = fetchFallbackPage(1 + (int) (start / FALLBACK_PAGE_SIZE));
        int upstreamSize = upstreamPageSize(first);
        int firstPage = 1 + (int) (start / upstreamSize);
        int lastPage = 1 + (int) ((end - 1) / upstreamSize);

        java.util.ArrayList<MovieSummary> collected = new java.util.ArrayList<>();
        long totalItems = 0;
        for (int upstreamPage = firstPage; upstreamPage <= lastPage; upstreamPage++) {
            // Trang dau da tai san neu nguon dung co dinh FALLBACK_PAGE_SIZE nhu da do.
            KKPhimModels.V1Envelope envelope =
                    (upstreamPage == 1 + (int) (start / FALLBACK_PAGE_SIZE))
                            ? first : fetchFallbackPage(upstreamPage);
            if (envelope == null || envelope.data() == null) {
                break;
            }
            KKPhimModels.V1Envelope.V1Data data = envelope.data();
            if (data.params() != null && data.params().pagination() != null) {
                totalItems = Math.max(totalItems, data.params().pagination().totalItems());
            }
            String cdn = (data.cdnImage() == null || data.cdnImage().isBlank()) ? cdnImage : data.cdnImage();
            List<MovieSummary> items = ProviderSupport.orEmpty(data.items()).stream()
                    .map(item -> toSummary(item, cdn))
                    .toList();
            if (items.isEmpty()) {
                break;
            }
            collected.addAll(items);
        }

        int skip = (int) (start - (long) (firstPage - 1) * upstreamSize);
        List<MovieSummary> page = collected.stream().skip(skip).limit(query.limit()).toList();
        return PageResponse.of(page, PageMeta.of(query.page(), query.limit(), totalItems), code);
    }

    private KKPhimModels.V1Envelope fetchFallbackPage(int upstreamPage) {
        return call(builder -> builder.path(LATEST_FALLBACK_PATH)
                        .queryParam("page", upstreamPage)
                        .build(),
                KKPhimModels.V1Envelope.class, false);
    }

    private static int upstreamPageSize(KKPhimModels.V1Envelope envelope) {
        if (envelope != null && envelope.data() != null && envelope.data().params() != null
                && envelope.data().params().pagination() != null
                && envelope.data().params().pagination().totalItemsPerPage() > 0) {
            return envelope.data().params().pagination().totalItemsPerPage();
        }
        return FALLBACK_PAGE_SIZE;
    }

    @Override
    public PageResponse<MovieSummary> listByType(ListType listType, MovieQuery query) {
        if (listType == ListType.DANG_CHIEU) {
            throw new IllegalArgumentException(
                    "Nguon 'kkphim' khong co danh sach 'dang-chieu'. Nhom nay chi co tren nguon 'nguonc'.");
        }
        return fetchList("/v1/api/danh-sach/" + listType.slug(), query);
    }

    @Override
    public PageResponse<MovieSummary> search(String keyword, MovieQuery query) {
        return fetchList("/v1/api/tim-kiem", query, builder -> builder.queryParam("keyword", keyword));
    }

    @Override
    public PageResponse<MovieSummary> listByCategory(String categorySlug, MovieQuery query) {
        return fetchList("/v1/api/the-loai/" + categorySlug, query);
    }

    @Override
    public PageResponse<MovieSummary> listByCountry(String countrySlug, MovieQuery query) {
        return fetchList("/v1/api/quoc-gia/" + countrySlug, query);
    }

    @Override
    public PageResponse<MovieSummary> listByYear(int year, MovieQuery query) {
        return fetchList("/v1/api/nam/" + year, query);
    }

    @Override
    public Optional<MovieDetail> findBySlug(String slug) {
        KKPhimModels.DetailEnvelope response = call(
                builder -> builder.path("/phim/{slug}").build(slug),
                KKPhimModels.DetailEnvelope.class);

        if (response == null || !KKPhimModels.isOk(response.status()) || response.movie() == null) {
            return Optional.empty();
        }
        return Optional.of(toDetail(response));
    }

    @Override
    public List<Taxonomy> categories() {
        return fetchTaxonomy("/the-loai");
    }

    @Override
    public List<Taxonomy> countries() {
        return fetchTaxonomy("/quoc-gia");
    }

    // ------------------------------------------------------------------ goi nguon

    private PageResponse<MovieSummary> fetchList(String path, MovieQuery query) {
        return fetchList(path, query, Function.identity());
    }

    private PageResponse<MovieSummary> fetchList(String path, MovieQuery query,
                                                 Function<UriBuilder, UriBuilder> extraParams) {
        return fetchList(path, query, extraParams, false);
    }

    /**
     * @param notFoundIsGone {@code true} thi 404 nem {@link EndpointGoneException} thay vi
     *                       doc body nhu du lieu rong - de ham goi biet duong chuyen nguon.
     */
    private PageResponse<MovieSummary> fetchList(String path, MovieQuery query,
                                                 Function<UriBuilder, UriBuilder> extraParams,
                                                 boolean notFoundIsGone) {
        KKPhimModels.V1Envelope response = call(builder -> {
            UriBuilder uri = builder.path(path)
                    .queryParam("page", query.page())
                    .queryParam("limit", query.limit())
                    .queryParam("sort_field", query.sortField())
                    .queryParam("sort_type", query.sortType());
            if (query.category() != null) {
                uri = uri.queryParam("category", query.category());
            }
            if (query.country() != null) {
                uri = uri.queryParam("country", query.country());
            }
            if (query.year() != null) {
                uri = uri.queryParam("year", query.year());
            }
            return extraParams.apply(uri).build();
        }, KKPhimModels.V1Envelope.class, notFoundIsGone);

        if (response == null || response.data() == null) {
            return PageResponse.empty(query.page(), query.limit(), code);
        }

        KKPhimModels.V1Envelope.V1Data data = response.data();
        String cdn = (data.cdnImage() == null || data.cdnImage().isBlank()) ? cdnImage : data.cdnImage();

        List<MovieSummary> items = ProviderSupport.orEmpty(data.items()).stream()
                .map(item -> toSummary(item, cdn))
                .toList();

        PageMeta meta = toMeta(data.params() == null ? null : data.params().pagination(), query);
        return PageResponse.of(items, meta, code);
    }

    private List<Taxonomy> fetchTaxonomy(String path) {
        KKPhimModels.TaxonomyEnvelope response = call(
                builder -> builder.path(path).build(),
                KKPhimModels.TaxonomyEnvelope.class);

        if (response == null || response.data() == null) {
            return List.of();
        }
        return toTaxonomies(response.data().items());
    }

    private <T> T call(Function<UriBuilder, URI> uriFunction, Class<T> responseType) {
        return call(uriFunction, responseType, false);
    }

    private <T> T call(Function<UriBuilder, URI> uriFunction, Class<T> responseType, boolean notFoundIsGone) {
        try {
            return client.get()
                    .uri(uriFunction::apply)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (request, response) -> {
                        if (notFoundIsGone && response.getStatusCode().value() == 404) {
                            throw new EndpointGoneException();
                        }
                        // KKPhim tra 404 kem body JSON khi khong tim thay - doc body de xu ly nhu du lieu rong.
                    })
                    .body(responseType);
        } catch (EndpointGoneException ex) {
            throw ex;
        } catch (RestClientException ex) {
            log.warn("Goi KKPhim that bai: {}", ex.getMessage());
            throw new UpstreamException(code,
                    "Khong lay duoc du lieu tu KKPhim: " + ex.getMessage(), ex);
        }
    }

    // ------------------------------------------------------------------ chuyen doi

    private PageMeta toMeta(KKPhimModels.Pagination pagination, MovieQuery query) {
        if (pagination == null) {
            return PageMeta.of(query.page(), query.limit(), 0);
        }
        int limit = pagination.totalItemsPerPage() > 0 ? pagination.totalItemsPerPage() : query.limit();
        int page = pagination.currentPage() > 0 ? pagination.currentPage() : query.page();
        return new PageMeta(page, limit, pagination.totalItems(), pagination.totalPages());
    }

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

    private MovieDetail toDetail(KKPhimModels.DetailEnvelope envelope) {
        KKPhimModels.Movie movie = envelope.movie();
        return new MovieDetail(
                movie.id(),
                movie.slug(),
                movie.name(),
                movie.originName(),
                movie.content(),
                ProviderSupport.absoluteImage(movie.posterUrl(), cdnImage),
                ProviderSupport.absoluteImage(movie.thumbUrl(), cdnImage),
                movie.trailerUrl(),
                movie.year(),
                movie.type(),
                movie.status(),
                movie.quality(),
                movie.lang(),
                movie.time(),
                movie.episodeCurrent(),
                movie.episodeTotal() == null ? null : String.valueOf(movie.episodeTotal()),
                cleanNames(movie.actor()),
                cleanNames(movie.director()),
                toTaxonomies(movie.category()),
                toTaxonomies(movie.country()),
                toServers(envelope.episodes()),
                toTmdb(movie.tmdb()),
                toImdb(movie.imdb()),
                code,
                movie.modified() == null ? null : ProviderSupport.normalizeInstant(movie.modified().time()));
    }

    private List<EpisodeServer> toServers(List<KKPhimModels.ServerRaw> servers) {
        return ProviderSupport.orEmpty(servers).stream()
                .map(server -> new EpisodeServer(
                        server.serverName(),
                        ProviderSupport.orEmpty(server.serverData()).stream()
                                .map(ep -> new Episode(ep.name(), ep.slug(), ep.filename(),
                                        ep.linkEmbed(), ep.linkM3u8()))
                                .toList()))
                .toList();
    }

    private TmdbRef toTmdb(KKPhimModels.TmdbRaw raw) {
        if (raw == null || raw.id() == null || raw.id().isBlank()) {
            return null;
        }
        return new TmdbRef(raw.id(), raw.type(), raw.season(), raw.voteAverage(), raw.voteCount());
    }

    private ImdbRef toImdb(KKPhimModels.ImdbRaw raw) {
        if (raw == null || raw.id() == null || raw.id().isBlank()) {
            return null;
        }
        return new ImdbRef(raw.id(), raw.voteAverage(), raw.voteCount());
    }

    private List<Taxonomy> toTaxonomies(List<KKPhimModels.TaxonomyItem> items) {
        return ProviderSupport.orEmpty(items).stream()
                .map(item -> new Taxonomy(item.resolvedId(), item.name(), item.slug()))
                .toList();
    }

    private List<String> cleanNames(List<String> names) {
        return ProviderSupport.orEmpty(names).stream()
                .filter(java.util.Objects::nonNull)
                .map(String::trim)
                .filter(name -> !name.isEmpty() && !ProviderSupport.isPlaceholder(name))
                .toList();
    }

    /** Dau hieu noi bo: endpoint tra 404, tuc la duong dan khong con ton tai. */
    static final class EndpointGoneException extends RuntimeException {
        EndpointGoneException() {
            super(null, null, false, false);
        }
    }
}
