package com.rapphim.warehouse.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.Ticker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.support.SimpleValueWrapper;

import java.time.Duration;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;

/**
 * Cache "tra ban cu, lam moi o nen" (stale-while-revalidate) cho Spring {@code @Cacheable}.
 *
 * <h2>Vi sao khong dung refreshAfterWrite cua Caffeine</h2>
 * <p>refreshAfterWrite can mot {@code CacheLoader} chung biet tu khoa dung lai gia tri.
 * Voi {@code @Cacheable}, cach tinh gia tri nam trong tung lan goi ham (Callable Spring
 * truyen vao), khoa chi la chuoi - loader chung khong biet goi nguon nao. Nen tu lam:
 * moi muc nho thoi diem nap, qua {@code softTtl} thi van tra ban cu ngay va dung chinh
 * Callable cua lan goi do de lam moi o nen.</p>
 *
 * <h2>Hai moc thoi gian</h2>
 * <ul>
 *   <li>{@code softTtl}: qua moc nay thi muc "cu" - van tra ra nhung kich lam moi.</li>
 *   <li>{@code hardTtl}: qua moc nay thi muc bi xoa han (expireAfterWrite). Nguon chet
 *       lau thi nguoi xem thay loi that, khong bi phuc vu du lieu cu mai mai.</li>
 * </ul>
 *
 * <p>Lam moi that bai thi giu nguyen ban cu toi {@code hardTtl}: nguon chap chon vai
 * phut khong lam trang chu trang tron. Chi dung voi {@code @Cacheable(sync = true)} moi
 * co tac dung, vi chi khi do Spring moi goi {@link #get(Object, Callable)}.</p>
 */
public class StaleWhileRevalidateCache implements org.springframework.cache.Cache {

    private static final Logger log = LoggerFactory.getLogger(StaleWhileRevalidateCache.class);

    /** Gia tri kem thoi diem nap (nano giay theo ticker). {@code value} co the null. */
    private record Entry(Object value, long loadedAt) {
    }

    private final String name;
    private final Cache<Object, Entry> store;
    private final long softTtlNanos;
    private final Ticker ticker;
    private final Executor refresher;

    /** Khoa dang duoc lam moi, de mot khoa khong bi lam moi chong nhieu lan cung luc. */
    private final Set<Object> refreshing = ConcurrentHashMap.newKeySet();

    public StaleWhileRevalidateCache(String name, long maximumSize, Duration softTtl, Duration hardTtl,
                                     Executor refresher) {
        this(name, maximumSize, softTtl, hardTtl, refresher, Ticker.systemTicker());
    }

    StaleWhileRevalidateCache(String name, long maximumSize, Duration softTtl, Duration hardTtl,
                              Executor refresher, Ticker ticker) {
        if (softTtl.compareTo(hardTtl) >= 0) {
            throw new IllegalArgumentException("softTtl phai nho hon hardTtl");
        }
        this.name = name;
        this.softTtlNanos = softTtl.toNanos();
        this.ticker = ticker;
        this.refresher = refresher;
        // Van giu maximumSize + expireAfterWrite: heap co tran that (xem backend-java.md).
        this.store = Caffeine.newBuilder()
                .maximumSize(maximumSize)
                .expireAfterWrite(hardTtl)
                .ticker(ticker)
                .build();
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public Object getNativeCache() {
        return store;
    }

    @Override
    public ValueWrapper get(Object key) {
        Entry entry = store.getIfPresent(key);
        return entry == null ? null : new SimpleValueWrapper(entry.value());
    }

    @Override
    @SuppressWarnings("unchecked")
    public <T> T get(Object key, Class<T> type) {
        Entry entry = store.getIfPresent(key);
        if (entry == null || entry.value() == null) {
            return null;
        }
        if (type != null && !type.isInstance(entry.value())) {
            throw new IllegalStateException("Gia tri trong cache khong phai kieu " + type.getName());
        }
        return (T) entry.value();
    }

    @Override
    @SuppressWarnings("unchecked")
    public <T> T get(Object key, Callable<T> valueLoader) {
        Entry entry = store.getIfPresent(key);
        if (entry == null) {
            // Caffeine khoa theo tung khoa: N request cung luc chi goi nguon mot lan.
            entry = store.get(key, k -> new Entry(load(k, valueLoader), ticker.read()));
            return (T) entry.value();
        }
        if (ticker.read() - entry.loadedAt() >= softTtlNanos) {
            scheduleRefresh(key, valueLoader);
        }
        return (T) entry.value();
    }

    private void scheduleRefresh(Object key, Callable<?> valueLoader) {
        if (!refreshing.add(key)) {
            return;
        }
        try {
            refresher.execute(() -> {
                try {
                    store.put(key, new Entry(valueLoader.call(), ticker.read()));
                } catch (Exception ex) {
                    // Giu ban cu toi hardTtl. Chi ghi log, nguoi xem van co du lieu.
                    log.warn("Làm mới cache {} khoá {} thất bại, giữ bản cũ: {}", name, key, ex.toString());
                } finally {
                    refreshing.remove(key);
                }
            });
        } catch (RejectedExecutionException ex) {
            // Hang doi day: bo lan nay, lan goi sau se thu lai.
            refreshing.remove(key);
        }
    }

    /** Boc loi giong {@code CaffeineCache} cua Spring, de CacheInterceptor go ra dung loi goc. */
    private static Object load(Object key, Callable<?> valueLoader) {
        try {
            return valueLoader.call();
        } catch (Exception ex) {
            throw new ValueRetrievalException(key, valueLoader, ex);
        }
    }

    @Override
    public void put(Object key, Object value) {
        store.put(key, new Entry(value, ticker.read()));
    }

    @Override
    public void evict(Object key) {
        store.invalidate(key);
    }

    @Override
    public void clear() {
        store.invalidateAll();
    }
}
