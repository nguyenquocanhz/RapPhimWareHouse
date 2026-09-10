package com.rapphim.warehouse.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * Metadata day du cua mot anime tren AniList.
 */
@Schema(name = "AnimeDetail", description = "Metadata anime day du tu AniList")
public record AnimeDetail(

        @Schema(description = "Ma anime tren AniList", example = "21")
        String id,

        @Schema(description = "Tieu de hien thi (uu tien tieng Anh, sau do romaji)")
        String title,

        @Schema(description = "Tieu de romaji")
        String titleRomaji,

        @Schema(description = "Tieu de tieng Anh")
        String titleEnglish,

        @Schema(description = "Tieu de goc (tieng Nhat)")
        String titleNative,

        @Schema(description = "Tom tat noi dung")
        String description,

        @Schema(description = "Dinh dang", example = "TV")
        String format,

        @Schema(description = "Tinh trang phat song", example = "FINISHED",
                allowableValues = {"FINISHED", "RELEASING", "NOT_YET_RELEASED", "CANCELLED", "HIATUS"})
        String status,

        @Schema(description = "So tap", example = "24")
        Integer episodes,

        @Schema(description = "Thoi luong moi tap, tinh bang phut", example = "24")
        Integer durationMinutes,

        @Schema(description = "Nam phat song mua chieu", example = "2013")
        Integer seasonYear,

        @Schema(description = "Mua chieu", example = "SPRING",
                allowableValues = {"WINTER", "SPRING", "SUMMER", "FALL"})
        String season,

        @Schema(description = "Diem trung binh tren thang 100", example = "84")
        Integer scorePercent,

        @Schema(description = "Do pho bien do AniList tinh")
        Integer popularity,

        @Schema(description = "The loai")
        List<String> genres,

        @Schema(description = "Cac hang phim chinh")
        List<String> studios,

        @Schema(description = "Anh bia (URL tuyet doi)")
        String coverImageUrl,

        @Schema(description = "Anh banner ngang (URL tuyet doi)")
        String bannerImageUrl,

        @Schema(description = "Ngay bat dau phat, dang yyyy-MM-dd hoac chi nam", example = "2013-04-07")
        String startDate,

        @Schema(description = "Tap sap phat tiep theo, rong neu da chieu xong")
        NextAiring nextAiring,

        @Schema(description = "Trang AniList cua anime nay")
        String siteUrl
) {

    /**
     * @param episode  so thu tu tap sap phat
     * @param airingAt thoi diem phat, dang ISO-8601
     */
    @Schema(name = "AnimeNextAiring", description = "Tap anime sap phat")
    public record NextAiring(Integer episode, String airingAt) {
    }
}
