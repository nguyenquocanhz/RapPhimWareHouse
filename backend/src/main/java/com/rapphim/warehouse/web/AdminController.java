package com.rapphim.warehouse.web;

import com.rapphim.warehouse.common.ApiResponse;
import com.rapphim.warehouse.config.AdminProperties;
import com.rapphim.warehouse.dto.CustomSource;
import com.rapphim.warehouse.exception.AdminNotConfiguredException;
import com.rapphim.warehouse.exception.ResourceNotFoundException;
import com.rapphim.warehouse.exception.UnauthorizedException;
import com.rapphim.warehouse.service.CustomSourceService;
import com.rapphim.warehouse.service.SettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Trang quan tri: them nguon phim ma khong phai sua ma nguon.
 *
 * <p>Cac endpoint doc thi ai cung goi duoc, con cac endpoint sua doi doi khoa gui qua
 * header {@code X-Admin-Token}. Chua dat khoa thi phan sua doi tu tat han - de mo cho
 * ai cung doi duoc nguon phim la moi cho ke khac tro he thong sang dia chi bat ky.</p>
 */
@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Quan tri", description = "Them va sua nguon phim luc dang chay")
public class AdminController {

    private final CustomSourceService sources;
    private final AdminProperties properties;
    private final SettingsService settings;

    public AdminController(CustomSourceService sources,
                           AdminProperties properties,
                           SettingsService settings) {
        this.sources = sources;
        this.properties = properties;
        this.settings = settings;
    }

    /**
     * Tinh trang cac khoa dat duoc tren giao dien.
     *
     * <p>Chi bao da dat hay chua va dat o dau. Khong tra ve gia tri: doc nguoc khoa ra
     * thi ai mo duoc trang quan tri cung lay duoc khoa that.</p>
     */
    @GetMapping("/settings")
    @Operation(summary = "Tinh trang cac khoa, khong kem gia tri")
    public ResponseEntity<ApiResponse<Map<String, Object>>> settings() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "items", settings.status(),
                "writable", properties.isConfigured())));
    }

    @PostMapping("/settings")
    @Operation(summary = "Dat hoac xoa mot khoa")
    public ResponseEntity<ApiResponse<Map<String, Object>>> saveSetting(
            @RequestHeader(value = "X-Admin-Token", required = false) String token,
            @RequestBody Map<String, String> body) {

        authorise(token);

        String name = body.get("name");
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Thiếu tên khoá cần đặt.");
        }
        settings.put(name, body.get("value"));

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "items", settings.status(),
                "writable", true)));
    }

    @GetMapping("/sources")
    @Operation(summary = "Danh sach nguon tu them")
    public ResponseEntity<ApiResponse<Map<String, Object>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "items", sources.all(),
                // De trang quan tri biet co bat duoc nut sua hay khong.
                "writable", properties.isConfigured())));
    }

    @PostMapping("/sources")
    @Operation(summary = "Them hoac cap nhat mot nguon")
    public ResponseEntity<ApiResponse<CustomSource>> save(
            @Parameter(description = "Khoa quan tri", required = true)
            @RequestHeader(value = "X-Admin-Token", required = false) String token,
            @Valid @RequestBody CustomSource source) {

        authorise(token);
        return ResponseEntity.ok(ApiResponse.ok(sources.save(source)));
    }

    @PostMapping("/sources/probe")
    @Operation(summary = "Goi thu mot nguon truoc khi luu")
    public ResponseEntity<ApiResponse<Map<String, String>>> probe(
            @RequestHeader(value = "X-Admin-Token", required = false) String token,
            @Valid @RequestBody CustomSource source) {

        authorise(token);
        try {
            return ResponseEntity.ok(ApiResponse.ok(Map.of("message", sources.probe(source))));
        } catch (RuntimeException ex) {
            // Nguon hong la chuyen binh thuong khi go nham dia chi, khong phai loi he thong.
            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                    "message", "Không gọi được: " + rootMessage(ex))));
        }
    }

    @DeleteMapping("/sources/{id}")
    @Operation(summary = "Xoa mot nguon")
    public ResponseEntity<ApiResponse<List<CustomSource>>> remove(
            @RequestHeader(value = "X-Admin-Token", required = false) String token,
            @PathVariable String id) {

        authorise(token);
        if (!sources.remove(id)) {
            throw new ResourceNotFoundException("SOURCE_NOT_FOUND", "Không có nguồn '" + id + "'");
        }
        return ResponseEntity.ok(ApiResponse.ok(sources.all()));
    }

    /**
     * Chan cac loi goi khong co khoa dung.
     *
     * <p>Chua dat khoa thi tra 503 kem loi nhan ro rang, giong cach TMDB dang lam khi
     * thieu cau hinh - de nguoi dung biet phai lam gi thay vi doan.</p>
     */
    private void authorise(String token) {
        if (!properties.isConfigured()) {
            throw new AdminNotConfiguredException(
                    "Chưa đặt RAPPHIM_ADMIN_TOKEN nên không sửa được nguồn. "
                            + "Đặt biến môi trường đó rồi khởi động lại.");
        }
        if (!properties.matches(token)) {
            throw new UnauthorizedException("Khoá quản trị không đúng.");
        }
    }

    private String rootMessage(Throwable error) {
        Throwable current = error;
        while (current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        return current.getMessage() == null ? current.getClass().getSimpleName() : current.getMessage();
    }
}
