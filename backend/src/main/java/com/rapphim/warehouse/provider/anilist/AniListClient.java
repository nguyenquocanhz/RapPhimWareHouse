package com.rapphim.warehouse.provider.anilist;

import com.rapphim.warehouse.common.PageMeta;
import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.dto.AnimeDetail;
import com.rapphim.warehouse.dto.AnimeSummary;
import com.rapphim.warehouse.exception.UpstreamException;
import com.rapphim.warehouse.provider.AnimeMetadataProvider;
import com.rapphim.warehouse.provider.anilist.model.AniListModels;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Cong ra AniList - nguon METADATA anime (GraphQL, khong phat video).
 *
 * <p>AniList khong can khoa. Client goi POST GraphQL toi mot endpoint duy nhat, mang
 * cau truy van kem bien. Anh AniList tra ve la URL tuyet doi nen truyen thang.</p>
 *
 * <h2>Xu ly loi - vi sao phai doc {@code errors[]}</h2>
 * <p>GraphQL bao loi khac REST: query sai field, qua han muc, hay chinh thong bao
 * "API tam tat" thuong ve bang <b>HTTP 200</b> kem {@code data: null, errors: [...]}.
 * Neu chi nhin {@code data == null} roi coi la "khong co ket qua", moi loi upstream
 * se hien ra thanh danh sach rong hoac 404 - dung loi im lang ma he thong nay tung
 * mac (tra "0 phim" khi that ra khoa bi tu choi). Nen o day {@code errors[]} luon
 * duoc doc: co loi ma khong co du lieu thi bao {@link UpstreamException}.</p>
 *
 * <p>Loi mang (khong nhan duoc phan hoi) thi thu lai vai lan. Loi HTTP co ma (4xx/5xx)
 * thi khong thu lai: 404 coi la khong co ban ghi, con lai bao thanh loi doc duoc.</p>
 */
@Component
public class AniListClient implements AnimeMetadataProvider {

    private static final Logger log = LoggerFactory.getLogger(AniListClient.class);

    private static final String PROVIDER_CODE = "anilist";

    /** So lan goi toi da khi loi mang. */
    private static final int NETWORK_ATTEMPTS = 3;

    /** Cho bay nhieu mili giay truoc lan thu hai, roi gap len theo so lan. */
    private static final long NETWORK_BACKOFF_MS = 150;

    /** AniList chi cho toi da 50 ban ghi moi trang. */
    private static final int MAX_PER_PAGE = 50;

    private static final String PAGE_QUERY = """
            query ($page: Int, $perPage: Int, $search: String, $sort: [MediaSort]) {
              Page(page: $page, perPage: $perPage) {
                pageInfo { total currentPage lastPage perPage hasNextPage }
                media(type: ANIME, isAdult: false, search: $search, sort: $sort) {
                  id
                  title { romaji english native }
                  format
                  episodes
                  seasonYear
                  averageScore
                  genres
                  coverImage { large }
                  bannerImage
                  siteUrl
                }
              }
            }
            """;

    private static final String DETAIL_QUERY = """
            query ($id: Int) {
              Media(id: $id, type: ANIME) {
                id
                title { romaji english native }
                description(asHtml: false)
                format
                status
                episodes
                duration
                seasonYear
                season
                averageScore
                popularity
                genres
                coverImage { extraLarge large }
                bannerImage
                siteUrl
                startDate { year month day }
                studios(isMain: true) { nodes { name } }
                nextAiringEpisode { episode airingAt timeUntilAiring }
              }
            }
            """;

    private static final String GENRE_QUERY = "query { GenreCollection }";

    private final RestClient client;

    public AniListClient(@Qualifier("anilistRestClient") RestClient client) {
        this.client = client;
    }

    @Override
    public String source() {
        return PROVIDER_CODE;
    }

    // ------------------------------------------------------------------ cong khai

    /** Anime thinh hanh nhat hien tai. */
    @Override
    public PageResponse<AnimeSummary> trending(int page, int perPage) {
        return pageOf(page, perPage, null, List.of("TRENDING_DESC", "POPULARITY_DESC"));
    }

    /** Tim anime theo tu khoa. */
    @Override
    public PageResponse<AnimeSummary> search(String keyword, int page, int perPage) {
        return pageOf(page, perPage, keyword, List.of("SEARCH_MATCH", "POPULARITY_DESC"));
    }

