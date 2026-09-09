package com.rapphim.warehouse.service;

import com.rapphim.warehouse.dto.MovieSummary;
import com.rapphim.warehouse.dto.ProviderType;
import com.rapphim.warehouse.exception.ResourceNotFoundException;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Tra trang thai hien tai cua nhieu phim trong mot lan goi.
 *
 * <p>Dung cho trang thong bao cua giao dien: thu vien ca nhan nam trong trinh duyet,
 * client gui len danh sach slug dang theo doi va nhan ve trang thai moi nhat de
 * tu so sanh xem co tap moi hay khong.</p>
 *
 * <p>Hai nguon deu khong co API tra hang loat nen phai goi tung phim. Cac lan goi
 * chay song song tren mot nhom luong nho de nguoi dung khong phai cho lau, va di qua
 * {@link MovieService} nen van dung duoc cache chi tiet phim.</p>
 */
@Service
public class MovieBatchService {

    private static final Logger log = LoggerFactory.getLogger(MovieBatchService.class);

    /** Chan so phim moi lan goi, tranh mot request keo theo qua nhieu luot goi nguon. */
    public static final int MAX_SLUGS = 30;

    /** Du de rut ngan thoi gian cho ma khong don dap len nguon. */
    private static final int PARALLELISM = 6;

    private final MovieService movieService;
    private final ExecutorService executor = Executors.newFixedThreadPool(PARALLELISM, runnable -> {
        Thread thread = new Thread(runnable, "movie-batch");
        thread.setDaemon(true);
        return thread;
    });

    public MovieBatchService(MovieService movieService) {
        this.movieService = movieService;
    }

    /**
     * @param provider nguon can tra
     * @param slugs    danh sach slug, toi da {@value #MAX_SLUGS}
     * @return trang thai hien tai cua cac phim tim thay, bo qua phim khong con ton tai
     */
    public List<MovieSummary> findAll(String provider, List<String> slugs) {
        List<String> wanted = slugs.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(slug -> !slug.isEmpty())
                .distinct()
                .toList();

        if (wanted.isEmpty()) {
            return List.of();
        }
        if (wanted.size() > MAX_SLUGS) {
            throw new IllegalArgumentException(
                    "Chi tra duoc toi da " + MAX_SLUGS + " phim moi lan, dang gui " + wanted.size());
        }

        List<CompletableFuture<MovieSummary>> tasks = wanted.stream()
                .map(slug -> CompletableFuture.supplyAsync(() -> lookup(provider, slug), executor))
                .toList();

        return tasks.stream()
                .map(CompletableFuture::join)
                .filter(Objects::nonNull)
                .toList();
    }

    /** Mot phim hong khong duoc lam hong ca danh sach, nen loi tra ve null. */
    private MovieSummary lookup(String provider, String slug) {
        try {
            return MovieSummary.from(movieService.findBySlug(provider, slug));
        } catch (ResourceNotFoundException ex) {
            return null;
        } catch (RuntimeException ex) {
            log.warn("Bo qua phim '{}' khi tra hang loat: {}", slug, ex.getMessage());
            return null;
        }
    }

    @PreDestroy
    void shutdown() {
        executor.shutdown();
    }
}
