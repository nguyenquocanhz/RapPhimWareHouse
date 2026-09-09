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
    private static final String PROVIDER_CODE = "kkphim";

    private final RestClient client;
    private final String cdnImage;

    public KKPhimProvider(@Qualifier("kkphimRestClient") RestClient client, ProviderProperties properties) {
        this.client = client;
        this.cdnImage = properties.kkphim().cdnImage();
    }

    @Override
    public ProviderType type() {
        return ProviderType.KKPHIM;
    }

    @Override
    public PageResponse<MovieSummary> latest(MovieQuery query) {
        return fetchList("/v1/api/danh-sach/phim-moi-cap-nhat", query);
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
        }, KKPhimModels.V1Envelope.class);

        if (response == null || response.data() == null) {
            return PageResponse.empty(query.page(), query.limit(), PROVIDER_CODE);
        }

        KKPhimModels.V1Envelope.V1Data data = response.data();
        String cdn = (data.cdnImage() == null || data.cdnImage().isBlank()) ? cdnImage : data.cdnImage();

        List<MovieSummary> items = ProviderSupport.orEmpty(data.items()).stream()
                .map(item -> toSummary(item, cdn))
                .toList();

        PageMeta meta = toMeta(data.params() == null ? null : data.params().pagination(), query);
        return PageResponse.of(items, meta, PROVIDER_CODE);
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
        try {
            return client.get()
                    .uri(uriFunction::apply)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (request, response) -> {
                        // KKPhim tra 404 kem body JSON khi khong tim thay - doc body de xu ly nhu du lieu rong.
                    })
                    .body(responseType);
        } catch (RestClientException ex) {
            log.warn("Goi KKPhim that bai: {}", ex.getMessage());
            throw new UpstreamException(PROVIDER_CODE,
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
                PROVIDER_CODE,
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
                PROVIDER_CODE,
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
}