    /** Metadata day du cua mot anime; rong neu AniList khong co ma nay. */
    @Override
    public Optional<AnimeDetail> details(int id) {
        AniListModels.MediaEnvelope env =
                post(DETAIL_QUERY, Map.of("id", id), AniListModels.MediaEnvelope.class);
        if (env == null) {
            return Optional.empty();
        }
        AniListModels.Media media = env.data() == null ? null : env.data().media();
        raiseIfErrors(env.errors(), media == null);
        return Optional.ofNullable(media).map(this::toDetail);
    }

    /** Danh sach the loai AniList ho tro, dung cho bo loc. */
    @Override
    public List<String> genres() {
        AniListModels.GenreEnvelope env = post(GENRE_QUERY, Map.of(), AniListModels.GenreEnvelope.class);
        if (env == null) {
            return List.of();
        }
        List<String> genres = env.data() == null ? null : env.data().genreCollection();
        raiseIfErrors(env.errors(), genres == null);
        return genres == null ? List.of() : genres;
    }

    // ------------------------------------------------------------------ noi bo

    private PageResponse<AnimeSummary> pageOf(int page, int perPage, String search, List<String> sort) {
        int safePer = Math.min(Math.max(perPage, 1), MAX_PER_PAGE);

        Map<String, Object> variables = new LinkedHashMap<>();
        variables.put("page", page);
        variables.put("perPage", safePer);
        variables.put("sort", sort);
        if (search != null && !search.isBlank()) {
            variables.put("search", search.trim());
        }

        AniListModels.PageEnvelope env = post(PAGE_QUERY, variables, AniListModels.PageEnvelope.class);
        if (env == null) {
            return PageResponse.empty(page, safePer, PROVIDER_CODE);
        }
        AniListModels.Page pageData = env.data() == null ? null : env.data().page();
        raiseIfErrors(env.errors(), pageData == null);
        if (pageData == null) {
            return PageResponse.empty(page, safePer, PROVIDER_CODE);
        }

        List<AnimeSummary> items = (pageData.media() == null ? List.<AniListModels.Media>of() : pageData.media())
                .stream().map(this::toSummary).toList();

        return PageResponse.of(items, PageMeta.of(page, safePer, totalOf(pageData.pageInfo(), page, safePer, items.size())),
                PROVIDER_CODE);
    }

    /**
     * Tong so ban ghi cho phan trang.
     *
     * <p>AniList gan nhu luon tra {@code total}. Khi thieu, KHONG duoc lay so item cua
     * rieng trang hien tai lam tong (se sai o trang &gt; 1). Suy tu {@code hasNextPage}:
     * con trang sau thi tong phai lon hon het trang nay, de {@code hasNext} van dung.</p>
     */
    private long totalOf(AniListModels.PageInfo info, int page, int perPage, int itemsThisPage) {
        if (info != null && info.total() != null) {
            return info.total();
        }
        boolean more = info != null && Boolean.TRUE.equals(info.hasNextPage());
        return more ? (long) page * perPage + 1 : (long) (page - 1) * perPage + itemsThisPage;
    }

    /**
     * Goi POST GraphQL, thu lai khi loi MANG (khong nhan duoc phan hoi).
     *
     * <p>404 tra {@code null} (khong co ban ghi -&gt; caller coi la rong). Cac ma loi
     * HTTP khac (4xx/5xx) bao thanh {@link UpstreamException} ngay, khong thu lai -
     * lam lai bao nhieu lan cung the ma con lam nang phia AniList.</p>
     */
    private <T> T post(String query, Map<String, Object> variables, Class<T> type) {
        RestClientException lastNetwork = null;
        for (int attempt = 1; attempt <= NETWORK_ATTEMPTS; attempt++) {
            try {
                return client.post()
                        .uri("")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(new GraphQLRequest(query, variables))
                        .retrieve()
                        .body(type);
            } catch (RestClientResponseException ex) {
                // Nhan duoc phan hoi HTTP kem ma loi. 404 = khong co ban ghi.
                if (ex.getStatusCode().value() == 404) {
                    return null;
                }
                log.warn("AniList tu choi: {}", ex.getStatusCode());
                throw new UpstreamException(PROVIDER_CODE, explain(ex), ex);
            } catch (RestClientException ex) {
                // Khong nhan duoc phan hoi (timeout / connect reset) -> thu lai.
                lastNetwork = ex;
                log.debug("AniList loi mang lan {}/{}: {}", attempt, NETWORK_ATTEMPTS, ex.getMessage());
                if (!pause(attempt)) {
                    break;
                }
            }
        }
        throw UpstreamException.network(PROVIDER_CODE, "AniList", lastNetwork);
    }

