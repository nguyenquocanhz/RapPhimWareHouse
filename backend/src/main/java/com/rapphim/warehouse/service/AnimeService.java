package com.rapphim.warehouse.service;

import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.config.CacheConfig;
import com.rapphim.warehouse.dto.AnimeDetail;
import com.rapphim.warehouse.dto.AnimeSummary;
import com.rapphim.warehouse.exception.UpstreamException;
import com.rapphim.warehouse.provider.AnimeMetadataProvider;
import com.rapphim.warehouse.provider.anilist.AniListClient;
import com.rapphim.warehouse.provider.jikan.JikanClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * Tang nghiep vu metadata anime: AniList lam nguon chinh, Jikan (MyAnimeList) lam du
 * phong, va cache lai ket qua.
 *
 * <h2>Du phong o dau, va o dau KHONG</h2>
 * <p>Danh sach thinh hanh / tim kiem / the loai: het AniList thi sang Jikan - noi dung
 * khac nhau khong sao, van la anime. Nhung CHI TIET theo ma thi KHONG duoc du phong mu:
 * ma AniList va MyAnimeList khac khong gian, id 21 hai ben la hai anime khac nhau. Nen
 * chi tiet dinh tuyen theo {@code source} ma moi ket qua da mang san
 * ({@link AnimeSummary#source()}).</p>
 */
@Service
public class AnimeService {

    private static final Logger log = LoggerFactory.getLogger(AnimeService.class);

    private final AniListClient anilist;
    private final JikanClient jikan;

    public AnimeService(AniListClient anilist, JikanClient jikan) {
        this.anilist = anilist;
        this.jikan = jikan;
    }

    @Cacheable(cacheNames = CacheConfig.MOVIE_LIST_CACHE, key = "'anime:trending:' + #page + ':' + #perPage")
    public PageResponse<AnimeSummary> trending(int page, int perPage) {
        return withFallback(() -> anilist.trending(page, perPage), () -> jikan.trending(page, perPage));
    }

    @Cacheable(cacheNames = CacheConfig.MOVIE_LIST_CACHE,
            key = "'anime:search:' + #keyword + ':' + #page + ':' + #perPage")
    public PageResponse<AnimeSummary> search(String keyword, int page, int perPage) {
        return withFallback(() -> anilist.search(keyword, page, perPage),
                () -> jikan.search(keyword, page, perPage));
    }

    @Cacheable(cacheNames = CacheConfig.TAXONOMY_CACHE, key = "'anime:genres'")
    public List<String> genres() {
        return withFallback(anilist::genres, jikan::genres);
    }

    /**
     * Chi tiet theo ma, dinh tuyen theo nguon. KHONG du phong sang nguon khac vi ma
     * khac khong gian.
     *
     * @param source {@code "jikan"} thi hoi Jikan, con lai mac dinh AniList
     */
    @Cacheable(cacheNames = CacheConfig.MOVIE_DETAIL_CACHE, key = "'anime:' + #source + ':' + #id")
    public Optional<AnimeDetail> details(int id, String source) {
        return provider(source).details(id);
    }

    private AnimeMetadataProvider provider(String source) {
        return "jikan".equalsIgnoreCase(source) ? jikan : anilist;
    }

    /**
     * Goi nguon chinh; neu no bao loi upstream thi sang nguon du phong. Loi cua nguon
     * du phong thi de noi len - ca hai deu hong thi yeu cau that su hong.
     */
    private <T> T withFallback(Supplier<T> primary, Supplier<T> fallback) {
        try {
            return primary.get();
        } catch (UpstreamException ex) {
            log.warn("AniList lỗi ({}), chuyển sang Jikan dự phòng.", ex.getMessage());
            return fallback.get();
        }
    }
}
