package com.rapphim.warehouse.provider.homelab;

import com.rapphim.warehouse.common.PageMeta;
import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.config.ZCloudProperties;
import com.rapphim.warehouse.dto.Episode;
import com.rapphim.warehouse.dto.EpisodeServer;
import com.rapphim.warehouse.dto.ListType;
import com.rapphim.warehouse.dto.MovieDetail;
import com.rapphim.warehouse.dto.MovieQuery;
import com.rapphim.warehouse.dto.MovieSummary;
import com.rapphim.warehouse.dto.ProviderType;
import com.rapphim.warehouse.dto.Subtitle;
import com.rapphim.warehouse.dto.Taxonomy;
import com.rapphim.warehouse.provider.MovieProvider;
import com.rapphim.warehouse.provider.homelab.MediaLibrary.LibraryEpisode;
import com.rapphim.warehouse.provider.homelab.MediaLibrary.LibraryTitle;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Kho phim rieng tren homelab, doc qua ZCloud.
 *
 * <p>Khac han hai nguon cong cong: khong co API tim kiem hay phan loai san, chi co
 * mot cay file. Nen cach lam la duyet ca kho mot lan, dung bo nho dem, roi loc va
 * phan trang ngay trong bo nho - vai nghin file thi cach nay nhanh hon va don gian
 * hon nhieu so voi hoi kho theo tung truy van.</p>
 *
 * <p>Chua cau hinh khoa thi nguon nay tra ve rong chu khong nem loi, de phan con lai
 * cua API van chay binh thuong.</p>
 */
@Component
public class HomelabProvider implements MovieProvider {

    /** Kho rieng khong phan loai the loai / quoc gia, gan mot nhan chung cho de loc. */
    private static final Taxonomy SELF_HOSTED = new Taxonomy("kho-rieng", "Kho riêng", "kho-rieng");

    private final ZCloudClient client;
    private final ZCloudProperties properties;

    public HomelabProvider(ZCloudClient client, ZCloudProperties properties) {
        this.client = client;
        this.properties = properties;
    }

    @Override
    public ProviderType type() {
        return ProviderType.HOMELAB;
    }

    /**
     * Toan bo kho, da gom thanh cac bo phim.
     *
     * <p>Duoc dem lai vi moi lan goi phai duyet het cay file. Bo dem het han theo cau
     * hinh chung trong {@code CacheConfig}, them phim moi thi doi mot nhip la thay.</p>
     */
    @Cacheable(cacheNames = "homelabLibrary")
    public List<LibraryTitle> library() {
        if (!client.isConfigured()) {
            return List.of();
        }
        return MediaLibrary.build(client.listAll(properties.prefix()), properties.prefix());
    }

    @Override
    public PageResponse<MovieSummary> latest(MovieQuery query) {
        return page(library(), query);
    }

    @Override
    public PageResponse<MovieSummary> listByType(ListType listType, MovieQuery query) {
        // Mot tap la phim le, nhieu tap la phim bo - do la tat ca thong tin cay file cho biet.
        List<LibraryTitle> filtered = library().stream()
                .filter(title -> matchesType(listType, title))
                .toList();
        return page(filtered, query);
    }

    @Override
    public PageResponse<MovieSummary> search(String keyword, MovieQuery query) {
        String needle = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
        if (needle.isEmpty()) {
            return page(library(), query);
        }

        String slugNeedle = MediaLibrary.slugify(needle);
        List<LibraryTitle> hits = library().stream()
                .filter(title -> title.name().toLowerCase(Locale.ROOT).contains(needle)
                        || title.slug().contains(slugNeedle))
                .toList();
        return page(hits, query);
    }

    @Override
    public PageResponse<MovieSummary> listByCategory(String categorySlug, MovieQuery query) {
        return SELF_HOSTED.slug().equals(categorySlug)
                ? page(library(), query)
                : PageResponse.empty(query.page(), query.limit(), type().code());
    }

    @Override
    public PageResponse<MovieSummary> listByCountry(String countrySlug, MovieQuery query) {
        return PageResponse.empty(query.page(), query.limit(), type().code());
    }

    @Override
    public PageResponse<MovieSummary> listByYear(int year, MovieQuery query) {
        List<LibraryTitle> hits = library().stream()
                .filter(title -> title.name().contains(String.valueOf(year)))
                .toList();
        return page(hits, query);
    }

