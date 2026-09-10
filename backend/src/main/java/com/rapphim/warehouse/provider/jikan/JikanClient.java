package com.rapphim.warehouse.provider.jikan;

import com.rapphim.warehouse.common.PageMeta;
import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.dto.AnimeDetail;
import com.rapphim.warehouse.dto.AnimeSummary;
import com.rapphim.warehouse.exception.UpstreamException;
import com.rapphim.warehouse.provider.AnimeMetadataProvider;
import com.rapphim.warehouse.provider.jikan.model.JikanModels;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriBuilder;

import java.net.URI;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Cong ra Jikan - API khong chinh thuc cua MyAnimeList. Nguon METADATA anime DU PHONG
 * cho AniList (REST, khong can khoa).
 *
 * <p>Tra ve cung DTO voi AniList ({@link AnimeSummary}/{@link AnimeDetail}) de facade
 * dung lam du phong trong suot. Hai diem KHAC AniList da chuan hoa:</p>
 * <ul>
 *   <li>Diem Jikan tren thang 10, DTO dung thang 100 -&gt; nhan 10.</li>
 *   <li>Ma Jikan (MyAnimeList) KHAC khong gian ma AniList - moi ket qua danh dau
 *       {@code source="jikan"} de chi tiet goi dung nguon.</li>
 * </ul>
 */
@Component
public class JikanClient implements AnimeMetadataProvider {

    private static final Logger log = LoggerFactory.getLogger(JikanClient.class);

    private static final String PROVIDER_CODE = "jikan";

    private static final int NETWORK_ATTEMPTS = 3;
    private static final long NETWORK_BACKOFF_MS = 200;

    /** Jikan cho toi da 25 ban ghi moi trang. */
    private static final int MAX_PER_PAGE = 25;

    /** Rut so phut tu chuoi thoi luong dang "24 min per ep". */
    private static final Pattern MINUTES = Pattern.compile("(\\d+)\\s*min");

    private final RestClient client;

    public JikanClient(@Qualifier("jikanRestClient") RestClient client) {
        this.client = client;
    }

    @Override
    public String source() {
        return PROVIDER_CODE;
    }

    @Override
    public PageResponse<AnimeSummary> trending(int page, int perPage) {
        int safePer = clampPerPage(perPage);
        JikanModels.AnimePage body = get(uri -> uri.path("/top/anime")
                .queryParam("page", page)
                .queryParam("limit", safePer)
                .build(), JikanModels.AnimePage.class);
        return toPage(body, page, safePer);
    }

    @Override
    public PageResponse<AnimeSummary> search(String keyword, int page, int perPage) {
        int safePer = clampPerPage(perPage);
        JikanModels.AnimePage body = get(uri -> uri.path("/anime")
                .queryParam("q", keyword)
                .queryParam("page", page)
                .queryParam("limit", safePer)
                .build(), JikanModels.AnimePage.class);
        return toPage(body, page, safePer);
    }

    @Override
    public Optional<AnimeDetail> details(int id) {
        JikanModels.AnimeWrapper body =
                get(uri -> uri.path("/anime/{id}").build(id), JikanModels.AnimeWrapper.class);
        if (body == null || body.data() == null) {
            return Optional.empty();
        }
        return Optional.of(toDetail(body.data()));
    }

    @Override
    public List<String> genres() {
        JikanModels.GenrePage body =
                get(uri -> uri.path("/genres/anime").build(), JikanModels.GenrePage.class);
        if (body == null || body.data() == null) {
            return List.of();
        }
        return body.data().stream()
                .map(JikanModels.Genre::name)
                .filter(name -> name != null && !name.isBlank())
                .toList();
    }

    // ------------------------------------------------------------------ noi bo

    private int clampPerPage(int perPage) {
        return Math.min(Math.max(perPage, 1), MAX_PER_PAGE);
    }

    private PageResponse<AnimeSummary> toPage(JikanModels.AnimePage body, int page, int perPage) {
        if (body == null || body.data() == null) {
            return PageResponse.empty(page, perPage, PROVIDER_CODE);
        }
        List<AnimeSummary> items = body.data().stream().map(this::toSummary).toList();

        long total = items.size();
        if (body.pagination() != null && body.pagination().items() != null
                && body.pagination().items().total() != null) {
            total = body.pagination().items().total();
        } else if (body.pagination() != null && Boolean.TRUE.equals(body.pagination().hasNextPage())) {
            total = (long) page * perPage + 1;
        }
        return PageResponse.of(items, PageMeta.of(page, perPage, total), PROVIDER_CODE);
    }

