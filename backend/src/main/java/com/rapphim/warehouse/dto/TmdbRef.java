package com.rapphim.warehouse.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Tham chieu toi ban ghi tren TheMovieDB. KKPhim tra san khoi nay trong moi phim,
 * nho do lay duoc metadata day du tu TMDB ma khong phai do tim theo ten.
 */
@Schema(name = "TmdbRef", description = "Dinh danh va diem so tren TheMovieDB")
public record TmdbRef(

        @Schema(description = "Ma phim tren TMDB", example = "331912")
        String id,

        @Schema(description = "Loai ban ghi tren TMDB: movie hoac tv", example = "tv")
        String type,

        @Schema(description = "So mua neu la phim bo", example = "1")
        Integer season,

        @Schema(description = "Diem trung binh tren thang 10", example = "7.4")
        Double voteAverage,

        @Schema(description = "So luot danh gia", example = "1280")
        Integer voteCount
) {

    /** Co du thong tin de goi TMDB hay khong. Chi dung noi bo, khong xuat ra JSON. */
    @JsonIgnore
    public boolean isUsable() {
        return id != null && !id.isBlank() && type != null && !type.isBlank();
    }
}
