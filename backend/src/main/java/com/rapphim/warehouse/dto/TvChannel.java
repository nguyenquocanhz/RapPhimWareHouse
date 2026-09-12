package com.rapphim.warehouse.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Mot kenh truyen hinh truc tiep, phan tich tu playlist M3U cua iptv-org.
 *
 * @param id    ma kenh (tvg-id), co the rong
 * @param name  ten kenh hien thi
 * @param logo  URL logo kenh, co the null
 * @param group nhom / the loai (group-title), co the null
 * @param url   luong phat truc tiep (thuong la HLS .m3u8)
 */
@Schema(description = "Mot kenh truyen hinh truc tiep")
public record TvChannel(
        @Schema(description = "Ma kenh (tvg-id)", example = "VTV1.vn") String id,
        @Schema(description = "Ten kenh", example = "VTV1 HD") String name,
        @Schema(description = "URL logo kenh") String logo,
        @Schema(description = "Nhom / the loai", example = "General") String group,
        @Schema(description = "Luong phat truc tiep (HLS .m3u8)") String url) {
}
