package com.rapphim.warehouse.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * Mot phim trong ket qua duyet tim tren TheMovieDB.
 */
@Schema(name = "TmdbDiscoverItem", description = "Phim trong ket qua discover cua TMDB")
public record TmdbDiscoverItem(

        @Schema(description = "Ma phim tren TMDB", example = "550")
        String id,

        @Schema(description = "Tieu de theo ngon ngu da cau hinh")
        String title,

        @Schema(description = "Tieu de goc")
        String originalTitle,

        @Schema(description = "Ngon ngu goc theo ma ISO 639-1", example = "en")
        String originalLanguage,

        @Schema(description = "Tom tat noi dung")
        String overview,

        @Schema(description = "Ngay phat hanh dang yyyy-MM-dd", example = "1999-10-15")
        String releaseDate,

        @Schema(description = "Diem trung binh tren thang 10", example = "8.4")
        Double voteAverage,

        @Schema(description = "So luot danh gia", example = "26280")
        Integer voteCount,

        @Schema(description = "Do pho bien do TMDB tinh")
        Double popularity,

        @Schema(description = "Anh poster")
        String posterUrl,

        @Schema(description = "Anh nen ngang")
        String backdropUrl,

        @Schema(description = "Ma the loai TMDB, tra cuu ten qua GET /api/v1/tmdb/genres")
        List<Integer> genreIds
) {
}
