package com.rapphim.warehouse.service;

import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.config.CacheConfig;
import com.rapphim.warehouse.dto.AnimeDetail;
import com.rapphim.warehouse.dto.AnimeSummary;
import com.rapphim.warehouse.provider.anilist.AniListClient;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Tang nghiep vu cho AniList: goi client va cache lai ket qua.
 *
 * <p>Dung chung cac cache co san (khoa co tien to {@code anilist:} de khong dung
 * do voi TMDB), giong cach TmdbService lam - khong can them cache moi.</p>
 */
@Service
public class AniListService {

    private final AniListClient client;

    public AniListService(AniListClient client) {
        this.client = client;
    }

    @Cacheable(cacheNames = CacheConfig.MOVIE_LIST_CACHE,
            key = "'anilist:trending:' + #page + ':' + #perPage")
    public PageResponse<AnimeSummary> trending(int page, int perPage) {
        return client.trending(page, perPage);
    }

    @Cacheable(cacheNames = CacheConfig.MOVIE_LIST_CACHE,
            key = "'anilist:search:' + #keyword + ':' + #page + ':' + #perPage")
    public PageResponse<AnimeSummary> search(String keyword, int page, int perPage) {
        return client.search(keyword, page, perPage);
    }

    @Cacheable(cacheNames = CacheConfig.MOVIE_DETAIL_CACHE, key = "'anilist:' + #id")
    public Optional<AnimeDetail> details(int id) {
        return client.details(id);
    }

    @Cacheable(cacheNames = CacheConfig.TAXONOMY_CACHE, key = "'anilist:genres'")
    public List<String> genres() {
        return client.genres();
    }
}
