package com.rapphim.warehouse.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * Metadata day du lay tu TheMovieDB cho mot phim. Day la nguon du lieu chinh
 * khi sinh file NFO cho Kodi / Jellyfin / Emby.
 */
@Schema(name = "TmdbDetail", description = "Metadata phim lay tu TheMovieDB")
public record TmdbDetail(

        @Schema(description = "Ma phim tren TMDB", example = "331912")
        String id,

        @Schema(description = "Loai ban ghi: movie hoac tv", example = "tv")
        String type,

        @Schema(description = "Tieu de theo ngon ngu da cau hinh", example = "Đối Chứng")
        String title,

        @Schema(description = "Tieu de goc", example = "Cause Of Death")
        String originalTitle,

        @Schema(description = "Tom tat noi dung")
        String overview,

        @Schema(description = "Cau tagline ngan")
        String tagline,

        @Schema(description = "Trang chu chinh thuc")
        String homepage,

        @Schema(description = "Trang thai phat hanh tren TMDB", example = "Returning Series")
        String status,

        @Schema(description = "Ngay phat hanh dang yyyy-MM-dd", example = "2026-09-07")
        String releaseDate,

        @Schema(description = "Thoi luong tinh bang phut", example = "45")
        Integer runtime,

        @Schema(description = "So mua, chi co voi phim bo", example = "1")
        Integer numberOfSeasons,

        @Schema(description = "Tong so tap, chi co voi phim bo", example = "25")
        Integer numberOfEpisodes,

        @Schema(description = "Diem trung binh tren thang 10", example = "7.4")
        Double voteAverage,

        @Schema(description = "So luot danh gia", example = "1280")
        Integer voteCount,

        @Schema(description = "Do pho bien do TMDB tinh", example = "38.5")
        Double popularity,

        @Schema(description = "Anh poster do phan giai cao")
        String posterUrl,

        @Schema(description = "Anh nen ngang do phan giai cao")
        String backdropUrl,

        @Schema(description = "The loai theo cach phan loai cua TMDB")
        List<String> genres,

        @Schema(description = "Quoc gia san xuat")
        List<String> countries,

        @Schema(description = "Hang phim hoac dai truyen hinh")
        List<String> studios,

        @Schema(description = "Dao dien, voi phim bo la nguoi sang tao")
        List<String> directors,

        @Schema(description = "Danh sach dien vien, toi da 20 nguoi dau tien")
        List<TmdbCast> cast,

        @Schema(description = "Ma IMDb tuong ung", example = "tt37015024")
        String imdbId
) {
}
