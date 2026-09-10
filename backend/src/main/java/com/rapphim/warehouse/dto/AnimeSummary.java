package com.rapphim.warehouse.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * Mot anime trong danh sach thinh hanh / ket qua tim kiem cua AniList.
 *
 * <p>{@code scorePercent} la diem tren thang 100 cua AniList (khac thang 10 cua TMDB),
 * dat ten ro de khong nham. Anh la URL tuyet doi do AniList tra ve.</p>
 */
@Schema(name = "AnimeSummary", description = "Anime trong danh sach AniList")
public record AnimeSummary(

        @Schema(description = "Ma anime tren AniList", example = "21")
        String id,

        @Schema(description = "Tieu de hien thi (uu tien tieng Anh, sau do romaji)")
        String title,

        @Schema(description = "Tieu de romaji", example = "One Piece")
        String titleRomaji,

        @Schema(description = "Tieu de goc (tieng Nhat)")
        String titleNative,

        @Schema(description = "Dinh dang", example = "TV",
                allowableValues = {"TV", "TV_SHORT", "MOVIE", "SPECIAL", "OVA", "ONA", "MUSIC"})
        String format,

        @Schema(description = "So tap", example = "24")
        Integer episodes,

        @Schema(description = "Nam phat song mua chieu", example = "2013")
        Integer seasonYear,

        @Schema(description = "Diem trung binh tren thang 100", example = "84")
        Integer scorePercent,

        @Schema(description = "The loai")
        List<String> genres,

        @Schema(description = "Anh bia (URL tuyet doi)")
        String coverImageUrl,

        @Schema(description = "Anh banner ngang (URL tuyet doi)")
        String bannerImageUrl,

        @Schema(description = "Trang AniList cua anime nay")
        String siteUrl
) {
}
