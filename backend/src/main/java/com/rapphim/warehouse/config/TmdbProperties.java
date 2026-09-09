package com.rapphim.warehouse.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cau hinh TheMovieDB, doc tu tien to {@code rapphim.tmdb}.
 *
 * <p>Khoa API khong duoc dat cung trong ma nguon. Dat qua bien moi truong
 * {@code TMDB_ACCESS_TOKEN} (token v4, uu tien) hoac {@code TMDB_API_KEY} (khoa v3).
 * Khi ca hai cung trong, cac endpoint TMDB tra ve 503 kem ma
 * {@code TMDB_NOT_CONFIGURED}, phan con lai cua API van chay binh thuong.</p>
 *
 * @param baseUrl      goc REST API cua TMDB
 * @param imageBaseUrl goc CDN anh, ghep voi duong dan tuong doi tra ve tu TMDB
 * @param apiKey       khoa API v3, gui qua query param {@code api_key}
 * @param accessToken  token doc v4, gui qua header Authorization
 * @param language     ngon ngu metadata mong muon
 */
@ConfigurationProperties(prefix = "rapphim.tmdb")
public record TmdbProperties(
        String baseUrl,
        String imageBaseUrl,
        String apiKey,
        String accessToken,
        String language
) {

    public TmdbProperties {
        baseUrl = blankTo(baseUrl, "https://api.themoviedb.org/3");
        imageBaseUrl = blankTo(imageBaseUrl, "https://image.tmdb.org/t/p");
        language = blankTo(language, "vi-VN");
        apiKey = emptyToNull(apiKey);
        accessToken = emptyToNull(accessToken);
    }

    /** Da co khoa de goi TMDB hay chua. */
    public boolean isConfigured() {
        return apiKey != null || accessToken != null;
    }

    /** Uu tien token v4 vi TMDB dang khuyen nghi dung dang nay. */
    public boolean usesBearerToken() {
        return accessToken != null;
    }

    /**
     * Ghep duong dan anh tuong doi cua TMDB voi CDN.
     *
     * @param path duong dan dang {@code /abc.jpg}, co the null
     * @param size kich thuoc TMDB ho tro, vi du {@code w500} hoac {@code original}
     */
    public String imageUrl(String path, String size) {
        if (path == null || path.isBlank()) {
            return null;
        }
        String base = imageBaseUrl.endsWith("/")
                ? imageBaseUrl.substring(0, imageBaseUrl.length() - 1)
                : imageBaseUrl;
        String suffix = path.startsWith("/") ? path : "/" + path;
        return base + "/" + size + suffix;
    }

    private static String blankTo(String value, String fallback) {
        return (value == null || value.isBlank()) ? fallback : value;
    }

    private static String emptyToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }
}
