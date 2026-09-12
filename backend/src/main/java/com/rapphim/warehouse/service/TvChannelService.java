package com.rapphim.warehouse.service;

import com.rapphim.warehouse.config.CacheConfig;
import com.rapphim.warehouse.config.IptvProperties;
import com.rapphim.warehouse.dto.TvChannel;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Kenh truyen hinh truc tiep lay tu iptv-org.
 *
 * <p>Tai playlist M3U Viet Nam, phan tich thanh danh sach {@link TvChannel}. Ket qua
 * duoc cache lau (danh sach gan nhu tinh) de khoi tai lai moi lan goi. Server chi phuc
 * vu <em>danh sach</em>; luong phat van la cua dai/ben thu ba.</p>
 */
@Service
public class TvChannelService {

    private static final Pattern LOGO = Pattern.compile("tvg-logo=\"([^\"]*)\"");
    private static final Pattern TVG_ID = Pattern.compile("tvg-id=\"([^\"]*)\"");
    private static final Pattern GROUP = Pattern.compile("group-title=\"([^\"]*)\"");
    private static final Pattern TAGS = Pattern.compile("\\[[^\\]]*\\]");
    private static final Pattern SPACES = Pattern.compile("\\s+");

    private final RestClient client;
    private final IptvProperties properties;

    public TvChannelService(RestClient iptvRestClient, IptvProperties properties) {
        this.client = iptvRestClient;
        this.properties = properties;
    }

    /** Danh sach kenh VN. Cache 12h (xem {@link CacheConfig#TV_CHANNELS_CACHE}). */
    @Cacheable(cacheNames = CacheConfig.TV_CHANNELS_CACHE, key = "'vn'")
    public List<TvChannel> vietnamChannels() {
        String m3u = client.get()
                .uri(properties.vnPath())
                .retrieve()
                .body(String.class);
        return parse(m3u == null ? "" : m3u);
    }

    /** Phan tich noi dung M3U thanh danh sach kenh. */
    static List<TvChannel> parse(String text) {
        List<TvChannel> out = new ArrayList<>();
        String id = "";
        String name = "";
        String logo = null;
        String group = null;
        boolean pending = false;

        for (String raw : text.split("\\r?\\n")) {
            String line = raw.strip();
            if (line.startsWith("#EXTINF")) {
                id = first(TVG_ID, line);
                logo = emptyToNull(first(LOGO, line));
                group = emptyToNull(first(GROUP, line));
                int comma = line.lastIndexOf(',');
                name = clean(comma >= 0 ? line.substring(comma + 1) : "");
                pending = true;
            } else if (pending && !line.isEmpty() && !line.startsWith("#")) {
                if (!name.isBlank()) {
                    out.add(new TvChannel(id, name, logo, group, line));
                }
                pending = false;
            }
        }
        return out;
    }

    private static String first(Pattern p, String line) {
        Matcher m = p.matcher(line);
        return m.find() ? m.group(1) : "";
    }

    /** Bo cac the trong ngoac vuong ([Geo-blocked]...) cho ten kenh gon. */
    private static String clean(String s) {
        return SPACES.matcher(TAGS.matcher(s).replaceAll("")).replaceAll(" ").strip();
    }

    private static String emptyToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
