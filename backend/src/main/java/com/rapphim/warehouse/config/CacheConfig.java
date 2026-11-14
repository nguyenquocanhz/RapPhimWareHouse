package com.rapphim.warehouse.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.annotation.PreDestroy;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

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

    /** Danh sach kenh truyen hinh (iptv-org): gan nhu tinh, giu lau. */
    public static final String TV_CHANNELS_CACHE = "tvChannels";

    /**
     * Danh sach phim: sau {@code LIST_SOFT_TTL} van tra ban cu ngay va lam moi o nen;
     * qua {@code LIST_HARD_TTL} moi xoa han. Truoc day het 5 phut la nguoi xem ke tiep
     * phai cho nguon tra loi (0,2-0,7 giay, cham hon khi nguon chap chon).
     */
    static final Duration LIST_SOFT_TTL = Duration.ofMinutes(5);
    static final Duration LIST_HARD_TTL = Duration.ofMinutes(30);

    /**
     * Luong lam moi nen cho cache danh sach. It luong + hang doi ngan: day chi la viec
     * phu, day hang thi bo qua (lan goi sau thu lai) chu khong de don ap len nguon.
     */
    /**
     * Khong khai bao thanh bean: Spring Boot thay mot bean kieu {@code Executor} se bo
     * {@code applicationTaskExecutor} mac dinh cua no. Giu noi bo, tat khi dong ung dung.
     */
    private final ThreadPoolExecutor cacheRefreshExecutor = newRefreshExecutor();

    @PreDestroy
    void shutdownRefreshExecutor() {
        cacheRefreshExecutor.shutdownNow();
    }

    private static ThreadPoolExecutor newRefreshExecutor() {
        AtomicInteger seq = new AtomicInteger();
        ThreadFactory factory = runnable -> {
            Thread thread = new Thread(runnable, "cache-refresh-" + seq.incrementAndGet());
            thread.setDaemon(true);
            return thread;
        };
        return new ThreadPoolExecutor(4, 4, 60, TimeUnit.SECONDS,
                new ArrayBlockingQueue<>(64), factory, new ThreadPoolExecutor.AbortPolicy());
    }

    @Bean
    public CacheManager cacheManager() {
        // SimpleCacheManager chu khong phai CaffeineCacheManager: cache danh sach la lop
        // tu viet (StaleWhileRevalidateCache), CaffeineCacheManager chi nhan cache Caffeine.
        // Ten cache la co dinh - them cache moi thi phai khai bao o day.
        SimpleCacheManager manager = new SimpleCacheManager();
        manager.setCaches(List.of(
                new StaleWhileRevalidateCache(MOVIE_LIST_CACHE, 500,
                        LIST_SOFT_TTL, LIST_HARD_TTL, cacheRefreshExecutor),
                caffeine(MOVIE_DETAIL_CACHE, 1000, Duration.ofMinutes(30)),
                caffeine(TAXONOMY_CACHE, 32, Duration.ofHours(12)),
                caffeine(HOMELAB_LIBRARY_CACHE, 4, Duration.ofMinutes(3)),
                caffeine(TV_CHANNELS_CACHE, 4, Duration.ofHours(12))));
        return manager;
    }

    private static CaffeineCache caffeine(String name, long maximumSize, Duration ttl) {
        return new CaffeineCache(name, Caffeine.newBuilder()
                .maximumSize(maximumSize)
                .expireAfterWrite(ttl)
                .build());
    }
}
