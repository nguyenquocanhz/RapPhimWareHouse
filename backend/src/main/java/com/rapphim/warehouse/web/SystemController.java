package com.rapphim.warehouse.web;

import com.rapphim.warehouse.common.ApiResponse;
import com.rapphim.warehouse.config.AdminProperties;
import com.rapphim.warehouse.provider.homelab.ZCloudClient;
import com.rapphim.warehouse.provider.tmdb.TmdbClient;
import com.rapphim.warehouse.dto.ListType;
import com.rapphim.warehouse.dto.ProviderType;
import com.rapphim.warehouse.provider.ProviderRegistry;
import com.rapphim.warehouse.service.CustomSourceService;
import com.rapphim.warehouse.service.SettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Endpoint mo ta chinh he thong, huu ich cho frontend khi dung menu dong.
 */
@RestController
@RequestMapping("/api/v1")
@Tag(name = "System", description = "Thong tin he thong va nguon du lieu")
public class SystemController {

    private final ProviderRegistry registry;
    private final CustomSourceService customSources;
    private final AdminProperties admin;

    /*
     * Hoi thang hai client thay vi doc cau hinh goc: khoa dat tren trang quan tri
     * duoc uu tien hon bien moi truong, ma chi hai client nay biet dieu do. Doc cau
     * hinh goc thi dat khoa xong bang tong quan van bao "chua cau hinh".
     */
    private final ZCloudClient zcloud;
    private final TmdbClient tmdb;
    private final SettingsService settings;

    public SystemController(ProviderRegistry registry,
                            CustomSourceService customSources,
                            AdminProperties admin,
                            ZCloudClient zcloud,
                            TmdbClient tmdb,
                            SettingsService settings) {
        this.registry = registry;
        this.customSources = customSources;
        this.admin = admin;
        this.zcloud = zcloud;
        this.tmdb = tmdb;
        this.settings = settings;
    }

    /**
     * Tinh trang cau hinh, danh cho trang quan tri.
     *
     * <p>Chi tra ve <b>da cau hinh hay chua</b> chu khong tra ve khoa nao. Trang quan
     * tri chi can biet cai gi con thieu de nhac nguoi dung, khong can biet gia tri.</p>
     */
    @GetMapping("/status")
    @Operation(
            summary = "Tinh trang cau hinh cua he thong",
            description = "Cho biet phan nao da cau hinh, khong tra ve bat ky khoa nao.")
    public ResponseEntity<ApiResponse<Map<String, Object>>> status() {
        Map<String, Object> body = new LinkedHashMap<>();

        body.put("providers", registry.availableCodes());
        body.put("builtInCount", ProviderType.values().length);
        body.put("customCount", customSources.all().size());
        body.put("customEnabledCount", customSources.activeProviders().size());
        body.put("tmdbConfigured", tmdb.isConfigured());
        // Dang cua khoa TMDB, khong phai gia tri: dan nham khoa v3 vao o token v4 la loi
        // hay gap nhat, ma nhin man hinh "da cau hinh" thi khong tai nao doan ra.
        body.put("tmdbKeyShape", settings.status()
                .getOrDefault(SettingsService.TMDB_ACCESS_TOKEN, Map.of())
                .getOrDefault("shape", "none"));
        body.put("homelabConfigured", zcloud.isConfigured());
        body.put("adminConfigured", admin.isConfigured());

        return ResponseEntity.ok(ApiResponse.ok(body));
    }

    @GetMapping("/providers")
    @Operation(
            summary = "Cac nguon du lieu dang hoat dong",
            description = "Tra ve ma cac nguon co the truyen vao tham so 'provider' cua moi endpoint.")
    public ResponseEntity<ApiResponse<List<String>>> providers() {
        return ResponseEntity.ok(ApiResponse.ok(registry.availableCodes()));
    }

    @GetMapping("/list-types")
    @Operation(
            summary = "Cac nhom danh sach phim",
            description = "Tra ve slug kem nhan hien thi cua tung nhom, dung de dung menu dieu huong.")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> listTypes() {
        List<Map<String, String>> types = Arrays.stream(ListType.values())
                .map(type -> {
                    Map<String, String> entry = new LinkedHashMap<>();
                    entry.put("slug", type.slug());
                    entry.put("label", type.label());
                    return entry;
                })
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(types));
    }
}
