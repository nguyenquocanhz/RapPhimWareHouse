package com.rapphim.warehouse.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * Ban rut gon cua mot bo phim, dung cho cac man hinh danh sach / grid.
 */
@Schema(name = "MovieSummary", description = "Thong tin rut gon cua phim, dung cho danh sach")
public record MovieSummary(

        @Schema(description = "Ma dinh danh tu nguon", example = "b107d3b6dba125cdb0732029601eeee9")
        String id,

        @Schema(description = "Slug, dung lam khoa tra cuu chi tiet", example = "doi-chung")
        String slug,

        @Schema(description = "Ten tieng Viet", example = "Doi Chung")
        String name,

        @Schema(description = "Ten goc", example = "Cause Of Death")
        String originName,

        @Schema(description = "Anh poster (doc)", example = "https://phimimg.com/uploads/movies/doi-chung-poster.webp")
        String posterUrl,

        @Schema(description = "Anh thumbnail (ngang), uu tien dung cho card kieu YouTube")
        String thumbUrl,

        @Schema(description = "Nam phat hanh", example = "2026")
        Integer year,

        @Schema(description = "Loai phim: single | series | tvshows | hoathinh", example = "series")
        String type,

        @Schema(description = "Chat luong", example = "FHD")
        String quality,

        @Schema(description = "Ngon ngu / ban phat", example = "Long Tieng")
        String lang,

        @Schema(description = "Thoi luong", example = "45 phut/tap")
        String time,

        @Schema(description = "Tap moi nhat hien co", example = "Tap 2")
        String episodeCurrent,

        @Schema(description = "Danh sach the loai")
        List<Taxonomy> categories,

        @Schema(description = "Danh sach quoc gia")
        List<Taxonomy> countries,

        @Schema(description = "Dinh danh tren TheMovieDB, null neu nguon khong cung cap")
        TmdbRef tmdb,

        @Schema(description = "Dinh danh tren IMDb, null neu nguon khong cung cap")
        ImdbRef imdb,

        @Schema(description = "Nguon cung cap du lieu", example = "kkphim")
        String provider,

        @Schema(description = "Thoi diem nguon cap nhat lan cuoi (ISO-8601)", example = "2026-09-08T20:42:25Z")
        String modifiedAt
) {

    /** Rut gon mot ban chi tiet thanh muc danh sach, bo phan tap phim va noi dung. */
    public static MovieSummary from(MovieDetail movie) {
        return new MovieSummary(
                movie.id(),
                movie.slug(),
                movie.name(),
                movie.originName(),
                movie.posterUrl(),
                movie.thumbUrl(),
                movie.year(),
                movie.type(),
                movie.quality(),
                movie.lang(),
                movie.time(),
                movie.episodeCurrent(),
                movie.categories(),
                movie.countries(),
                movie.tmdb(),
                movie.imdb(),
                movie.provider(),
                movie.modifiedAt());
    }
}