    @Override
    public Optional<MovieDetail> findBySlug(String slug) {
        return library().stream()
                .filter(title -> title.slug().equals(slug))
                .findFirst()
                .map(this::toDetail);
    }

    @Override
    public List<Taxonomy> categories() {
        return library().isEmpty() ? List.of() : List.of(SELF_HOSTED);
    }

    @Override
    public List<Taxonomy> countries() {
        return List.of();
    }

    // ------------------------------------------------------------------ chuyen doi

    private boolean matchesType(ListType listType, LibraryTitle title) {
        boolean series = title.episodes().size() > 1;
        return switch (listType) {
            case PHIM_BO -> series;
            case PHIM_LE -> !series;
            default -> true;
        };
    }

    private PageResponse<MovieSummary> page(List<LibraryTitle> titles, MovieQuery query) {
        int from = Math.min((query.page() - 1) * query.limit(), titles.size());
        int to = Math.min(from + query.limit(), titles.size());

        List<MovieSummary> items = titles.subList(from, to).stream()
                .map(this::toSummary)
                .toList();

        return PageResponse.of(items, PageMeta.of(query.page(), query.limit(), titles.size()), type().code());
    }

    private MovieSummary toSummary(LibraryTitle title) {
        boolean series = title.episodes().size() > 1;
        return new MovieSummary(
                title.slug(),
                title.slug(),
                title.name(),
                null,
                null,
                null,
                yearIn(title.name()),
                series ? "series" : "single",
                null,
                null,
                null,
                series ? "Tập %02d".formatted(lastNumber(title)) : "Full",
                List.of(SELF_HOSTED),
                List.of(),
                null,
                null,
                type().code(),
                title.modifiedAt()
        );
    }

    private MovieDetail toDetail(LibraryTitle title) {
        boolean series = title.episodes().size() > 1;

        List<Episode> episodes = title.episodes().stream()
                .map(episode -> new Episode(
                        episode.name(),
                        episode.slug(),
                        episode.filename(),
                        null,
                        null,
                        // Duong tam co han su dung, trinh duyet tai thang tu kho.
                        client.presign(episode.key()),
                        subtitles(episode)
                ))
                .toList();

        return new MovieDetail(
                title.slug(),
                title.slug(),
                title.name(),
                null,
                "Phim trong kho riêng trên homelab.",
                null,
                null,
                null,
                yearIn(title.name()),
                series ? "series" : "single",
                "completed",
                null,
                null,
                null,
                series ? "Tập %02d".formatted(lastNumber(title)) : "Full",
                series ? String.valueOf(title.episodes().size()) : "1",
                List.of(),
                List.of(),
                List.of(SELF_HOSTED),
                List.of(),
                List.of(new EpisodeServer("Homelab", episodes)),
                null,
                null,
                type().code(),
                title.modifiedAt()
        );
    }

    /**
     * Duong tai phu de tro ve chinh backend nay chu khong tro thang vao kho.
     *
     * <p>The {@code <track>} cua trinh duyet chi doc WebVTT, ma phu de tu lam thuong
     * la .srt hoac .ass - phai co mot cho chuyen doi, va do la endpoint cua ta.</p>
     */
    private List<Subtitle> subtitles(LibraryEpisode episode) {
        List<Subtitle> tracks = new java.util.ArrayList<>();
        for (int index = 0; index < episode.subtitles().size(); index++) {
            MediaLibrary.LibrarySubtitle sub = episode.subtitles().get(index);
            String url = UriComponentsBuilder.fromPath("/api/v1/homelab/subtitle")
                    .queryParam("key", sub.key())
                    .encode(StandardCharsets.UTF_8)
                    .toUriString();
            tracks.add(new Subtitle(sub.label(), sub.lang(), url, index == 0));
        }
        return List.copyOf(tracks);
    }

    private int lastNumber(LibraryTitle title) {
        return title.episodes().stream()
                .map(LibraryEpisode::number)
                .max(Comparator.naturalOrder())
                .orElse(title.episodes().size());
    }

    /** Doc nam phat hanh neu ten thu muc co kem, vi du "Thanh Khu (2023)". */
    private Integer yearIn(String name) {
        var matcher = java.util.regex.Pattern.compile("(19|20)\\d{2}").matcher(name);
        return matcher.find() ? Integer.parseInt(matcher.group()) : null;
    }
}
