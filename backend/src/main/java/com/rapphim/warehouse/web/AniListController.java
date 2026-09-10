package com.rapphim.warehouse.web;

import com.rapphim.warehouse.common.ApiError;
import com.rapphim.warehouse.common.ApiResponse;
import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.dto.AnimeDetail;
import com.rapphim.warehouse.dto.AnimeSummary;
import com.rapphim.warehouse.exception.ResourceNotFoundException;
import com.rapphim.warehouse.service.AniListService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Metadata anime tu AniList - nguon hop phap, khong phat video.
 *
 * <p>Dung de lam giau trang anime: diem, tieu de romaji/goc, hang phim, tap sap phat.
 * Khong can khoa nen cac endpoint nay luon dung duoc.</p>
 */
@RestController
@RequestMapping("/api/v1")
@Validated
@Tag(name = "AniList", description = "Metadata anime tu AniList (khong phat video)")
public class AniListController {

    private final AniListService service;

    public AniListController(AniListService service) {
        this.service = service;
    }

    @GetMapping("/anime/trending")
    @Operation(
            summary = "Anime thinh hanh tren AniList",
            description = "Danh sach anime dang duoc quan tam nhat, sap theo do thinh hanh. "
                    + "Dung de lam trang kham pha anime doc lap voi kho phim cua nguon.")
    public ResponseEntity<ApiResponse<PageResponse<AnimeSummary>>> trending(
            @Parameter(description = "Trang can lay, bat dau tu 1", example = "1")
            @RequestParam(defaultValue = "1") @Min(1) @Max(500) int page,

            @Parameter(description = "So ket qua moi trang, toi da 50", example = "24")
            @RequestParam(defaultValue = "24") @Min(1) @Max(50) int perPage) {

        return ResponseEntity.ok(ApiResponse.ok(service.trending(page, perPage)));
    }

    @GetMapping("/anime/search")
    @Operation(
            summary = "Tim anime tren AniList",
            description = "Tim theo tu khoa, sap theo do khop va do thinh hanh.")
    public ResponseEntity<ApiResponse<PageResponse<AnimeSummary>>> search(
            @Parameter(description = "Tu khoa tim kiem", example = "one piece", required = true)
            @RequestParam @NotBlank String keyword,

            @Parameter(description = "Trang can lay, bat dau tu 1", example = "1")
            @RequestParam(defaultValue = "1") @Min(1) @Max(500) int page,

            @Parameter(description = "So ket qua moi trang, toi da 50", example = "24")
            @RequestParam(defaultValue = "24") @Min(1) @Max(50) int perPage) {

        return ResponseEntity.ok(ApiResponse.ok(service.search(keyword, page, perPage)));
    }

    @GetMapping("/anime/{id}")
    @Operation(
            summary = "Chi tiet mot anime tren AniList",
            description = "Metadata day du theo ma AniList: tom tat, so tap, diem, the loai, "
                    + "hang phim, va tap sap phat neu con dang chieu.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "Lay metadata thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404", description = "AniList khong co ban ghi voi ma nay",
                    content = @Content(schema = @Schema(implementation = ApiError.class)))
    })
    public ResponseEntity<ApiResponse<AnimeDetail>> details(
            @Parameter(description = "Ma anime tren AniList", example = "21", required = true)
            @PathVariable int id) {

        AnimeDetail detail = service.details(id)
                .orElseThrow(() -> new ResourceNotFoundException("ANILIST_NOT_FOUND",
                        "AniList khong co ban ghi anime voi ma '" + id + "'"));

        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    @GetMapping("/anime/genres")
    @Operation(
            summary = "Danh muc the loai anime cua AniList",
            description = "Danh sach ten the loai, dung de dien bo loc phia giao dien.")
    public ResponseEntity<ApiResponse<List<String>>> genres() {
        return ResponseEntity.ok(ApiResponse.ok(service.genres()));
    }
}
