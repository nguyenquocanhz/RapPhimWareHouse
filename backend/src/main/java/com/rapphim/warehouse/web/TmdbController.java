package com.rapphim.warehouse.web;

import com.rapphim.warehouse.common.ApiError;
import com.rapphim.warehouse.common.ApiResponse;
import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.dto.MovieDetail;
import com.rapphim.warehouse.dto.ProviderType;
import com.rapphim.warehouse.dto.Taxonomy;
import com.rapphim.warehouse.dto.TmdbDetail;
import com.rapphim.warehouse.dto.TmdbDiscoverItem;
import com.rapphim.warehouse.dto.TmdbDiscoverQuery;
import com.rapphim.warehouse.exception.ResourceNotFoundException;
import com.rapphim.warehouse.service.MovieService;
import com.rapphim.warehouse.service.NfoService;
import com.rapphim.warehouse.service.TmdbService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

/**
 * Cac endpoint lien quan toi TheMovieDB: metadata bo sung, duyet tim,
 * va xuat file NFO cho trinh quan ly thu vien phim.
 */
@RestController
@RequestMapping("/api/v1")
@Validated
@Tag(name = "TMDB & NFO", description = "Metadata TheMovieDB va xuat file NFO")
public class TmdbController {

    private final TmdbService tmdbService;
    private final MovieService movieService;
    private final NfoService nfoService;

    public TmdbController(TmdbService tmdbService, MovieService movieService, NfoService nfoService) {
        this.tmdbService = tmdbService;
        this.movieService = movieService;
        this.nfoService = nfoService;
    }

