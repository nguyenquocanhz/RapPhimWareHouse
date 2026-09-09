package com.rapphim.warehouse.provider.nguonc;

import com.rapphim.warehouse.common.PageMeta;
import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.dto.Episode;
import com.rapphim.warehouse.dto.EpisodeServer;
import com.rapphim.warehouse.dto.ListType;
import com.rapphim.warehouse.dto.MovieDetail;
import com.rapphim.warehouse.dto.MovieQuery;
import com.rapphim.warehouse.dto.MovieSummary;
import com.rapphim.warehouse.dto.ProviderType;
import com.rapphim.warehouse.dto.Taxonomy;
import com.rapphim.warehouse.exception.UpstreamException;
import com.rapphim.warehouse.provider.MovieProvider;
import com.rapphim.warehouse.provider.ProviderSupport;
import com.rapphim.warehouse.provider.nguonc.model.NguonCModels;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriBuilder;

import java.net.URI;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;

/**
 * Cai dat {@link MovieProvider} cho nguon NguonC (phim.nguonc.com).
 *
 * <p>Khac biet so voi KKPhim can luu y:</p>
 * <ul>
 *   <li>Trang luon co 10 phim, khong nhan tham so {@code limit}. Gia tri that
 *       duoc tra lai trong {@code meta.limit} de client phan trang dung.</li>
 *   <li>Muc danh sach khong kem the loai / quoc gia, chi chi tiet phim moi co.</li>
 *   <li>Tap phim chi co link embed, khong co link {@code .m3u8}.</li>
 *   <li>Khong tra ve dinh danh TMDB / IMDb nen khong sinh duoc file NFO day du.</li>
 *   <li>Khong co endpoint liet ke the loai / quoc gia, nen danh muc duoc chep tu
 *       menu cua nguon ({@link NguonCTaxonomy}). Slug cua NguonC khac KKPhim
 *       nen khong the dung chung danh muc giua hai nguon.</li>
 * </ul>
 */
@Component
public class NguonCProvider implements MovieProvider {

    private static final Logger log = LoggerFactory.getLogger(NguonCProvider.class);
    private static final String PROVIDER_CODE = "nguonc";

    /** Cac nhom danh sach ma NguonC thuc su ho tro. */
    private static final Set<ListType> SUPPORTED_LIST_TYPES = EnumSet.of(
            ListType.PHIM_BO, ListType.PHIM_LE, ListType.TV_SHOWS,
            ListType.HOAT_HINH, ListType.DANG_CHIEU);

    private static final String GROUP_GENRE = "the loai";
    private static final String GROUP_COUNTRY = "quoc gia";
    private static final String GROUP_FORMAT = "dinh dang";

    private final RestClient client;

    public NguonCProvider(@Qualifier("nguoncRestClient") RestClient client) {
        this.client = client;
    }

    @Override
    public ProviderType type() {
        return ProviderType.NGUONC;
    }

    @Override
    public PageResponse<MovieSummary> latest(MovieQuery query) {
        return fetchList("/api/films/phim-moi-cap-nhat", query);
    }

    @Override
    public PageResponse<MovieSummary> listByType(ListType listType, MovieQuery query) {
        if (!SUPPORTED_LIST_TYPES.contains(listType)) {
            throw new IllegalArgumentException("Nguon 'nguonc' khong ho tro danh sach '" + listType.slug()
                    + "'. Chi ho tro: phim-bo, phim-le, tv-shows, hoat-hinh, dang-chieu");
        }
        return fetchList("/api/films/danh-sach/" + listType.slug(), query);
    }

    @Override
    public PageResponse<MovieSummary> search(String keyword, MovieQuery query) {
        return fetchList("/api/films/search", query, builder -> builder.queryParam("keyword", keyword));
    }

    @Override
    public PageResponse<MovieSummary> listByCategory(String categorySlug, MovieQuery query) {
        return fetchList("/api/films/the-loai/" + categorySlug, query);
    }

    @Override
    public PageResponse<MovieSummary> listByCountry(String countrySlug, MovieQuery query) {
        return fetchList("/api/films/quoc-gia/" + countrySlug, query);
    }

