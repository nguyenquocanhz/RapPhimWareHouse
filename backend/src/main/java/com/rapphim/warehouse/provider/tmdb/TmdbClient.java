package com.rapphim.warehouse.provider.tmdb;

import com.rapphim.warehouse.common.PageMeta;
import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.config.TmdbProperties;
import com.rapphim.warehouse.dto.Taxonomy;
import com.rapphim.warehouse.dto.TmdbCast;
import com.rapphim.warehouse.dto.TmdbDetail;
import com.rapphim.warehouse.dto.TmdbDiscoverItem;
import com.rapphim.warehouse.dto.TmdbDiscoverQuery;
import com.rapphim.warehouse.exception.TmdbNotConfiguredException;
import com.rapphim.warehouse.exception.UpstreamException;
import com.rapphim.warehouse.provider.ProviderSupport;
import com.rapphim.warehouse.provider.tmdb.model.TmdbModels;
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
 * Cong ra TheMovieDB. Cung cap metadata day du de sinh file NFO va
 * mot proxy cho endpoint duyet tim {@code /discover/movie}.
 *
 * <p>Anh tra ve tu TMDB la duong dan tuong doi; client nay ghep san voi CDN
 * o kich thuoc phu hop nen phia goi khong phai tu xu ly.</p>
 */
@Component
public class TmdbClient {

    private static final Logger log = LoggerFactory.getLogger(TmdbClient.class);

    /** So lan goi toi da khi bi cat o tang mang. */
    private static final int NETWORK_ATTEMPTS = 4;

    /** Cho bay nhieu mili giay truoc lan thu hai, roi gap len theo so lan. */
    private static final long NETWORK_BACKOFF_MS = 150;
    private static final String PROVIDER_CODE = "tmdb";

    /** Lay them dien vien va dinh danh ngoai trong cung mot lan goi. */
    private static final String APPEND = "credits,external_ids";

    private static final String POSTER_SIZE = "w500";
    private static final String BACKDROP_SIZE = "w1280";
    private static final String PROFILE_SIZE = "w185";

    /** TMDB tra toi da 20 phim moi trang o cac endpoint danh sach. */
    private static final int PAGE_SIZE = 20;

    /** Chi giu vai dien chinh, du cho file NFO ma khong lam nang response. */
    private static final int MAX_CAST = 20;

    private final RestClient client;
    private final TmdbProperties properties;

    /** Khoa co the doi tren trang quan tri nen phai hoi moi lan dung, khong giu lai. */
    private final com.rapphim.warehouse.service.SettingsService settings;

    public TmdbClient(@Qualifier("tmdbRestClient") RestClient client,
                      TmdbProperties properties,
                      @org.springframework.context.annotation.Lazy
                      com.rapphim.warehouse.service.SettingsService settings) {
        this.client = client;
        this.properties = properties;
        this.settings = settings;
    }

    public boolean isConfigured() {
        return settings.tmdbBearerToken() != null || settings.tmdbQueryKey() != null;
    }

    /**
     * Metadata day du cua mot ban ghi TMDB.
     *
     * @param type {@code movie} hoac {@code tv}
     * @param id   ma tren TMDB
     * @return rong neu TMDB khong co ban ghi nay
     */
    public Optional<TmdbDetail> details(String type, String id) {
        requireConfigured();
        String path = normalizeType(type);

        TmdbModels.Details details = call(
                builder -> withAuth(builder.path("/" + path + "/{id}")
                        .queryParam("language", properties.language())
                        .queryParam("append_to_response", APPEND)).build(id),
                TmdbModels.Details.class);

        if (details == null || details.id() == null) {
            return Optional.empty();
        }
        return Optional.of(toDetail(details, path));
    }

    /** Duyet tim phim theo bo loc, anh xa thang tu {@code /discover/movie}. */
    public PageResponse<TmdbDiscoverItem> discoverMovies(TmdbDiscoverQuery query) {
        requireConfigured();

        TmdbModels.Page page = call(builder -> {
            UriBuilder uri = builder.path("/discover/movie")
                    .queryParam("language", properties.language())
                    .queryParam("page", query.page())
                    .queryParam("sort_by", query.sortBy())
                    .queryParam("include_adult", query.includeAdult());

            if (query.withGenres() != null) {
                uri = uri.queryParam("with_genres", query.withGenres());
            }
            if (query.withOriginalLanguage() != null) {
                uri = uri.queryParam("with_original_language", query.withOriginalLanguage());
            }
            if (query.year() != null) {
                uri = uri.queryParam("primary_release_year", query.year());
            }
            if (query.voteAverageGte() != null) {
                uri = uri.queryParam("vote_average.gte", query.voteAverageGte());
            }
            if (query.voteCountGte() != null) {
                uri = uri.queryParam("vote_count.gte", query.voteCountGte());
            }
            if (query.region() != null) {
                uri = uri.queryParam("region", query.region());
            }
            return withAuth(uri).build();
        }, TmdbModels.Page.class);

        if (page == null || page.results() == null) {
            return PageResponse.empty(query.page(), PAGE_SIZE, PROVIDER_CODE);
        }

        List<TmdbDiscoverItem> items = page.results().stream().map(this::toDiscoverItem).toList();
        PageMeta meta = new PageMeta(
                page.page() == null ? query.page() : page.page(),
                PAGE_SIZE,
                page.totalResults() == null ? items.size() : page.totalResults(),
                page.totalPages() == null ? 1 : page.totalPages());

        return PageResponse.of(items, meta, PROVIDER_CODE);
    }

