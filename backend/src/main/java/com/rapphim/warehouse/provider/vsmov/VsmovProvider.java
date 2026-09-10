package com.rapphim.warehouse.provider.vsmov;

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
import com.rapphim.warehouse.provider.vsmov.model.VsmovModels;
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
 * Nguon VSMOV (vsmov.com).
 *
 * <p>Cung ho voi KKPhim - ten truong trong moi phim giong het - nhung KHAC vo boc va
 * duong dan: VSMOV dung {@code /api/...} tra {@code items} o goc, con KKPhim dung
 * {@code /v1/api/...} tra {@code data.items}. Vi vay khong dung lai KKPhimProvider ma
 * viet rieng.</p>
 *
 * <p>Anh la URL tuyet doi nen khong can ghep CDN. Chi tiet phim chi co {@code link_embed}
 * (khong co {@code .m3u8}) - player phat bang iframe, giong NguonC.</p>
 */
@Component
public class VsmovProvider implements MovieProvider {

    private static final Logger log = LoggerFactory.getLogger(VsmovProvider.class);

    private static final String PROVIDER_CODE = "vsmov";

    private final RestClient client;
    private final String cdnImage;

    public VsmovProvider(@Qualifier("vsmovRestClient") RestClient client, ProviderProperties properties) {
        this.client = client;
        this.cdnImage = properties.vsmov().cdnImage();
    }

    @Override
    public ProviderType type() {
        return ProviderType.VSMOV;
    }

    @Override
    public PageResponse<MovieSummary> latest(MovieQuery query) {
        return fetchList("/api/danh-sach/phim-moi-cap-nhat", query, Function.identity());
    }

    @Override
    public PageResponse<MovieSummary> listByType(ListType listType, MovieQuery query) {
        return fetchList("/api/danh-sach/" + listType.slug(), query, Function.identity());
    }

    @Override
    public PageResponse<MovieSummary> search(String keyword, MovieQuery query) {
        return fetchList("/api/tim-kiem", query, builder -> builder.queryParam("keyword", keyword));
    }

    @Override
    public PageResponse<MovieSummary> listByCategory(String categorySlug, MovieQuery query) {
        return fetchList("/api/the-loai/" + categorySlug, query, Function.identity());
    }

    @Override
    public PageResponse<MovieSummary> listByCountry(String countrySlug, MovieQuery query) {
        return fetchList("/api/quoc-gia/" + countrySlug, query, Function.identity());
    }

    @Override
    public PageResponse<MovieSummary> listByYear(int year, MovieQuery query) {
        return fetchList("/api/nam/" + year, query, Function.identity());
    }

    @Override
    public Optional<MovieDetail> findBySlug(String slug) {
        VsmovModels.DetailEnvelope envelope = call(
                builder -> builder.path("/api/phim/{slug}").build(slug),
                VsmovModels.DetailEnvelope.class);

        if (envelope == null || envelope.movie() == null) {
            return Optional.empty();
        }
        return Optional.of(toDetail(envelope, slug));
    }

    @Override
    public List<Taxonomy> categories() {
        return fetchTaxonomy("/api/the-loai");
    }

    @Override
    public List<Taxonomy> countries() {
        return fetchTaxonomy("/api/quoc-gia");
    }

    // ------------------------------------------------------------------ goi nguon

    private PageResponse<MovieSummary> fetchList(String path, MovieQuery query,
                                                 Function<UriBuilder, UriBuilder> extraParams) {
        VsmovModels.ListEnvelope response = call(builder -> {
            UriBuilder uri = builder.path(path).queryParam("page", query.page());
            return extraParams.apply(uri).build();
        }, VsmovModels.ListEnvelope.class);

        if (response == null || response.items() == null) {
            return PageResponse.empty(query.page(), query.limit(), PROVIDER_CODE);
        }

        List<MovieSummary> items = response.items().stream().map(this::toSummary).toList();
        return PageResponse.of(items, toMeta(response.pagination(), query), PROVIDER_CODE);
    }

    private List<Taxonomy> fetchTaxonomy(String path) {
        VsmovModels.TaxonomyEnvelope response = call(
                builder -> builder.path(path).build(),
                VsmovModels.TaxonomyEnvelope.class);

        if (response == null || response.data() == null) {
            return List.of();
        }
        return toTaxonomies(response.data().items());
    }

