package com.rapphim.warehouse.service;

import com.rapphim.warehouse.provider.homelab.ZCloudClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/**
 * Sinh anh poster cho video trong kho rieng bang cach bat mot khung hinh qua ffmpeg.
 *
 * <p>ZCloud khong co san anh cho file video, nen anh duoc tao mot lan roi cache ra dia
 * (o {@code /app/data/thumbs}, nam trong volume ben lau). Lan dau xem moi phai chay
 * ffmpeg; sau do tra thang file da cache.</p>
 *
 * <p>ffmpeg doc video qua duong tam co ho tro Range nen chi tai quanh moc {@code -ss},
 * khong keo ca file. Gioi han so tien trinh cung luc de trang danh sach nhieu the khong
 * lam bung CPU/RAM cua homelab.</p>
 */
@Service
public class ThumbnailService {

    private static final Logger log = LoggerFactory.getLogger(ThumbnailService.class);

    private final ZCloudClient client;
    private final Path cacheDir;
    private final int seekSeconds;
    private final int width;
    private final Semaphore limit;

    public ThumbnailService(
            ZCloudClient client,
            @Value("${rapphim.zcloud.thumb-dir:/app/data/thumbs}") String cacheDir,
            @Value("${rapphim.zcloud.thumb-seek:5}") int seekSeconds,
            @Value("${rapphim.zcloud.thumb-width:480}") int width,
            @Value("${rapphim.zcloud.thumb-concurrency:2}") int concurrency) {
        this.client = client;
        this.cacheDir = Path.of(cacheDir);
        this.seekSeconds = Math.max(0, seekSeconds);
        this.width = Math.max(120, width);
        this.limit = new Semaphore(Math.max(1, concurrency));
    }

    /**
     * Tra ve JPEG poster cho mot file video, hoac {@code null} khi khong tao duoc
     * (video loi, ffmpeg vang mat, het thoi gian...). Controller se tra 404 va giao
     * dien tu chuyen sang o giu cho.
     */
    public byte[] forKey(String videoKey) {
        if (videoKey == null || videoKey.isBlank()) {
            return null;
        }

        Path cache = cacheDir.resolve(hash(videoKey) + ".jpg");
        byte[] cached = readIfPresent(cache);
        if (cached != null) {
            return cached;
        }

        boolean acquired = false;
        try {
            acquired = limit.tryAcquire(30, TimeUnit.SECONDS);
            if (!acquired) {
                return null;
            }
            // Mot luong khac co the vua tao xong trong luc minh cho khe.
            cached = readIfPresent(cache);
            if (cached != null) {
                return cached;
            }

            String url = client.presign(videoKey);
            if (url == null) {
                return null;
            }

            byte[] jpg = extractFrame(url);
            if (jpg != null && jpg.length > 0) {
                writeQuietly(cache, jpg);
                return jpg;
            }
            return null;
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            return null;
        } catch (Exception ex) {
            log.warn("Không tạo được thumbnail cho {}: {}", videoKey, ex.getMessage());
            return null;
        } finally {
            if (acquired) {
                limit.release();
            }
        }
    }

    /** Chay ffmpeg bat mot khung hinh, tra JPEG. Doc stdout o luong rieng de mot ffmpeg
     * treo van bi cat theo thoi han thay vi ket cung o {@code readAllBytes}. */
    private byte[] extractFrame(String url) throws Exception {
        Process process = new ProcessBuilder(
                "ffmpeg", "-nostdin", "-loglevel", "error",
                "-ss", String.valueOf(seekSeconds), "-i", url,
                "-frames:v", "1", "-vf", "scale=" + width + ":-2",
                "-q:v", "4", "-f", "mjpeg", "pipe:1")
                .redirectError(ProcessBuilder.Redirect.DISCARD)
                .start();

        CompletableFuture<byte[]> stdout = CompletableFuture.supplyAsync(() -> {
            try (var in = process.getInputStream()) {
                return in.readAllBytes();
            } catch (Exception ex) {
                return new byte[0];
            }
        });

        if (!process.waitFor(25, TimeUnit.SECONDS)) {
            process.destroyForcibly();
            return null;
        }
        byte[] out = stdout.get(5, TimeUnit.SECONDS);
        return process.exitValue() == 0 ? out : null;
    }

    private static byte[] readIfPresent(Path path) {
        try {
            if (Files.isReadable(path)) {
                return Files.readAllBytes(path);
            }
        } catch (Exception ignored) {
            // Coi nhu chua co cache.
        }
        return null;
    }

    private void writeQuietly(Path path, byte[] data) {
        try {
            Files.createDirectories(cacheDir);
            Files.write(path, data);
        } catch (Exception ex) {
            log.warn("Không ghi được cache thumbnail {}: {}", path, ex.getMessage());
        }
    }

    private static String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest).substring(0, 24);
        } catch (Exception ex) {
            return Integer.toHexString(value.hashCode());
        }
    }
}
