package com.rapphim.warehouse.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * Thong tin day du cua mot bo phim, kem danh sach server va tap phim.
 */
@Schema(name = "MovieDetail", description = "Thong tin day du cua phim kem danh sach tap")
public record MovieDetail(

        @Schema(description = "Ma dinh danh tu nguon")
        String id,

        @Schema(description = "Slug", example = "doi-chung")
        String slug,

        @Schema(description = "Ten tieng Viet", example = "Doi Chung")
        String name,

        @Schema(description = "Ten goc", example = "Cause Of Death")
        String originName,

        @Schema(description = "Noi dung / mo ta (co the chua the HTML)")
        String content,

        @Schema(description = "Anh poster (doc)")
        String posterUrl,

        @Schema(description = "Anh thumbnail (ngang)")
        String thumbUrl,

        @Schema(description = "Link trailer YouTube neu co")
        String trailerUrl,

        @Schema(description = "Nam phat hanh", example = "2026")
        Integer year,

        @Schema(description = "Loai phim: single | series | tvshows | hoathinh", example = "series")
        String type,

        @Schema(description = "Trang thai phat song", example = "ongoing")
        String status,

        @Schema(description = "Chat luong", example = "FHD")
        String quality,

        @Schema(description = "Ngon ngu / ban phat", example = "Long Tieng")
        String lang,

        @Schema(description = "Thoi luong", example = "45 phut/tap")
        String time,

        @Schema(description = "Tap moi nhat hien co", example = "Tap 2")
        String episodeCurrent,

        @Schema(description = "Tong so tap", example = "25")
        String episodeTotal,

        @Schema(description = "Danh sach dien vien")
        List<String> actors,

        @Schema(description = "Danh sach dao dien")
        List<String> directors,

        @Schema(description = "Danh sach the loai")
        List<Taxonomy> categories,

        @Schema(description = "Danh sach quoc gia")
        List<Taxonomy> countries,

        @Schema(description = "Danh sach server phat kem cac tap")
        List<EpisodeServer> servers,

        @Schema(description = "Dinh danh tren TheMovieDB, null neu nguon khong cung cap")
        TmdbRef tmdb,

        @Schema(description = "Dinh danh tren IMDb, null neu nguon khong cung cap")
        ImdbRef imdb,

        @Schema(description = "Nguon cung cap du lieu", example = "kkphim")
        String provider,

        @Schema(description = "Thoi diem nguon cap nhat lan cuoi (ISO-8601)")
        String modifiedAt
) {
}
