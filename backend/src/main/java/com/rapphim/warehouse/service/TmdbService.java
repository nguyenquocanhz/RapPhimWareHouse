package com.rapphim.warehouse.service;

import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.config.CacheConfig;
import com.rapphim.warehouse.dto.MovieDetail;
import com.rapphim.warehouse.dto.Taxonomy;
import com.rapphim.warehouse.dto.TmdbDetail;
import com.rapphim.warehouse.dto.TmdbDiscoverItem;
import com.rapphim.warehouse.dto.TmdbDiscoverQuery;
import com.rapphim.warehouse.provider.tmdb.TmdbClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Tang nghiep vu cho TheMovieDB: doi chieu phim cua nguon sang ban ghi TMDB
 * va cache lai ket qua.
 */
@Service
public class TmdbService {

    private static final Logger log = LoggerFactory.getLogger(TmdbService.class);

    private final TmdbClient client;

    public TmdbService(TmdbClient client) {
        this.client = client;
    }

    public boolean isConfigured() {
        return client.isConfigured();
    }

    /**
     * Metadata TMDB cua mot phim, doi chieu qua ma TMDB ma nguon phim tra kem.
     *
     * @return rong neu nguon khong kem ma TMDB hoac TMDB khong co ban ghi
     */
    @Cacheable(cacheNames = CacheConfig.MOVIE_DETAIL_CACHE,
            key = "'tmdb:' + #movie.provider() + ':' + #movie.slug()")
    public Optional<TmdbDetail> enrich(MovieDetail movie) {
        if (movie.tmdb() == null || !movie.tmdb().isUsable()) {
            return Optional.empty();
        }
        return client.details(movie.tmdb().type(), movie.tmdb().id());
    }

    /**
     * Nhu {@link #enrich(MovieDetail)} nhung nuot moi loi.
     * Dung cho luong sinh NFO: thieu TMDB thi van phai xuat duoc file.
     */
    public Optional<TmdbDetail> enrichQuietly(MovieDetail movie) {
        if (!isConfigured()) {
            return Optional.empty();
        }
        try {
            return enrich(movie);
        } catch (RuntimeException ex) {
            log.warn("Bo qua metadata TMDB cho '{}': {}", movie.slug(), ex.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Metadata cua mot ban ghi TMDB tra theo ma, khong can phim do co trong
     * kho cua hai nguon. Trang kham pha dung ham nay.
     *
     * @param type {@code movie} hoac {@code tv}
     * @param id   ma tren TMDB
     */
    @Cacheable(cacheNames = CacheConfig.MOVIE_DETAIL_CACHE, key = "'tmdb:' + #type + ':' + #id")
    public Optional<TmdbDetail> details(String type, String id) {
        return client.details(type, id);
    }

    @Cacheable(cacheNames = CacheConfig.MOVIE_LIST_CACHE,
            key = "'tmdb:discover:' + #query.page() + ':' + #query.sortBy() + ':' + #query.withGenres()"
                    + " + ':' + #query.withOriginalLanguage() + ':' + #query.year()"
                    + " + ':' + #query.voteAverageGte() + ':' + #query.voteCountGte()"
                    + " + ':' + #query.region() + ':' + #query.includeAdult()")
    public PageResponse<TmdbDiscoverItem> discover(TmdbDiscoverQuery query) {
        return client.discoverMovies(query);
    }

    @Cacheable(cacheNames = CacheConfig.TAXONOMY_CACHE, key = "'tmdb:genres:' + #type")
    public List<Taxonomy> genres(String type) {
        return client.genres(type);
    }
}
