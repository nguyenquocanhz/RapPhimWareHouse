package com.rapphim.warehouse.web;

import com.rapphim.warehouse.common.ApiError;
import com.rapphim.warehouse.common.ApiResponse;
import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.dto.AnimeDetail;
import com.rapphim.warehouse.dto.AnimeSummary;
import com.rapphim.warehouse.exception.ResourceNotFoundException;
import com.rapphim.warehouse.service.AnimeService;
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
 * Metadata anime - nguon hop phap, khong phat video.
 *
 * <p>AniList lam nguon chinh, Jikan (MyAnimeList) du phong: het nguon nay thi tu dong
 * sang nguon kia o danh sach / tim kiem / the loai. Moi ket qua mang {@code source} de
 * biet id thuoc nguon nao; goi chi tiet phai kem dung {@code source} do vi hai nguon
 * co khong gian ma khac nhau.</p>
 */
@RestController
@RequestMapping("/api/v1")
@Validated
@Tag(name = "Anime", description = "Metadata anime (AniList chinh, Jikan du phong)")
public class AnimeController {

    private final AnimeService service;

    public AnimeController(AnimeService service) {
        this.service = service;
    }

    @GetMapping("/anime/trending")
    @Operation(
            summary = "Anime thinh hanh",
            description = "Danh sach anime dang duoc quan tam nhat. Het AniList thi tu dong "
                    + "chuyen sang Jikan (MyAnimeList) - kiem tra truong `source` de biet nguon.")
    public ResponseEntity<ApiResponse<PageResponse<AnimeSummary>>> trending(
            @Parameter(description = "Trang can lay, bat dau tu 1", example = "1")
            @RequestParam(defaultValue = "1") @Min(1) @Max(500) int page,

            @Parameter(description = "So ket qua moi trang", example = "24")
            @RequestParam(defaultValue = "24") @Min(1) @Max(50) int perPage) {

        return ResponseEntity.ok(ApiResponse.ok(service.trending(page, perPage)));
    }

    @GetMapping("/anime/search")
    @Operation(
            summary = "Tim anime",
            description = "Tim theo tu khoa. Het AniList thi tu dong chuyen sang Jikan.")
    public ResponseEntity<ApiResponse<PageResponse<AnimeSummary>>> search(
            @Parameter(description = "Tu khoa tim kiem", example = "one piece", required = true)
            @RequestParam @NotBlank String keyword,

            @Parameter(description = "Trang can lay, bat dau tu 1", example = "1")
            @RequestParam(defaultValue = "1") @Min(1) @Max(500) int page,

            @Parameter(description = "So ket qua moi trang", example = "24")
            @RequestParam(defaultValue = "24") @Min(1) @Max(50) int perPage) {

        return ResponseEntity.ok(ApiResponse.ok(service.search(keyword, page, perPage)));
    }

    @GetMapping("/anime/{id}")
    @Operation(
            summary = "Chi tiet mot anime",
            description = "Metadata day du theo ma. PHAI kem dung `source` cua ma do (lay tu "
                    + "truong `source` trong ket qua danh sach), vi AniList va MyAnimeList co "
                    + "khong gian ma khac nhau. Chi tiet KHONG du phong sang nguon khac.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "Lay metadata thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404", description = "Nguon khong co ban ghi voi ma nay",
                    content = @Content(schema = @Schema(implementation = ApiError.class)))
    })
    public ResponseEntity<ApiResponse<AnimeDetail>> details(
            @Parameter(description = "Ma anime tren nguon tuong ung", example = "21", required = true)
            @PathVariable int id,

            @Parameter(description = "Nguon giu ma nay", example = "anilist",
                    schema = @Schema(allowableValues = {"anilist", "jikan"}))
            @RequestParam(defaultValue = "anilist") String source) {

        AnimeDetail detail = service.details(id, source)
                .orElseThrow(() -> new ResourceNotFoundException("ANIME_NOT_FOUND",
                        "Nguon '" + source + "' khong co anime voi ma '" + id + "'"));

        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    @GetMapping("/anime/genres")
    @Operation(
            summary = "Danh muc the loai anime",
            description = "Danh sach ten the loai, dung de dien bo loc phia giao dien.")
    public ResponseEntity<ApiResponse<List<String>>> genres() {
        return ResponseEntity.ok(ApiResponse.ok(service.genres()));
    }
}
