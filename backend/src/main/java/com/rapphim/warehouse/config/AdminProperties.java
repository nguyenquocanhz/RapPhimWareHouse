package com.rapphim.warehouse.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Cau hinh trang quan tri, doc tu tien to {@code rapphim.admin}.
 *
 * <p>Khoa quan tri <b>khong duoc dat cung trong ma nguon</b>. Dat qua bien moi truong
 * {@code RAPPHIM_ADMIN_TOKEN}. Chua dat thi cac endpoint sua doi tra ve 503 va trang
 * quan tri chi xem duoc - an toan hon la de mo cho ai cung sua duoc nguon phim.</p>
 *
 * @param token          khoa goi cac endpoint sua doi
 * @param sourcesFile    noi luu danh sach nguon tu them
 * @param connectTimeout thoi gian cho ket noi toi nguon tu them
 * @param readTimeout    thoi gian cho du lieu tu nguon tu them
 */
@ConfigurationProperties(prefix = "rapphim.admin")
public record AdminProperties(
        String token,
        String sourcesFile,
        Duration connectTimeout,
        Duration readTimeout
) {

    public AdminProperties {
        token = (token == null || token.isBlank()) ? null : token;
        sourcesFile = (sourcesFile == null || sourcesFile.isBlank())
                ? "data/custom-sources.json"
                : sourcesFile;
        connectTimeout = connectTimeout == null ? Duration.ofSeconds(5) : connectTimeout;
        readTimeout = readTimeout == null ? Duration.ofSeconds(20) : readTimeout;
    }

    /** Da dat khoa quan tri chua. */
    public boolean isConfigured() {
        return token != null;
    }

    /** So sanh khoa gui len voi khoa da cau hinh. */
    public boolean matches(String candidate) {
        return token != null && token.equals(candidate);
    }
}