    @GetMapping("/movies/{slug}/tmdb")
    @Operation(
            summary = "Metadata TheMovieDB cua mot phim",
            description = "Doi chieu phim sang ban ghi TMDB bang ma ma nguon phim tra kem, "
                    + "roi tra ve metadata day du: tom tat, thoi luong, diem so, the loai, "
                    + "hang phim, dao dien va danh sach dien vien kem vai dien. "
                    + "Chi nguon 'kkphim' co kem ma TMDB.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "Lay metadata thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404", description = "Khong tim thay phim, hoac phim khong co ma TMDB",
                    content = @Content(schema = @Schema(implementation = ApiError.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "503", description = "Chua cau hinh khoa TMDB",
                    content = @Content(schema = @Schema(implementation = ApiError.class)))
    })
    public ResponseEntity<ApiResponse<TmdbDetail>> movieMetadata(
            @Parameter(description = "Slug cua phim", example = "doi-chung", required = true)
            @PathVariable String slug,

            @Parameter(description = "Nguon du lieu", example = "kkphim")
            @RequestParam(defaultValue = "kkphim") String provider) {

        MovieDetail movie = movieService.findBySlug(provider, slug);
        TmdbDetail detail = tmdbService.enrich(movie)
                .orElseThrow(() -> new ResourceNotFoundException("TMDB_NOT_FOUND",
                        "Phim '" + slug + "' khong co ban ghi tuong ung tren TheMovieDB"));

        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    @GetMapping(value = "/movies/{slug}/nfo", produces = MediaType.APPLICATION_XML_VALUE)
    @Operation(
            summary = "Xuat file NFO cho Kodi / Jellyfin / Emby",
            description = "Sinh file NFO dang XML tu du lieu cua nguon phim, tu dong bo sung "
                    + "metadata TMDB neu he thong da co khoa API. "
                    + "Phim le sinh the goc `movie`, phim bo sinh the goc `tvshow`. "
                    + "File luon co the tai duoc ngay ca khi chua cau hinh TMDB.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "Noi dung file NFO",
                    content = @Content(mediaType = MediaType.APPLICATION_XML_VALUE)),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404", description = "Khong tim thay phim",
                    content = @Content(schema = @Schema(implementation = ApiError.class)))
    })
    public ResponseEntity<String> nfo(
            @Parameter(description = "Slug cua phim", example = "doi-chung", required = true)
            @PathVariable String slug,

            @Parameter(description = "Nguon du lieu", example = "kkphim")
            @RequestParam(defaultValue = "kkphim") String provider,

            @Parameter(description = "Co bo sung metadata tu TMDB hay khong", example = "true")
            @RequestParam(defaultValue = "true") boolean enrich) {

        MovieDetail movie = movieService.findBySlug(provider, slug);
        Optional<TmdbDetail> extra = enrich ? tmdbService.enrichQuietly(movie) : Optional.empty();

        String xml = nfoService.build(movie, extra);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + nfoService.fileNameFor(movie) + "\"")
                .contentType(MediaType.APPLICATION_XML)
                .body(xml);
    }

    @GetMapping("/tmdb/discover")
    @Operation(
            summary = "Duyet tim phim tren TheMovieDB",
            description = "Proxy cua endpoint `/discover/movie`. Dung de goi y phim theo diem so, "
                    + "the loai hoac ngon ngu goc ma khong phu thuoc kho phim cua hai nguon. "
                    + "TMDB co dinh 20 ket qua moi trang.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "Duyet tim thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "503", description = "Chua cau hinh khoa TMDB",
                    content = @Content(schema = @Schema(implementation = ApiError.class)))
    })
    public ResponseEntity<ApiResponse<PageResponse<TmdbDiscoverItem>>> discover(
            @Parameter(description = "Trang can lay, bat dau tu 1", example = "1")
            @RequestParam(defaultValue = "1") @Min(1) @Max(500) int page,

            @Parameter(description = "Cach sap xep", example = "popularity.desc",
                    schema = @Schema(allowableValues = {
                            "popularity.desc", "popularity.asc",
                            "vote_average.desc", "vote_average.asc",
                            "primary_release_date.desc", "primary_release_date.asc",
                            "revenue.desc", "title.asc"}))
            @RequestParam(name = "sortBy", defaultValue = "popularity.desc") String sortBy,

            @Parameter(description = "Ma the loai TMDB, ngan bang dau phay (va) hoac gach doc (hoac). "
                    + "Tra cuu ma qua GET /api/v1/tmdb/genres", example = "28,12")
            @RequestParam(name = "withGenres", required = false) String withGenres,

            @Parameter(description = "Ngon ngu goc theo ma ISO 639-1", example = "ko")
            @RequestParam(name = "withOriginalLanguage", required = false) String withOriginalLanguage,

            @Parameter(description = "Nam phat hanh", example = "2026")
            @RequestParam(required = false) Integer year,

            @Parameter(description = "Diem trung binh toi thieu", example = "7.0")
            @RequestParam(name = "voteAverageGte", required = false) Double voteAverageGte,

            @Parameter(description = "So luot danh gia toi thieu, tranh phim it nguoi cham", example = "100")
            @RequestParam(name = "voteCountGte", required = false) Integer voteCountGte,

            @Parameter(description = "Ma quoc gia ISO 3166-1 dung cho ngay phat hanh", example = "VN")
            @RequestParam(required = false) String region,

            @Parameter(description = "Co lay ca phim danh cho nguoi lon hay khong", example = "false")
            @RequestParam(name = "includeAdult", defaultValue = "false") boolean includeAdult) {

        TmdbDiscoverQuery query = new TmdbDiscoverQuery(
                page, sortBy, withGenres, withOriginalLanguage,
                year, voteAverageGte, voteCountGte, region, includeAdult);

        return ResponseEntity.ok(ApiResponse.ok(tmdbService.discover(query)));
    }

    @GetMapping("/tmdb/movies/{id}")
    @Operation(
            summary = "Chi tiet mot phim tren TheMovieDB",
            description = "Tra metadata theo ma TMDB, khong can phim do co trong kho cua hai nguon. "
                    + "Dung cho trang xem truoc: tom tat, thoi luong, diem so, the loai, "
                    + "hang phim, dao dien va danh sach dien vien kem vai dien.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200", description = "Lay metadata thanh cong"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404", description = "TMDB khong co ban ghi voi ma nay",
                    content = @Content(schema = @Schema(implementation = ApiError.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "503", description = "Chua cau hinh khoa TMDB",
                    content = @Content(schema = @Schema(implementation = ApiError.class)))
    })
    public ResponseEntity<ApiResponse<TmdbDetail>> tmdbMovie(
            @Parameter(description = "Ma phim tren TMDB", example = "550", required = true)
            @PathVariable String id,

            @Parameter(description = "Loai ban ghi", example = "movie",
                    schema = @Schema(allowableValues = {"movie", "tv"}))
            @RequestParam(defaultValue = "movie") String type) {

        TmdbDetail detail = tmdbService.details(type, id)
                .orElseThrow(() -> new ResourceNotFoundException("TMDB_NOT_FOUND",
                        "TheMovieDB khong co ban ghi '" + type + "/" + id + "'"));

        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    @GetMapping("/tmdb/genres")
    @Operation(
            summary = "Danh muc the loai cua TheMovieDB",
            description = "Tra ve ma va ten the loai, dung de dien tham so `withGenres` cua "
                    + "endpoint discover va de dich `genreIds` trong ket qua.")
    public ResponseEntity<ApiResponse<List<Taxonomy>>> genres(
            @Parameter(description = "Loai ban ghi", example = "movie",
                    schema = @Schema(allowableValues = {"movie", "tv"}))
            @RequestParam(defaultValue = "movie") String type) {

        return ResponseEntity.ok(ApiResponse.ok(tmdbService.genres(type)));
    }

    @GetMapping("/tmdb/status")
    @Operation(
            summary = "Tinh trang cau hinh TMDB",
            description = "Cho biet backend da co khoa TMDB hay chua, de giao dien an "
                    + "cac tinh nang phu thuoc TMDB thay vi de nguoi dung bam roi gap loi.")
    public ResponseEntity<ApiResponse<TmdbStatus>> status() {
        boolean configured = tmdbService.isConfigured();
        String message = configured
                ? "Da cau hinh khoa TheMovieDB"
                : "Chua cau hinh khoa TheMovieDB. Dat TMDB_ACCESS_TOKEN hoac TMDB_API_KEY.";
        return ResponseEntity.ok(ApiResponse.ok(new TmdbStatus(configured, message)));
    }

    /**
     * @param configured backend da co khoa TMDB hay chua
     * @param message    mo ta ngan de hien thi cho nguoi dung
     */
    @Schema(name = "TmdbStatus", description = "Tinh trang cau hinh TheMovieDB")
    public record TmdbStatus(boolean configured, String message) {
    }
}
