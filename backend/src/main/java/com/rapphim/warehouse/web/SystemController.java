package com.rapphim.warehouse.web;

import com.rapphim.warehouse.common.ApiResponse;
import com.rapphim.warehouse.dto.ListType;
import com.rapphim.warehouse.provider.ProviderRegistry;
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

    public SystemController(ProviderRegistry registry) {
        this.registry = registry;
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
