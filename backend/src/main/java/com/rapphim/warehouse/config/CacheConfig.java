package com.rapphim.warehouse.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Cache trong bo nho cho ket qua goi nguon ngoai, giam so lan goi lai va tang toc do phan hoi.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    /** Danh sach phim: doi moi nhanh nen giu ngan. */
    public static final String MOVIE_LIST_CACHE = "movieLists";

    /** Chi tiet phim: on dinh hon, giu lau hon. */
    public static final String MOVIE_DETAIL_CACHE = "movieDetails";

    /** The loai / quoc gia: gan nhu tinh. */
    public static final String TAXONOMY_CACHE = "taxonomies";

    /**
     * Cay file cua kho rieng.
     *
     * <p>Moi lan dung lai phai duyet ca kho nen bat buoc phai dem. Giu ngan thoi de
     * copy phim moi vao homelab thi doi mot lat la thay, khong phai khoi dong lai.</p>
     */
    public static final String HOMELAB_LIBRARY_CACHE = "homelabLibrary";

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.registerCustomCache(MOVIE_LIST_CACHE, Caffeine.newBuilder()
                .maximumSize(500)
                .expireAfterWrite(Duration.ofMinutes(5))
                .build());
        manager.registerCustomCache(MOVIE_DETAIL_CACHE, Caffeine.newBuilder()
                .maximumSize(1000)
                .expireAfterWrite(Duration.ofMinutes(30))
                .build());
        manager.registerCustomCache(TAXONOMY_CACHE, Caffeine.newBuilder()
                .maximumSize(32)
                .expireAfterWrite(Duration.ofHours(12))
                .build());
        manager.registerCustomCache(HOMELAB_LIBRARY_CACHE, Caffeine.newBuilder()
                .maximumSize(4)
                .expireAfterWrite(Duration.ofMinutes(3))
                .build());
        return manager;
    }
}