    /**
     * Doc {@code errors[]} cua GraphQL. Co loi thi luon ghi canh bao; neu khong kem
     * du lieu ({@code fatal}) thi bao {@link UpstreamException} thay vi coi la rong.
     */
    private void raiseIfErrors(List<AniListModels.GraphQLError> errors, boolean fatal) {
        if (errors == null || errors.isEmpty()) {
            return;
        }
        String message = errors.get(0) == null ? null : errors.get(0).message();
        log.warn("AniList tra loi GraphQL: {}", message);
        if (fatal) {
            throw new UpstreamException(PROVIDER_CODE,
                    message != null && !message.isBlank()
                            ? "AniList: " + message
                            : "AniList trả về lỗi khi truy vấn.");
        }
    }

    /** Cho giua hai lan thu. Tra {@code false} neu bi interrupt (nen dung retry ngay). */
    private boolean pause(int attempt) {
        try {
            Thread.sleep(NETWORK_BACKOFF_MS * attempt);
            return true;
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    private String explain(RestClientResponseException ex) {
        int code = ex.getStatusCode().value();
        if (code == 429) {
            return "AniList đang giới hạn số yêu cầu, hãy chờ một lát rồi thử lại.";
        }
        if (ex.getStatusCode().is5xxServerError()) {
            return "AniList đang gặp sự cố máy chủ, hãy thử lại sau.";
        }
        return "AniList trả về lỗi " + code + ".";
    }

    // ------------------------------------------------------------------ chuyen doi

    private AnimeSummary toSummary(AniListModels.Media m) {
        return new AnimeSummary(
                String.valueOf(m.id()),
                displayTitle(m.title()),
                m.title() == null ? null : m.title().romaji(),
                m.title() == null ? null : m.title().nativeTitle(),
                m.format(),
                m.episodes(),
                m.seasonYear(),
                m.averageScore(),
                m.genres() == null ? List.of() : m.genres(),
                m.coverImage() == null ? null : m.coverImage().large(),
                m.bannerImage(),
                m.siteUrl(),
                PROVIDER_CODE);
    }

    private AnimeDetail toDetail(AniListModels.Media m) {
        return new AnimeDetail(
                String.valueOf(m.id()),
                displayTitle(m.title()),
                m.title() == null ? null : m.title().romaji(),
                m.title() == null ? null : m.title().english(),
                m.title() == null ? null : m.title().nativeTitle(),
                m.description(),
                m.format(),
                m.status(),
                m.episodes(),
                m.duration(),
                m.seasonYear(),
                m.season(),
                m.averageScore(),
                m.popularity(),
                m.genres() == null ? List.of() : m.genres(),
                studioNames(m.studios()),
                cover(m.coverImage()),
                m.bannerImage(),
                fuzzyDate(m.startDate()),
                nextAiring(m.nextAiringEpisode()),
                m.siteUrl(),
                PROVIDER_CODE);
    }

    /** Uu tien tieu de tieng Anh, roi romaji, roi tieng Nhat. */
    private String displayTitle(AniListModels.Title title) {
        if (title == null) {
            return null;
        }
        if (title.english() != null && !title.english().isBlank()) {
            return title.english();
        }
        if (title.romaji() != null && !title.romaji().isBlank()) {
            return title.romaji();
        }
        return title.nativeTitle();
    }

    private String cover(AniListModels.CoverImage image) {
        if (image == null) {
            return null;
        }
        return image.extraLarge() != null ? image.extraLarge() : image.large();
    }

    private List<String> studioNames(AniListModels.Studios studios) {
        if (studios == null || studios.nodes() == null) {
            return List.of();
        }
        return studios.nodes().stream()
                .map(AniListModels.Studios.Node::name)
                .filter(name -> name != null && !name.isBlank())
                .toList();
    }

    /** Ghep FuzzyDate thanh yyyy-MM-dd; thieu ngay/thang thi chi tra phan co. */
    private String fuzzyDate(AniListModels.FuzzyDate date) {
        if (date == null || date.year() == null) {
            return null;
        }
        if (date.month() == null) {
            return String.valueOf(date.year());
        }
        if (date.day() == null) {
            return String.format(Locale.ROOT, "%04d-%02d", date.year(), date.month());
        }
        return String.format(Locale.ROOT, "%04d-%02d-%02d", date.year(), date.month(), date.day());
    }

    private AnimeDetail.NextAiring nextAiring(AniListModels.NextAiring next) {
        if (next == null || next.airingAt() == null) {
            return null;
        }
        return new AnimeDetail.NextAiring(
                next.episode(),
                Instant.ofEpochSecond(next.airingAt()).toString());
    }

    /**
     * Than yeu cau GraphQL.
     *
     * @param query     cau truy van
     * @param variables cac bien di kem
     */
    private record GraphQLRequest(String query, Map<String, Object> variables) {
    }
}
