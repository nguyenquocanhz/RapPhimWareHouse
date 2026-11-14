package com.rapphim.warehouse.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cache.Cache;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StaleWhileRevalidateCacheTest {

    private static final Duration SOFT = Duration.ofMinutes(5);
    private static final Duration HARD = Duration.ofMinutes(30);

    /** Dong ho gia, tua thoi gian bang tay. */
    private final AtomicLong now = new AtomicLong();

    /** Viec lam moi nen duoc giu lai, test tu quyet khi nao chay. */
    private final List<Runnable> queued = new ArrayList<>();

    private StaleWhileRevalidateCache cache;

    @BeforeEach
    void setUp() {
        cache = new StaleWhileRevalidateCache("t", 100, SOFT, HARD, queued::add, now::get);
    }

    private void advance(Duration d) {
        now.addAndGet(d.toNanos());
    }

    private void runQueued() {
        List<Runnable> tasks = new ArrayList<>(queued);
        queued.clear();
        tasks.forEach(Runnable::run);
    }

    @Test
    void lanDauNapRoiLanSauLayTuCache() {
        AtomicInteger calls = new AtomicInteger();

        assertThat(cache.get("k", () -> "v" + calls.incrementAndGet())).isEqualTo("v1");
        assertThat(cache.get("k", () -> "v" + calls.incrementAndGet())).isEqualTo("v1");
        assertThat(calls).hasValue(1);
        assertThat(queued).isEmpty();
    }

    @Test
    void quaSoftTtlTraBanCuNgayVaLamMoiONen() {
        cache.get("k", () -> "cu");
        advance(SOFT.plusSeconds(1));

        assertThat(cache.get("k", () -> "moi")).isEqualTo("cu");
        assertThat(queued).hasSize(1);

        runQueued();
        assertThat(cache.get("k", () -> "khong-goi")).isEqualTo("moi");
        assertThat(queued).isEmpty();
    }

    @Test
    void motKhoaChiLamMoiMotLanDuNhieuNguoiGoi() {
        cache.get("k", () -> "cu");
        advance(SOFT.plusSeconds(1));

        cache.get("k", () -> "moi");
        cache.get("k", () -> "moi");
        cache.get("k", () -> "moi");

        assertThat(queued).hasSize(1);
    }

    @Test
    void lamMoiLoiThiGiuBanCu() {
        cache.get("k", () -> "cu");
        advance(SOFT.plusSeconds(1));

        cache.get("k", () -> {
            throw new IllegalStateException("nguon chet");
        });
        runQueued();

        assertThat(cache.get("k", () -> "khong-dung")).isEqualTo("cu");
        // Khoa da duoc tha ra, lan sau van thu lam moi tiep.
        assertThat(queued).hasSize(1);
    }

    @Test
    void quaHardTtlThiNapLaiDongBo() {
        cache.get("k", () -> "cu");
        advance(HARD.plusSeconds(1));

        assertThat(cache.get("k", () -> "moi")).isEqualTo("moi");
        assertThat(queued).isEmpty();
    }

    @Test
    void loiKhiNapLanDauKhongDuocCache() {
        assertThatThrownBy(() -> cache.get("k", () -> {
            throw new IllegalStateException("nguon chet");
        })).isInstanceOf(Cache.ValueRetrievalException.class)
                .hasRootCauseInstanceOf(IllegalStateException.class);

        assertThat(cache.get("k")).isNull();
        assertThat(cache.get("k", () -> "ok")).isEqualTo("ok");
    }

    @Test
    void nhieuRequestCungLucChiGoiNguonMotLan() throws Exception {
        StaleWhileRevalidateCache real = new StaleWhileRevalidateCache("t", 100, SOFT, HARD, Runnable::run);
        AtomicInteger calls = new AtomicInteger();
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            List<Future<Object>> results = new ArrayList<>();
            for (int i = 0; i < 8; i++) {
                results.add(pool.submit(() -> {
                    start.await();
                    return real.get("k", () -> {
                        calls.incrementAndGet();
                        Thread.sleep(100);
                        return "v";
                    });
                }));
            }
            start.countDown();
            for (Future<Object> f : results) {
                assertThat(f.get(5, TimeUnit.SECONDS)).isEqualTo("v");
            }
        } finally {
            pool.shutdownNow();
        }
        assertThat(calls).hasValue(1);
    }

    @Test
    void hangDoiDayThiBoQuaVaThaKhoa() {
        StaleWhileRevalidateCache full = new StaleWhileRevalidateCache("t", 100, SOFT, HARD,
                r -> {
                    throw new java.util.concurrent.RejectedExecutionException();
                }, now::get);
        full.get("k", () -> "cu");
        advance(SOFT.plusSeconds(1));

        assertThat(full.get("k", () -> "moi")).isEqualTo("cu");
        assertThat(full.get("k", () -> "moi")).isEqualTo("cu");
    }

    @Test
    void softTtlPhaiNhoHonHardTtl() {
        assertThatThrownBy(() -> new StaleWhileRevalidateCache("t", 10, HARD, SOFT, Runnable::run))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
