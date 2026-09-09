package com.rapphim.warehouse.service;

import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.config.CacheConfig;
import com.rapphim.warehouse.dto.ListType;
import com.rapphim.warehouse.dto.MovieDetail;
import com.rapphim.warehouse.dto.MovieQuery;
import com.rapphim.warehouse.dto.MovieSummary;
import com.rapphim.warehouse.dto.ProviderType;
import com.rapphim.warehouse.exception.ResourceNotFoundException;
import com.rapphim.warehouse.provider.MovieProvider;
import com.rapphim.warehouse.provider.ProviderRegistry;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/**
 * Tang nghiep vu cho phim: chon nguon, goi provider tuong ung va cache lai ket qua.
 */
@Service
public class MovieService {

    private final ProviderRegistry registry;

    public MovieService(ProviderRegistry registry) {
        this.registry = registry;
    }

    @Cacheable(cacheNames = CacheConfig.MOVIE_LIST_CACHE,
            key = "'latest:' + #provider + ':' + #query.page() + ':' + #query.limit()")
    public PageResponse<MovieSummary> latest(String provider, MovieQuery query) {
        return resolve(provider).latest(query);
    }

    @Cacheable(cacheNames = CacheConfig.MOVIE_LIST_CACHE,
            key = "'type:' + #provider + ':' + #listType + ':' + #query.page() + ':' + #query.limit()"
                    + " + ':' + #query.category() + ':' + #query.country() + ':' + #query.year()"
                    + " + ':' + #query.sortField() + ':' + #query.sortType()")
    public PageResponse<MovieSummary> listByType(String provider, ListType listType, MovieQuery query) {
        return resolve(provider).listByType(listType, query);
    }

    @Cacheable(cacheNames = CacheConfig.MOVIE_LIST_CACHE,
            key = "'search:' + #provider + ':' + #keyword.toLowerCase()"
                    + " + ':' + #query.page() + ':' + #query.limit()")
    public PageResponse<MovieSummary> search(String provider, String keyword, MovieQuery query) {
        if (keyword == null || keyword.isBlank()) {
            throw new IllegalArgumentException("Tham so 'keyword' khong duoc de trong");
        }
        return resolve(provider).search(keyword.trim(), query);
    }

    @Cacheable(cacheNames = CacheConfig.MOVIE_LIST_CACHE,
            key = "'category:' + #provider + ':' + #categorySlug + ':' + #query.page() + ':' + #query.limit()"
                    + " + ':' + #query.country() + ':' + #query.year()")
    public PageResponse<MovieSummary> listByCategory(String provider, String categorySlug, MovieQuery query) {
        return resolve(provider).listByCategory(categorySlug, query);
    }

    @Cacheable(cacheNames = CacheConfig.MOVIE_LIST_CACHE,
            key = "'country:' + #provider + ':' + #countrySlug + ':' + #query.page() + ':' + #query.limit()"
                    + " + ':' + #query.category() + ':' + #query.year()")
    public PageResponse<MovieSummary> listByCountry(String provider, String countrySlug, MovieQuery query) {
        return resolve(provider).listByCountry(countrySlug, query);
    }

    @Cacheable(cacheNames = CacheConfig.MOVIE_LIST_CACHE,
            key = "'year:' + #provider + ':' + #year + ':' + #query.page() + ':' + #query.limit()"
                    + " + ':' + #query.category() + ':' + #query.country()")
    public PageResponse<MovieSummary> listByYear(String provider, int year, MovieQuery query) {
        if (year < 1900 || year > 2100) {
            throw new IllegalArgumentException("Nam '" + year + "' nam ngoai khoang hop le 1900-2100");
        }
        return resolve(provider).listByYear(year, query);
    }

    /**
     * @throws ResourceNotFoundException neu nguon khong co phim voi slug tuong ung
     */
    @Cacheable(cacheNames = CacheConfig.MOVIE_DETAIL_CACHE, key = "#provider + ':' + #slug")
    public MovieDetail findBySlug(String provider, String slug) {
        return resolve(provider).findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("MOVIE_NOT_FOUND",
                        "Khong tim thay phim voi slug '" + slug + "' tren nguon '"
                                + resolve(provider).code() + "'"));
    }

    /**
     * Tim cai dat theo ma nguon.
     *
     * <p>Nhan chuoi chu khong nhan enum: nguon do nguoi dung tu them khong the nam
     * trong enum - enum co dinh luc bien dich - nen viec kiem tra ma hop le duoc doi
     * xuong cho registry, va ma sai van ra loi 400 nhu cu.</p>
     */
    private MovieProvider resolve(String provider) {
        return registry.get(provider);
    }
}
