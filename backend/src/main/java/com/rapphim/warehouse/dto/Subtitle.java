package com.rapphim.warehouse.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Mot duong phu de di kem tap phim.
 *
 * <p>Hai nguon cong cong (KKPhim, NguonC) khong tra ve phu de rieng - phu de cua ho
 * chay thang vao hinh. Chi kho phim rieng tren homelab moi co file phu de nam canh
 * file video, va do cung la ly do chinh de doc kho do.</p>
 *
 * @param label   ten hien trong trinh phat, vi du "Tieng Viet"
 * @param lang    ma ngon ngu BCP-47, vi du "vi"
 * @param url     duong dan tai phu de, da o dang WebVTT de the &lt;track&gt; dung duoc
 * @param defaultTrack co bat san khi mo phim hay khong
 */
@Schema(name = "Subtitle", description = "Mot duong phu de cua tap phim")
public record Subtitle(

        @Schema(description = "Ten hien trong trinh phat", example = "Tiếng Việt")
        String label,

        @Schema(description = "Ma ngon ngu BCP-47", example = "vi")
        String lang,

        @Schema(description = "Duong dan file phu de dang WebVTT")
        String url,

        @Schema(description = "Bat san khi mo phim")
        boolean defaultTrack
) {
}
