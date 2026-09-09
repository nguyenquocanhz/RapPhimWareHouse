package com.rapphim.warehouse.web;

import com.rapphim.warehouse.common.ApiResponse;
import com.rapphim.warehouse.dto.ProviderType;
import com.rapphim.warehouse.dto.Taxonomy;
import com.rapphim.warehouse.service.TaxonomyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Cac endpoint danh muc dung cho thanh loc cua giao dien.
 */
@RestController
@RequestMapping("/api/v1")
@Tag(name = "Taxonomies", description = "The loai va quoc gia")
public class TaxonomyController {

    private final TaxonomyService taxonomyService;

    public TaxonomyController(TaxonomyService taxonomyService) {
        this.taxonomyService = taxonomyService;
    }

    @GetMapping("/categories")
    @Operation(
            summary = "Danh sach the loai",
            description = "Tra ve toan bo the loai. Slug o day dung lam tham so cho "
                    + "GET /api/v1/movies/category/{slug} hoac bo loc 'category'.")
    public ResponseEntity<ApiResponse<List<Taxonomy>>> categories(
            @Parameter(description = "Nguon du lieu", example = "kkphim")
            @RequestParam(defaultValue = "kkphim") String provider) {

        return ResponseEntity.ok(ApiResponse.ok(taxonomyService.categories(provider)));
    }

    @GetMapping("/countries")
    @Operation(
            summary = "Danh sach quoc gia",
            description = "Tra ve toan bo quoc gia. Slug o day dung lam tham so cho "
                    + "GET /api/v1/movies/country/{slug} hoac bo loc 'country'.")
    public ResponseEntity<ApiResponse<List<Taxonomy>>> countries(
            @Parameter(description = "Nguon du lieu", example = "kkphim")
            @RequestParam(defaultValue = "kkphim") String provider) {

        return ResponseEntity.ok(ApiResponse.ok(taxonomyService.countries(provider)));
    }
}
