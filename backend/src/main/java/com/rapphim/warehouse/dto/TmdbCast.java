package com.rapphim.warehouse.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Mot vai dien lay tu TheMovieDB, dung cho the {@code <actor>} trong file NFO.
 */
@Schema(name = "TmdbCast", description = "Dien vien va vai dien")
public record TmdbCast(

        @Schema(description = "Ten dien vien", example = "Hera Chan")
        String name,

        @Schema(description = "Ten nhan vat", example = "Trinh Chi Han")
        String character,

        @Schema(description = "Thu tu xuat hien trong danh sach dien vien", example = "0")
        Integer order,

        @Schema(description = "Anh chan dung, null neu TMDB khong co")
        String profileUrl
) {
}