    @Override
    public PageResponse<MovieSummary> listByYear(int year, MovieQuery query) {
        return fetchList("/api/films/nam-phat-hanh/" + year, query);
    }

    @Override
    public Optional<MovieDetail> findBySlug(String slug) {
        NguonCModels.DetailEnvelope response = call(
                builder -> builder.path("/api/film/{slug}").build(slug),
                NguonCModels.DetailEnvelope.class);

        if (response == null || response.movie() == null) {
            return Optional.empty();
        }
        return Optional.of(toDetail(response.movie()));
    }

    /** NguonC khong co endpoint danh muc nen dung danh sach chep tu menu cua nguon. */
    @Override
    public List<Taxonomy> categories() {
        return NguonCTaxonomy.CATEGORIES;
    }

    @Override
    public List<Taxonomy> countries() {
        return NguonCTaxonomy.COUNTRIES;
    }

    // ------------------------------------------------------------------ goi nguon

    private PageResponse<MovieSummary> fetchList(String path, MovieQuery query) {
        return fetchList(path, query, Function.identity());
    }

    private PageResponse<MovieSummary> fetchList(String path, MovieQuery query,
                                                 Function<UriBuilder, UriBuilder> extraParams) {
        NguonCModels.ListEnvelope response = call(builder -> {
            UriBuilder uri = builder.path(path).queryParam("page", query.page());
            return extraParams.apply(uri).build();
        }, NguonCModels.ListEnvelope.class);

        if (response == null || response.items() == null) {
            return PageResponse.empty(query.page(), query.limit(), PROVIDER_CODE);
        }

        List<MovieSummary> items = response.items().stream()
                .map(this::toSummary)
                .toList();

        return PageResponse.of(items, toMeta(response.paginate(), query), PROVIDER_CODE);
    }

