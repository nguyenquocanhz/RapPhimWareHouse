package com.rapphim.warehouse.service;

import com.rapphim.warehouse.config.AdminProperties;
import com.rapphim.warehouse.config.TmdbProperties;
import com.rapphim.warehouse.config.ZCloudProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Cac khoa co the dat ngay tren trang quan tri.
 *
 * <p>Truoc day khoa ZCloud va TMDB chi doc duoc tu bien moi truong, nen bang tong quan
 * chi ra "chua cau hinh" ma khong co cach nao sua - phai vao may chu, sua .env roi khoi
 * dong lai. Gio dat duoc ngay tren giao dien.</p>
 *
 * <h2>Thu tu uu tien</h2>
 * <p>Gia tri dat tren giao dien duoc dung truoc bien moi truong. Chua dat gi tren giao
 * dien thi van dung bien moi truong nhu cu, nen cach trien khai bang Docker khong doi.</p>
 *
 * <h2>Khoa khong bao gio duoc doc nguoc ra</h2>
 * <p>API chi tra ve <b>da dat hay chua</b> va lay tu dau. Doc nguoc gia tri ra thi bat
 * ky ai mo duoc trang quan tri cung lay duoc khoa that.</p>
 */
@Service
public class SettingsService {

    private static final Logger log = LoggerFactory.getLogger(SettingsService.class);

    /** Cac khoa cho phep dat tren giao dien. */
    public static final String ZCLOUD_API_KEY = "zcloudApiKey";
    public static final String TMDB_ACCESS_TOKEN = "tmdbAccessToken";
    public static final String TMDB_API_KEY = "tmdbApiKey";

    private final AdminProperties admin;
    private final ZCloudProperties zcloud;
    private final TmdbProperties tmdb;
    private final ObjectMapper mapper;

    private final Map<String, String> overrides = new LinkedHashMap<>();

    public SettingsService(AdminProperties admin,
                           ZCloudProperties zcloud,
                           TmdbProperties tmdb,
                           ObjectMapper mapper) {
        this.admin = admin;
        this.zcloud = zcloud;
        this.tmdb = tmdb;
        this.mapper = mapper;
        load();
    }

    // ------------------------------------------------------------------ doc gia tri

    public synchronized String zcloudApiKey() {
        return pick(ZCLOUD_API_KEY, zcloud.apiKey());
    }

    public synchronized String tmdbAccessToken() {
        return pick(TMDB_ACCESS_TOKEN, tmdb.accessToken());
    }

    public synchronized String tmdbApiKey() {
        return pick(TMDB_API_KEY, tmdb.apiKey());
    }

    /** Gia tri dat tren giao dien di truoc, khong co thi lui ve bien moi truong. */
    private String pick(String name, String fromEnvironment) {
        String saved = overrides.get(name);
        if (saved != null && !saved.isBlank()) {
            return saved;
        }
        return (fromEnvironment == null || fromEnvironment.isBlank()) ? null : fromEnvironment;
    }

    // ------------------------------------------------------------------ ghi gia tri

    /**
     * Dat hoac xoa mot khoa.
     *
     * <p>Gia tri rong nghia la xoa gia tri dat tren giao dien, luc do he thong quay ve
     * dung bien moi truong neu co.</p>
     */
    public synchronized void put(String name, String value) {
        if (!ZCLOUD_API_KEY.equals(name)
                && !TMDB_ACCESS_TOKEN.equals(name)
                && !TMDB_API_KEY.equals(name)) {
            throw new IllegalArgumentException("Không đặt được khoá '" + name + "'.");
        }

        Map<String, String> next = new LinkedHashMap<>(overrides);
        if (value == null || value.isBlank()) {
            next.remove(name);
        } else {
            next.put(name, value.trim());
        }

        // Ghi xuong dia truoc roi moi doi bo nho, giong cach lam voi danh sach nguon:
        // ghi hong thi khong de lai hai ban khac nhau.
        persist(next);
        overrides.clear();
        overrides.putAll(next);
    }

    // ------------------------------------------------------------------ bao cao

    /** Tinh trang tung khoa: da dat chua va dat o dau. Khong kem gia tri. */
    public synchronized Map<String, Map<String, Object>> status() {
        Map<String, Map<String, Object>> report = new LinkedHashMap<>();
        report.put(ZCLOUD_API_KEY, describe(ZCLOUD_API_KEY, zcloud.apiKey()));
        report.put(TMDB_ACCESS_TOKEN, describe(TMDB_ACCESS_TOKEN, tmdb.accessToken()));
        report.put(TMDB_API_KEY, describe(TMDB_API_KEY, tmdb.apiKey()));
        return report;
    }

    private Map<String, Object> describe(String name, String fromEnvironment) {
        boolean onDisk = overrides.get(name) != null && !overrides.get(name).isBlank();
        boolean inEnvironment = fromEnvironment != null && !fromEnvironment.isBlank();

        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("set", onDisk || inEnvironment);
        // "Dat o dau" giup nguoi dung biet sua cho nao khi muon doi.
        entry.put("source", onDisk ? "cms" : (inEnvironment ? "env" : "none"));
        return entry;
    }

    // ------------------------------------------------------------------ luu tru

    private Path file() {
        Path sources = Path.of(admin.sourcesFile());
        Path parent = sources.getParent();
        return parent == null ? Path.of("settings.json") : parent.resolve("settings.json");
    }

    @SuppressWarnings("unchecked")
    private void load() {
        Path path = file();
        if (!Files.exists(path)) {
            return;
        }
        try {
            Map<String, String> saved = mapper.readValue(Files.readString(path), Map.class);
            overrides.putAll(saved);
            log.info("Đã nạp {} khoá đặt trên giao diện từ {}", overrides.size(), path);
        } catch (Exception ex) {
            log.warn("Không đọc được {}: {}", path, ex.getMessage());
        }
    }

    private void persist(Map<String, String> snapshot) {
        Path path = file();
        try {
            Path parent = path.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            Files.writeString(path, mapper.writeValueAsString(snapshot));
        } catch (IOException | RuntimeException ex) {
            log.error("Không ghi được {}: {}", path, ex.getMessage());
            throw new IllegalStateException("Không lưu được cấu hình: " + ex.getMessage(), ex);
        }
    }
}