    /** Danh muc the loai cua TMDB, dung de dich {@code genreIds} sang ten. */
    public List<Taxonomy> genres(String type) {
        requireConfigured();
        String path = normalizeType(type);

        TmdbModels.GenreList response = call(
                builder -> withAuth(builder.path("/genre/" + path + "/list")
                        .queryParam("language", properties.language())).build(),
                TmdbModels.GenreList.class);

        if (response == null || response.genres() == null) {
            return List.of();
        }
        return response.genres().stream()
                .map(genre -> new Taxonomy(
                        String.valueOf(genre.id()), genre.name(), ProviderSupport.slugify(genre.name())))
                .toList();
    }

    // ------------------------------------------------------------------ goi nguon

    /**
     * Khoa v3 di kem query param.
     *
     * <p>Chi dung khi khong co token v4 - token v4 di bang header, gan trong tung
     * request chu khong gan san vao client, vi no doi duoc tren trang quan tri.</p>
     */
    private UriBuilder withAuth(UriBuilder builder) {
        String key = settings.tmdbQueryKey();
        if (settings.tmdbBearerToken() == null && key != null) {
            return builder.queryParam("api_key", key);
        }
        return builder;
    }

    private void requireConfigured() {
        if (!isConfigured()) {
            throw new TmdbNotConfiguredException();
        }
    }

    private static String normalizeType(String type) {
        if (type == null || type.isBlank()) {
            return "movie";
        }
        String normalized = type.trim().toLowerCase();
        return switch (normalized) {
            case "tv", "series", "tvshows", "hoathinh" -> "tv";
            case "movie", "single" -> "movie";
            default -> throw new IllegalArgumentException(
                    "Loai TMDB '" + type + "' khong hop le. Chi chap nhan: movie, tv");
        };
    }

    /**
     * Goi TMDB, thu lai vai lan khi bi cat o tang mang.
     *
     * <p>Duong ra TheMovieDB bi chan theo ten mien nhung chan khong deu: cung mot yeu
     * cau lam lai vai lan thi co lan lot. Nen mot lan hong khong co nghia la hong that,
     * va bao loi ngay lan dau la bo phi phan lon co hoi lay duoc du lieu.</p>
     *
     * <p>Chi thu lai voi loi mang. Bi tu choi khoa hay qua han muc thi lam lai bao nhieu
     * lan cung the, ma con lam nang them phia TheMovieDB.</p>
     */
    private <T> T call(Function<UriBuilder, URI> uriFunction, Class<T> responseType) {
        UpstreamException last = null;
        for (int attempt = 1; attempt <= NETWORK_ATTEMPTS; attempt++) {
            try {
                return callOnce(uriFunction, responseType);
            } catch (UpstreamException ex) {
                if (!UpstreamException.BLOCKED.equals(ex.getCode())) {
                    throw ex;
                }
                last = ex;
                log.debug("TMDB bi cat lan {}/{}", attempt, NETWORK_ATTEMPTS);
                pause(attempt);
            }
        }
        throw last;
    }

    /** Nghi mot chut giua hai lan thu, moi lan mot lau hon. */
    private void pause(int attempt) {
        try {
            Thread.sleep(NETWORK_BACKOFF_MS * attempt);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
        }
    }