    private <T> T call(Function<UriBuilder, URI> uriFunction, Class<T> responseType) {
        try {
            return client.get()
                    .uri(uriFunction::apply)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (request, response) -> {
                        // NguonC tra 404 kem body JSON khi khong tim thay - coi nhu khong co du lieu.
                    })
                    .body(responseType);
        } catch (RestClientException ex) {
            log.warn("Goi NguonC that bai: {}", ex.getMessage());
            throw new UpstreamException(PROVIDER_CODE,
                    "Khong lay duoc du lieu tu NguonC: " + ex.getMessage(), ex);
        }
    }

    // ------------------------------------------------------------------ chuyen doi

    private PageMeta toMeta(NguonCModels.Paginate paginate, MovieQuery query) {
        if (paginate == null) {
            return PageMeta.of(query.page(), query.limit(), 0);
        }
        int limit = paginate.itemsPerPage() > 0 ? paginate.itemsPerPage() : query.limit();
        int page = paginate.currentPage() > 0 ? paginate.currentPage() : query.page();
        return new PageMeta(page, limit, paginate.totalItems(), paginate.totalPage());
    }

    private MovieSummary toSummary(NguonCModels.Item item) {
        return new MovieSummary(
                item.slug(),
                item.slug(),
                item.name(),
                item.originalName(),
                item.posterUrl(),
                item.thumbUrl(),
                ProviderSupport.parseInt(item.year()),
                inferType(item.totalEpisodes()),
                item.quality(),
                item.language(),
                item.time(),
                item.currentEpisode(),
                List.of(),
                List.of(),
                null,
                null,
                PROVIDER_CODE,
                ProviderSupport.normalizeInstant(item.modified()));
    }

    private MovieDetail toDetail(NguonCModels.Movie movie) {
        Map<String, NguonCModels.CategoryGroup> groups =
                movie.category() == null ? Map.of() : movie.category();

        List<Taxonomy> categories = taxonomiesOfGroup(groups, GROUP_GENRE);
        List<Taxonomy> countries = taxonomiesOfGroup(groups, GROUP_COUNTRY);
        List<String> formats = taxonomiesOfGroup(groups, GROUP_FORMAT).stream().map(Taxonomy::name).toList();
        List<String> years = groups.values().stream()
                .filter(group -> group.group() != null
                        && "nam".equals(ProviderSupport.slugify(group.group().name())))
                .flatMap(group -> ProviderSupport.orEmpty(group.list()).stream())
                .map(NguonCModels.GroupInfo::name)
                .toList();

        return new MovieDetail(
                movie.id(),
                movie.slug(),
                movie.name(),
                movie.originalName(),
                movie.description(),
                movie.posterUrl(),
                movie.thumbUrl(),
                null,
                years.isEmpty() ? null : ProviderSupport.parseInt(years.get(0)),
                inferType(formats, movie.totalEpisodes()),
                inferStatus(movie.currentEpisode(), movie.totalEpisodes()),
                movie.quality(),
                movie.language(),
                movie.time(),
                movie.currentEpisode(),
                movie.totalEpisodes() == null ? null : String.valueOf(movie.totalEpisodes()),
                ProviderSupport.splitCsv(movie.casts()),
                ProviderSupport.splitCsv(movie.director()),
                categories,
                countries,
                toServers(movie.episodes()),
                null,
                null,
                PROVIDER_CODE,
                ProviderSupport.normalizeInstant(movie.modified()));
    }

    private List<Taxonomy> taxonomiesOfGroup(Map<String, NguonCModels.CategoryGroup> groups, String groupSlug) {
        return groups.values().stream()
                .filter(group -> group.group() != null
                        && groupSlug.equals(normalizeGroupName(group.group().name())))
                .flatMap(group -> ProviderSupport.orEmpty(group.list()).stream())
                .map(entry -> new Taxonomy(entry.id(), entry.name(), ProviderSupport.slugify(entry.name())))
                .toList();
    }

    /** Doi ten nhom ve dang khong dau, cach nhau bang khoang trang de so sanh on dinh. */
    private String normalizeGroupName(String name) {
        String slug = ProviderSupport.slugify(name);
        return slug == null ? "" : slug.replace('-', ' ');
    }

    private List<EpisodeServer> toServers(List<NguonCModels.ServerRaw> servers) {
        return ProviderSupport.orEmpty(servers).stream()
                .map(server -> new EpisodeServer(
                        server.serverName(),
                        ProviderSupport.orEmpty(server.items()).stream()
                                .map(ep -> new Episode(
                                        normalizeEpisodeName(ep.name()),
                                        ep.slug(),
                                        null,
                                        ep.embed(),
                                        ep.m3u8()))
                                .toList()))
                .toList();
    }

    /** NguonC dat ten tap chi bang so, them tien to cho dong bo voi KKPhim. */
    private String normalizeEpisodeName(String name) {
        if (name == null || name.isBlank()) {
            return null;
        }
        String trimmed = name.trim();
        return trimmed.chars().allMatch(Character::isDigit) ? "Tap " + trimmed : trimmed;
    }

    private String inferType(Integer totalEpisodes) {
        return (totalEpisodes != null && totalEpisodes <= 1) ? "single" : "series";
    }

    private String inferType(List<String> formats, Integer totalEpisodes) {
        for (String format : formats) {
            String slug = ProviderSupport.slugify(format);
            if (slug == null) {
                continue;
            }
            if (slug.startsWith("phim-le")) {
                return "single";
            }
            if (slug.startsWith("phim-bo")) {
                return "series";
            }
            if (slug.startsWith("tv-shows")) {
                return "tvshows";
            }
            if (slug.startsWith("hoat-hinh")) {
                return "hoathinh";
            }
        }
        return inferType(totalEpisodes);
    }

    /** NguonC khong co truong trang thai nen suy ra tu so tap da phat. */
    private String inferStatus(String currentEpisode, Integer totalEpisodes) {
        if (currentEpisode == null) {
            return null;
        }
        String normalized = currentEpisode.toLowerCase();
        if (normalized.contains("full") || normalized.contains("hoan tat")) {
            return "completed";
        }
        Integer current = ProviderSupport.parseInt(normalized.replaceAll("[^0-9]", ""));
        if (current != null && totalEpisodes != null && current.equals(totalEpisodes)) {
            return "completed";
        }
        return "ongoing";
    }
}
