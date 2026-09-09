package com.rapphim.warehouse.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Cau hinh cac nguon phim ben ngoai, doc tu tien to {@code rapphim.provider}.
 *
 * @param kkphim         cau hinh nguon KKPhim
 * @param nguonc         cau hinh nguon NguonC
 * @param connectTimeout thoi gian toi da de mo ket noi
 * @param readTimeout    thoi gian toi da cho mot phan hoi
 */
@ConfigurationProperties(prefix = "rapphim.provider")
public record ProviderProperties(
        Endpoint kkphim,
        Endpoint nguonc,
        Duration connectTimeout,
        Duration readTimeout
) {

    public ProviderProperties {
        kkphim = kkphim == null ? new Endpoint("https://phimapi.com", "https://phimimg.com") : kkphim;
        nguonc = nguonc == null ? new Endpoint("https://phim.nguonc.com", "") : nguonc;
        connectTimeout = connectTimeout == null ? Duration.ofSeconds(5) : connectTimeout;
        readTimeout = readTimeout == null ? Duration.ofSeconds(20) : readTimeout;
    }

    /**
     * @param baseUrl  goc cua REST API
     * @param cdnImage goc CDN anh, dung de ghep voi duong dan anh tuong doi
     */
    public record Endpoint(String baseUrl, String cdnImage) {
    }
}
