package com.rapphim.warehouse.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cau hinh nguon kenh truyen hinh (iptv-org), doc tu {@code rapphim.iptv}.
 *
 * <p>iptv-org la kho playlist cong khai, hop phap. Ta lay playlist Viet Nam roi phan
 * tich thanh danh sach kenh. Luong phat la cua dai/ben thu ba, khong luu tren server.</p>
 *
 * @param baseUrl goc cua iptv-org
 * @param vnPath  duong dan playlist M3U Viet Nam
 */
@ConfigurationProperties(prefix = "rapphim.iptv")
public record IptvProperties(String baseUrl, String vnPath) {

    public IptvProperties {
        baseUrl = (baseUrl == null || baseUrl.isBlank()) ? "https://iptv-org.github.io" : baseUrl;
        vnPath = (vnPath == null || vnPath.isBlank()) ? "/iptv/countries/vn.m3u" : vnPath;
    }
}
