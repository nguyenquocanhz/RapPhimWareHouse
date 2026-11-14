package com.rapphim.warehouse.service;

import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.config.CacheConfig;
import com.rapphim.warehouse.config.StaleWhileRevalidateCache;
import com.rapphim.warehouse.dto.MovieQuery;
import com.rapphim.warehouse.dto.MovieSummary;
import com.rapphim.warehouse.provider.MovieProvider;
import com.rapphim.warehouse.provider.ProviderRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

/**
 * Kiem tra cache qua proxy Spring that: {@code @Cacheable(sync = true)} phai di vao
 * {@link StaleWhileRevalidateCache} va gop cac request trung nhau.
 */
@SpringJUnitConfig
@Import({CacheConfig.class, MovieService.class})
class MovieServiceCacheTest {

    @MockitoBean
    private ProviderRegistry registry;

    @Autowired
    private MovieService movieService;

    @Autowired
    private CacheManager cacheManager;

    @Test
    void cacheDanhSachLaStaleWhileRevalidate() {
        assertThat(cacheManager.getCache(CacheConfig.MOVIE_LIST_CACHE))
                .isInstanceOf(StaleWhileRevalidateCache.class);
    }

    @Test
    void nhieuRequestTrungNhauChiGoiNguonMotLan() throws Exception {
        AtomicInteger calls = new AtomicInteger();
        MovieProvider provider = mock(MovieProvider.class);
        given(provider.latest(any())).willAnswer(inv -> {
            calls.incrementAndGet();
            Thread.sleep(150);
            return PageResponse.<MovieSummary>of(List.of(), null, "kkphim");
        });
        given(registry.get("kkphim")).willReturn(provider);

        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(6);
        try {
            List<Future<?>> futures = new java.util.ArrayList<>();
            for (int i = 0; i < 6; i++) {
                futures.add(pool.submit(() -> {
                    start.await();
                    return movieService.latest("kkphim", MovieQuery.of(1, 24));
                }));
            }
            start.countDown();
            for (Future<?> f : futures) {
                f.get(5, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }

        assertThat(calls).hasValue(1);
    }
}