    /**
     * Goi GET, thu lai khi loi MANG. Loi HTTP co ma khong thu lai: 404 tra {@code null}
     * (khong co ban ghi), con lai bao thanh {@link UpstreamException} doc duoc.
     */
    private <T> T get(Function<UriBuilder, URI> uri, Class<T> type) {
        RestClientException lastNetwork = null;
        for (int attempt = 1; attempt <= NETWORK_ATTEMPTS; attempt++) {
            try {
                return client.get().uri(uri::apply).retrieve().body(type);
            } catch (RestClientResponseException ex) {
                if (ex.getStatusCode().value() == 404) {
                    return null;
                }
                log.warn("Jikan tu choi: {}", ex.getStatusCode());
                throw new UpstreamException(PROVIDER_CODE, explain(ex), ex);
            } catch (RestClientException ex) {
                lastNetwork = ex;
                log.debug("Jikan loi mang lan {}/{}: {}", attempt, NETWORK_ATTEMPTS, ex.getMessage());
                if (!pause(attempt)) {
                    break;
                }
            }
        }
        throw UpstreamException.network(PROVIDER_CODE, "Jikan", lastNetwork);
    }

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
            return "Jikan đang giới hạn số yêu cầu, hãy chờ một lát rồi thử lại.";
        }
        if (ex.getStatusCode().is5xxServerError()) {
            return "Jikan đang gặp sự cố máy chủ, hãy thử lại sau.";
        }
        return "Jikan trả về lỗi " + code + ".";
    }

    // ------------------------------------------------------------------ chuyen doi

    private AnimeSummary toSummary(JikanModels.Anime a) {
        return new AnimeSummary(
                String.valueOf(a.malId()),
                displayTitle(a),
                a.title(),
                a.titleJapanese(),
                a.type(),
                a.episodes(),
                a.year(),
                scorePercent(a.score()),
                genreNames(a.genres()),
                imageUrl(a.images()),
                null,
                a.url(),
                PROVIDER_CODE);
    }

    private AnimeDetail toDetail(JikanModels.Anime a) {
        return new AnimeDetail(
                String.valueOf(a.malId()),
                displayTitle(a),
                a.title(),
                a.titleEnglish(),
                a.titleJapanese(),
                a.synopsis(),
                a.type(),
                a.status(),
                a.episodes(),
                minutes(a.duration()),
                a.year(),
                a.season(),
                scorePercent(a.score()),
                a.members(),
                genreNames(a.genres()),
                studioNames(a.studios()),
                imageUrl(a.images()),
                null,
                startDate(a.aired()),
                null,
                a.url(),
                PROVIDER_CODE);
    }

    /** Uu tien tieu de tieng Anh, roi tieu de chinh (romaji). */
    private String displayTitle(JikanModels.Anime a) {
        if (a.titleEnglish() != null && !a.titleEnglish().isBlank()) {
            return a.titleEnglish();
        }
        return a.title();
    }

    /** Jikan cho diem thang 10; DTO dung thang 100. */
    private Integer scorePercent(Double score) {
        return score == null ? null : (int) Math.round(score * 10);
    }

    private List<String> genreNames(List<JikanModels.Genre> genres) {
        if (genres == null) {
            return List.of();
        }
        return genres.stream()
                .map(JikanModels.Genre::name)
                .filter(name -> name != null && !name.isBlank())
                .toList();
    }

    private List<String> studioNames(List<JikanModels.Studio> studios) {
        if (studios == null) {
            return List.of();
        }
        return studios.stream()
                .map(JikanModels.Studio::name)
                .filter(name -> name != null && !name.isBlank())
                .toList();
    }

    private String imageUrl(JikanModels.Images images) {
        if (images == null || images.jpg() == null) {
            return null;
        }
        JikanModels.Images.Jpg jpg = images.jpg();
        return jpg.largeImageUrl() != null ? jpg.largeImageUrl() : jpg.imageUrl();
    }

    private Integer minutes(String duration) {
        if (duration == null) {
            return null;
        }
        Matcher matcher = MINUTES.matcher(duration);
        return matcher.find() ? Integer.valueOf(matcher.group(1)) : null;
    }

    private String startDate(JikanModels.Aired aired) {
        if (aired == null || aired.prop() == null || aired.prop().from() == null) {
            return null;
        }
        JikanModels.Aired.DateParts from = aired.prop().from();
        if (from.year() == null) {
            return null;
        }
        if (from.month() == null) {
            return String.valueOf(from.year());
        }
        if (from.day() == null) {
            return String.format(Locale.ROOT, "%04d-%02d", from.year(), from.month());
        }
        return String.format(Locale.ROOT, "%04d-%02d-%02d", from.year(), from.month(), from.day());
    }
}
