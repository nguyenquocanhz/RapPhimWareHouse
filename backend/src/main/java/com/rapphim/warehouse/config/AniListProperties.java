package com.rapphim.warehouse.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cau hinh AniList, doc tu tien to {@code rapphim.anilist}.
 *
 * <p>AniList la nguon METADATA anime hop phap (khong phat video). API GraphQL cong
 * khai, KHONG can khoa - nen o day chi co dia chi endpoint. Anh AniList tra ve la
 * URL tuyet doi nen khong can ghep CDN nhu TMDB.</p>
 *
 * @param baseUrl endpoint GraphQL cua AniList
 */
@ConfigurationProperties(prefix = "rapphim.anilist")
public record AniListProperties(String baseUrl) {

    public AniListProperties {
        baseUrl = (baseUrl == null || baseUrl.isBlank()) ? "https://graphql.anilist.co" : baseUrl;
    }
}