    private <T> T callOnce(Function<UriBuilder, URI> uriFunction, Class<T> responseType) {
        try {
            var spec = client.get().uri(uriFunction::apply);

            // Token v4 gan theo tung request chu khong gan san vao client: no doi duoc
            // tren trang quan tri, ma client thi chi dung mot lan luc khoi dong.
            String token = settings.tmdbBearerToken();
            if (token != null) {
                spec = spec.header(org.springframework.http.HttpHeaders.AUTHORIZATION,
                        "Bearer " + token);
            }

            return spec
                    .retrieve()
                    // Chi 404 moi la "khong co ban ghi". Truoc day nuot ca 4xx, nen
                    // token sai (401) hay qua han muc (429) deu hien ra thanh "0 phim" -
                    // nguoi dung di chinh bo loc trong khi loi nam o cho khac han.
                    .onStatus(status -> status.value() == 404, (request, response) -> {
                    })
                    .body(responseType);
        } catch (org.springframework.web.client.HttpClientErrorException ex) {
            log.warn("TMDB tu choi: {}", ex.getStatusCode());
            throw new UpstreamException(PROVIDER_CODE, explain(ex), ex);
        } catch (RestClientException ex) {
            log.warn("Goi TMDB that bai: {}", ex.getMessage());
            throw UpstreamException.network(PROVIDER_CODE, "TheMovieDB", ex);
        }
    }

    /** Doi ma loi cua TMDB thanh cau noi ro nguoi dung phai lam gi. */
    private String explain(org.springframework.web.client.HttpClientErrorException ex) {
        return switch (ex.getStatusCode().value()) {
            case 401 -> "TheMovieDB từ chối khoá. Kiểm tra lại token trong trang quản trị.";
            case 403 -> "TheMovieDB chặn yêu cầu này. Khoá có thể chưa đủ quyền.";
            case 429 -> "Gọi TheMovieDB quá nhiều, hãy chờ một lát rồi thử lại.";
            default -> "TheMovieDB trả về lỗi " + ex.getStatusCode().value() + ".";
        };
    }

    // ------------------------------------------------------------------ chuyen doi

    private TmdbDetail toDetail(TmdbModels.Details details, String type) {
        return new TmdbDetail(
                String.valueOf(details.id()),
                type,
                details.displayTitle(),
                details.displayOriginalTitle(),
                details.overview(),
                blankToNull(details.tagline()),
                blankToNull(details.homepage()),
                details.status(),
                details.displayReleaseDate(),
                details.displayRuntime(),
                details.numberOfSeasons(),
                details.numberOfEpisodes(),
                details.voteAverage(),
                details.voteCount(),
                details.popularity(),
                properties.imageUrl(details.posterPath(), POSTER_SIZE),
                properties.imageUrl(details.backdropPath(), BACKDROP_SIZE),
                names(details.genres()),
                countryNames(details.productionCountries()),
                studioNames(details),
                directorNames(details),
                castOf(details.credits()),
                details.resolvedImdbId());
    }

    private TmdbDiscoverItem toDiscoverItem(TmdbModels.Result result) {
        return new TmdbDiscoverItem(
                String.valueOf(result.id()),
                result.displayTitle(),
                result.displayOriginalTitle(),
                result.originalLanguage(),
                blankToNull(result.overview()),
                blankToNull(result.displayReleaseDate()),
                result.voteAverage(),
                result.voteCount(),
                result.popularity(),
                properties.imageUrl(result.posterPath(), POSTER_SIZE),
                properties.imageUrl(result.backdropPath(), BACKDROP_SIZE),
                ProviderSupport.orEmpty(result.genreIds()));
    }

    private List<String> names(List<TmdbModels.Named> items) {
        return ProviderSupport.orEmpty(items).stream()
                .map(TmdbModels.Named::name)
                .filter(name -> name != null && !name.isBlank())
                .toList();
    }

    private List<String> countryNames(List<TmdbModels.Country> items) {
        return ProviderSupport.orEmpty(items).stream()
                .map(TmdbModels.Country::name)
                .filter(name -> name != null && !name.isBlank())
                .toList();
    }

    /** Phim le ghi nhan hang phim, phim bo ghi nhan dai truyen hinh. */
    private List<String> studioNames(TmdbModels.Details details) {
        List<String> companies = names(details.productionCompanies());
        return companies.isEmpty() ? names(details.networks()) : companies;
    }

    /** Phim le lay dao dien tu crew, phim bo lay nguoi sang tao. */
    private List<String> directorNames(TmdbModels.Details details) {
        if (details.credits() != null && details.credits().crew() != null) {
            List<String> directors = details.credits().crew().stream()
                    .filter(member -> "Director".equalsIgnoreCase(member.job()))
                    .map(TmdbModels.Crew::name)
                    .filter(name -> name != null && !name.isBlank())
                    .toList();
            if (!directors.isEmpty()) {
                return directors;
            }
        }
        return names(details.createdBy());
    }

    private List<TmdbCast> castOf(TmdbModels.Credits credits) {
        if (credits == null || credits.cast() == null) {
            return List.of();
        }
        return credits.cast().stream()
                .limit(MAX_CAST)
                .map(member -> new TmdbCast(
                        member.name(),
                        blankToNull(member.character()),
                        member.order(),
                        properties.imageUrl(member.profilePath(), PROFILE_SIZE)))
                .toList();
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }
}
