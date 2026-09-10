package com.rapphim.warehouse.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cau hinh Jikan (API khong chinh thuc cua MyAnimeList), doc tu {@code rapphim.jikan}.
 *
 * <p>Nguon METADATA anime du phong cho AniList. REST, khong can khoa. Anh Jikan tra ve
 * la URL tuyet doi.</p>
 *
 * @param baseUrl goc REST API cua Jikan v4
 */
@ConfigurationProperties(prefix = "rapphim.jikan")
public record JikanProperties(String baseUrl) {

    public JikanProperties {
        baseUrl = (baseUrl == null || baseUrl.isBlank()) ? "https://api.jikan.moe/v4" : baseUrl;
    }
}