    private <T> T call(Function<UriBuilder, URI> uriFunction, Class<T> responseType) {
        try {
            return client.get()
                    .uri(uriFunction::apply)
                    .retrieve()
                    // 4xx kem body JSON: doc body de xu ly nhu du lieu rong thay vi nem loi.
                    .onStatus(HttpStatusCode::is4xxClientError, (request, response) -> {
                    })
                    .body(responseType);
        } catch (RestClientException ex) {
            log.warn("Goi VSMOV that bai: {}", ex.getMessage());
            throw UpstreamException.network(PROVIDER_CODE, "VSMOV", ex);
        }
    }

    // ------------------------------------------------------------------ chuyen doi

    private PageMeta toMeta(VsmovModels.Pagination pagination, MovieQuery query) {
        if (pagination == null) {
            return PageMeta.of(query.page(), query.limit(), 0);
        }
        int limit = pagination.totalItemsPerPage() != null && pagination.totalItemsPerPage() > 0
                ? pagination.totalItemsPerPage() : query.limit();
        int page = pagination.currentPage() != null && pagination.currentPage() > 0
                ? pagination.currentPage() : query.page();
        long total = pagination.totalItems() == null ? 0 : pagination.totalItems();
        int totalPages = pagination.totalPages() == null ? 1 : pagination.totalPages();
        return new PageMeta(page, limit, total, totalPages);
    }

    private MovieSummary toSummary(VsmovModels.Item item) {
        return new MovieSummary(
                item.id(),
                item.slug(),
                item.name(),
                item.originName(),
                ProviderSupport.absoluteImage(item.posterUrl(), cdnImage),
                ProviderSupport.absoluteImage(item.thumbUrl(), cdnImage),
                item.year(),
                null,
                null,
                null,
                null,
                null,
                List.of(),
                List.of(),
                toTmdb(item.tmdb()),
                toImdb(item.imdb()),
                PROVIDER_CODE,
                item.modified() == null ? null : ProviderSupport.normalizeInstant(item.modified().time()));
    }

    private MovieDetail toDetail(VsmovModels.DetailEnvelope envelope, String requestedSlug) {
        VsmovModels.Movie movie = envelope.movie();
        return new MovieDetail(
                movie.id() != null ? movie.id() : requestedSlug,
                movie.slug() != null ? movie.slug() : requestedSlug,
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
                PROVIDER_CODE,
                movie.modified() == null ? null : ProviderSupport.normalizeInstant(movie.modified().time()));
    }

    private List<EpisodeServer> toServers(List<VsmovModels.ServerRaw> servers) {
        return ProviderSupport.orEmpty(servers).stream()
                .map(server -> new EpisodeServer(
                        cleanServerName(server.serverName()),
                        ProviderSupport.orEmpty(server.serverData()).stream()
                                .map(ep -> new Episode(ep.name(), ep.slug(), ep.filename(),
                                        ep.linkEmbed(), ep.linkM3u8()))
                                .toList()))
                .toList();
    }

    /** VSMOV nhet xuong dong va khoang trang thut le vao ten server (vi du
     * {@code "Vietsub\r\n            #1"}); gom lai thanh mot khoang trang. */
    private String cleanServerName(String name) {
        return name == null ? null : name.replaceAll("\\s+", " ").trim();
    }

    /** Bo ten rong va cac gia tri bao "dang cap nhat". */
    private List<String> cleanNames(List<String> names) {
        return ProviderSupport.orEmpty(names).stream()
                .filter(java.util.Objects::nonNull)
                .map(String::trim)
                .filter(name -> !name.isEmpty() && !ProviderSupport.isPlaceholder(name))
                .toList();
    }

    private TmdbRef toTmdb(VsmovModels.TmdbRaw raw) {
        if (raw == null || raw.id() == null || raw.id().isBlank()) {
            return null;
        }
        return new TmdbRef(raw.id(), raw.type(), raw.season(), raw.voteAverage(), raw.voteCount());
    }

    private ImdbRef toImdb(VsmovModels.ImdbRaw raw) {
        if (raw == null || raw.id() == null || raw.id().isBlank()) {
            return null;
        }
        return new ImdbRef(raw.id(), null, null);
    }

    /** VSMOV danh muc chi co ten va slug; dung slug lam id de Taxonomy khong rong id. */
    private List<Taxonomy> toTaxonomies(List<VsmovModels.TaxonomyItem> items) {
        return ProviderSupport.orEmpty(items).stream()
                .filter(item -> item.slug() != null && !item.slug().isBlank())
                .map(item -> new Taxonomy(item.slug(), item.name(), item.slug()))
                .toList();
    }
}
