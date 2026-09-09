package com.rapphim.warehouse.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Tham chieu toi ban ghi tren IMDb, dung lam uniqueid thu hai trong file NFO.
 */
@Schema(name = "ImdbRef", description = "Dinh danh va diem so tren IMDb")
public record ImdbRef(

        @Schema(description = "Ma phim tren IMDb", example = "tt37015024")
        String id,

        @Schema(description = "Diem trung binh tren thang 10", example = "8.1")
        Double voteAverage,

        @Schema(description = "So luot danh gia", example = "45210")
        Integer voteCount
) {
}
