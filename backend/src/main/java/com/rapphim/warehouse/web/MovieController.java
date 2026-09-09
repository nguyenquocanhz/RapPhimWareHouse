package com.rapphim.warehouse.web;

import com.rapphim.warehouse.common.ApiError;
import com.rapphim.warehouse.common.ApiResponse;
import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.dto.ListType;
import com.rapphim.warehouse.dto.MovieDetail;
import com.rapphim.warehouse.dto.MovieQuery;
import com.rapphim.warehouse.dto.MovieSummary;
import com.rapphim.warehouse.dto.ProviderType;
import com.rapphim.warehouse.service.MovieBatchService;
import com.rapphim.warehouse.service.MovieService;
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
 * Cac endpoint doc du lieu phim.
 */
@RestController
@RequestMapping("/api/v1/movies")
@Validated
@Tag(name = "Movies", description = "Danh sach, tim kiem va chi tiet phim")
public class MovieController {

    private final MovieService movieService;
    private final MovieBatchService batchService;

    public MovieController(MovieService movieService, MovieBatchService batchService) {
        this.movieService = movieService;
        this.batchService = batchService;
    }

    @GetMapping("/latest")
    @Operation(
            summary = "Phim moi cap nhat",
            description = "Tra ve cac phim vua duoc nguon cap nhat, sap xep theo thoi diem cap nhat giam dan. "
                    + "Day la endpoint dung cho trang chu.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "Lay danh sach thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "502", description = "Nguon phim loi hoac timeout",
                    content = @Content(schema = @Schema(implementation = ApiError.class)))
    })
    public ResponseEntity<ApiResponse<PageResponse<MovieSummary>>> latest(
            @Parameter(description = "Trang can lay, bat dau tu 1", example = "1")
            @RequestParam(defaultValue = "1") @Min(1) int page,

            @Parameter(description = "So phim moi trang, toi da 64", example = "24")
            @RequestParam(defaultValue = "24") @Min(1) @Max(64) int limit,

            @Parameter(description = "Nguon du lieu", example = "kkphim")
            @RequestParam(defaultValue = "kkphim") ProviderType provider) {

        MovieQuery query = MovieQuery.of(page, limit);
        return ResponseEntity.ok(ApiResponse.ok(movieService.latest(provider, query)));
    }

    @GetMapping
    @Operation(
            summary = "Danh sach phim theo nhom",
            description = "Lay phim theo nhom (phim bo, phim le, tv shows, hoat hinh...) kem cac bo loc "
                    + "the loai, quoc gia, nam va tuy chon sap xep. "
                    + "Luu y: nguon 'nguonc' chi ho tro phim-bo, phim-le, tv-shows, hoat-hinh va bo qua bo loc.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "Lay danh sach thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400", description = "Tham so khong hop le",
                    content = @Content(schema = @Schema(implementation = ApiError.class)))
    })
    public ResponseEntity<ApiResponse<PageResponse<MovieSummary>>> listByType(
            @Parameter(description = "Nhom danh sach can lay", example = "phim-bo")
            @RequestParam(defaultValue = "phim-bo") ListType type,

            @Parameter(description = "Trang can lay, bat dau tu 1", example = "1")
            @RequestParam(defaultValue = "1") @Min(1) int page,

            @Parameter(description = "So phim moi trang, toi da 64", example = "24")
            @RequestParam(defaultValue = "24") @Min(1) @Max(64) int limit,

            @Parameter(description = "Loc theo slug the loai", example = "hanh-dong")
            @RequestParam(required = false) String category,

            @Parameter(description = "Loc theo slug quoc gia", example = "han-quoc")
            @RequestParam(required = false) String country,

            @Parameter(description = "Loc theo nam phat hanh", example = "2026")
            @RequestParam(required = false) Integer year,

            @Parameter(description = "Truong dung de sap xep", example = "modified.time",
                    schema = @Schema(allowableValues = {"modified.time", "_id", "year"}))
            @RequestParam(name = "sortField", defaultValue = "modified.time") String sortField,

            @Parameter(description = "Chieu sap xep", example = "desc",
                    schema = @Schema(allowableValues = {"asc", "desc"}))
            @RequestParam(name = "sortType", defaultValue = "desc") String sortType,

            @Parameter(description = "Nguon du lieu", example = "kkphim")
            @RequestParam(defaultValue = "kkphim") ProviderType provider) {

        MovieQuery query = new MovieQuery(page, limit, category, country, year, sortField, sortType);
        return ResponseEntity.ok(ApiResponse.ok(movieService.listByType(provider, type, query)));
    }

    @GetMapping("/search")
    @Operation(
            summary = "Tim kiem phim theo tu khoa",
            description = "Tim theo ten tieng Viet hoac ten goc. Tu khoa khong phan biet hoa thuong.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "Tim kiem thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400", description = "Thieu tu khoa",
                    content = @Content(schema = @Schema(implementation = ApiError.class)))
    })
    public ResponseEntity<ApiResponse<PageResponse<MovieSummary>>> search(
            @Parameter(description = "Tu khoa tim kiem", example = "nguoi nhen", required = true)
            @RequestParam @NotBlank String keyword,

            @Parameter(description = "Trang can lay, bat dau tu 1", example = "1")
            @RequestParam(defaultValue = "1") @Min(1) int page,

            @Parameter(description = "So phim moi trang, toi da 64", example = "24")
            @RequestParam(defaultValue = "24") @Min(1) @Max(64) int limit,

            @Parameter(description = "Nguon du lieu", example = "kkphim")
            @RequestParam(defaultValue = "kkphim") ProviderType provider) {

        MovieQuery query = MovieQuery.of(page, limit);
        return ResponseEntity.ok(ApiResponse.ok(movieService.search(provider, keyword, query)));
    }

    @GetMapping("/category/{slug}")
    @Operation(
            summary = "Danh sach phim theo the loai",
            description = "Lay phim thuoc mot the loai. Slug lay tu endpoint GET /api/v1/categories.")
    public ResponseEntity<ApiResponse<PageResponse<MovieSummary>>> listByCategory(
            @Parameter(description = "Slug the loai", example = "hanh-dong", required = true)
            @PathVariable String slug,

            @Parameter(description = "Trang can lay, bat dau tu 1", example = "1")
            @RequestParam(defaultValue = "1") @Min(1) int page,

            @Parameter(description = "So phim moi trang, toi da 64", example = "24")
            @RequestParam(defaultValue = "24") @Min(1) @Max(64) int limit,

            @Parameter(description = "Loc them theo slug quoc gia", example = "han-quoc")
            @RequestParam(required = false) String country,

            @Parameter(description = "Loc them theo nam phat hanh", example = "2026")
            @RequestParam(required = false) Integer year,

            @Parameter(description = "Nguon du lieu", example = "kkphim")
            @RequestParam(defaultValue = "kkphim") ProviderType provider) {

        MovieQuery query = new MovieQuery(page, limit, null, country, year, null, null);
        return ResponseEntity.ok(ApiResponse.ok(movieService.listByCategory(provider, slug, query)));
    }

    @GetMapping("/country/{slug}")
    @Operation(
            summary = "Danh sach phim theo quoc gia",
            description = "Lay phim thuoc mot quoc gia. Slug lay tu endpoint GET /api/v1/countries.")
    public ResponseEntity<ApiResponse<PageResponse<MovieSummary>>> listByCountry(
            @Parameter(description = "Slug quoc gia", example = "han-quoc", required = true)
            @PathVariable String slug,

            @Parameter(description = "Trang can lay, bat dau tu 1", example = "1")
            @RequestParam(defaultValue = "1") @Min(1) int page,

            @Parameter(description = "So phim moi trang, toi da 64", example = "24")
            @RequestParam(defaultValue = "24") @Min(1) @Max(64) int limit,

            @Parameter(description = "Loc them theo slug the loai", example = "hanh-dong")
            @RequestParam(required = false) String category,

            @Parameter(description = "Loc them theo nam phat hanh", example = "2026")
            @RequestParam(required = false) Integer year,

            @Parameter(description = "Nguon du lieu", example = "kkphim")
            @RequestParam(defaultValue = "kkphim") ProviderType provider) {

        MovieQuery query = new MovieQuery(page, limit, category, null, year, null, null);
        return ResponseEntity.ok(ApiResponse.ok(movieService.listByCountry(provider, slug, query)));
    }

    @GetMapping("/year/{year}")
    @Operation(summary = "Danh sach phim theo nam phat hanh")
    public ResponseEntity<ApiResponse<PageResponse<MovieSummary>>> listByYear(
            @Parameter(description = "Nam phat hanh, trong khoang 1900-2100", example = "2026", required = true)
            @PathVariable int year,

            @Parameter(description = "Trang can lay, bat dau tu 1", example = "1")
            @RequestParam(defaultValue = "1") @Min(1) int page,

            @Parameter(description = "So phim moi trang, toi da 64", example = "24")
            @RequestParam(defaultValue = "24") @Min(1) @Max(64) int limit,

            @Parameter(description = "Loc them theo slug the loai", example = "hanh-dong")
            @RequestParam(required = false) String category,

            @Parameter(description = "Loc them theo slug quoc gia", example = "han-quoc")
            @RequestParam(required = false) String country,

            @Parameter(description = "Nguon du lieu", example = "kkphim")
            @RequestParam(defaultValue = "kkphim") ProviderType provider) {

        MovieQuery query = new MovieQuery(page, limit, category, country, null, null, null);
        return ResponseEntity.ok(ApiResponse.ok(movieService.listByYear(provider, year, query)));
    }

    @GetMapping("/batch")
    @Operation(
            summary = "Trang thai hien tai cua nhieu phim",
            description = "Tra ve thong tin moi nhat cua cac phim theo danh sach slug. "
                    + "Dung de doi chieu xem phim minh dang theo doi da co tap moi hay chua: "
                    + "client giu ban chup cu roi so voi 'episodeCurrent' va 'modifiedAt' tra ve day. "
                    + "Phim khong con ton tai se bi bo qua thay vi lam hong ca danh sach.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "Tra cuu thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400", description = "Gui qua so phim cho phep",
                    content = @Content(schema = @Schema(implementation = ApiError.class)))
    })
    public ResponseEntity<ApiResponse<List<MovieSummary>>> batch(
            @Parameter(description = "Danh sach slug, ngan bang dau phay. Toi da 30 phim",
                    example = "doi-chung,quy-ong-the-gioi-ngam-phan-2", required = true)
            @RequestParam List<String> slugs,

            @Parameter(description = "Nguon du lieu", example = "kkphim")
            @RequestParam(defaultValue = "kkphim") ProviderType provider) {

        return ResponseEntity.ok(ApiResponse.ok(batchService.findAll(provider, slugs)));
    }

    @GetMapping("/{slug}")
    @Operation(
            summary = "Chi tiet mot phim",
            description = "Tra ve thong tin day du kem danh sach server va tap phim. "
                    + "Moi tap co link embed va (voi nguon kkphim) ca link HLS .m3u8.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "Tim thay phim"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404", description = "Khong tim thay phim voi slug da cho",
                    content = @Content(schema = @Schema(implementation = ApiError.class)))
    })
    public ResponseEntity<ApiResponse<MovieDetail>> detail(
            @Parameter(description = "Slug cua phim", example = "doi-chung", required = true)
            @PathVariable String slug,

            @Parameter(description = "Nguon du lieu", example = "kkphim")
            @RequestParam(defaultValue = "kkphim") ProviderType provider) {

        return ResponseEntity.ok(ApiResponse.ok(movieService.findBySlug(provider, slug)));
    }
}
