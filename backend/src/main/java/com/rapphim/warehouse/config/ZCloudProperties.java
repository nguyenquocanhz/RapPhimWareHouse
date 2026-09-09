package com.rapphim.warehouse.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Cau hinh kho phim rieng tren homelab, doc tu tien to {@code rapphim.zcloud}.
 *
 * <p>Kho nay la mot dich vu ZCloud (FastAPI + S3) chay trong mang noi bo. No bat
 * dang nhap, va giong nhu khoa TMDB, <b>khong duoc dat khoa trong ma nguon</b>. Dat
 * qua bien moi truong truoc khi chay:</p>
 *
 * <ul>
 *   <li>{@code ZCLOUD_API_KEY} - khoa goi thang, gui qua header {@code x-api-key} (uu tien)</li>
 *   <li>{@code ZCLOUD_PASSWORD} - mat khau dang nhap, dung khi chua tao khoa</li>
 * </ul>
 *
 * <p>Thieu ca hai thi nguon {@code homelab} tu tat: cac endpoint cua no tra ve danh
 * sach rong thay vi lam hong ca API, dung nhu cach TMDB dang lam.</p>
 *
 * @param baseUrl       goc REST API cua ZCloud
 * @param apiKey        khoa goi thang
 * @param password      mat khau dang nhap, chi dung khi khong co khoa
 * @param prefix        thu muc goc chua phim trong kho
 * @param presignExpiry thoi han cua duong dan phat truc tiep
 * @param pageSize      so muc lay moi lan goi khi duyet kho
 */
@ConfigurationProperties(prefix = "rapphim.zcloud")
public record ZCloudProperties(
        String baseUrl,
        String apiKey,
        String password,
        String prefix,
        Duration presignExpiry,
        int pageSize
) {

    public ZCloudProperties {
        baseUrl = blankTo(baseUrl, "http://192.168.100.169:8080");
        prefix = normalisePrefix(prefix);
        presignExpiry = presignExpiry == null ? Duration.ofHours(6) : presignExpiry;
        pageSize = pageSize <= 0 ? 1000 : pageSize;
        apiKey = emptyToNull(apiKey);
        password = emptyToNull(password);
    }

    /** Da co cach xac thuc voi kho chua. */
    public boolean isConfigured() {
        return apiKey != null || password != null;
    }

    /** Khoa goi thang khong can giu phien, nen luon uu tien hon dang nhap bang mat khau. */
    public boolean usesApiKey() {
        return apiKey != null;
    }

    /** Thu muc goc luon ket thuc bang "/" de ghep khoa cho gon. */
    private static String normalisePrefix(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String trimmed = value.trim();
        while (trimmed.startsWith("/")) {
            trimmed = trimmed.substring(1);
        }
        return trimmed.isEmpty() || trimmed.endsWith("/") ? trimmed : trimmed + "/";
    }

    private static String blankTo(String value, String fallback) {
        return (value == null || value.isBlank()) ? fallback : value;
    }

    private static String emptyToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }
}
