package com.rapphim.warehouse.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * Mot tap phim thuoc mot server phat.
 */
@Schema(name = "Episode", description = "Mot tap phim")
public record Episode(

        @Schema(description = "Ten tap", example = "Tap 01")
        String name,

        @Schema(description = "Slug cua tap", example = "tap-01")
        String slug,

        @Schema(description = "Ten file goc tu nguon")
        String filename,

        @Schema(description = "Link iframe embed, dung duoc ngay trong the <iframe>")
        String linkEmbed,

        @Schema(description = "Link HLS .m3u8 de phat bang hls.js hoac player ho tro HLS")
        String linkM3u8,

        /*
         * Kho phim rieng khong dong goi HLS ma de nguyen file .mp4 / .mkv, phat bang
         * cach gan thang vao the <video>. Hai nguon cong cong khong co truong nay.
         */
        @Schema(description = "Link file video phat truc tiep (mp4/mkv), dung khi khong co HLS")
        String linkDirect,

        @Schema(description = "Cac duong phu de di kem, rong neu nguon khong co")
        List<Subtitle> subtitles
) {

    /** Dung cho cac nguon chi co HLS hoac iframe, khong co file roi va phu de. */
    public Episode(String name, String slug, String filename, String linkEmbed, String linkM3u8) {
        this(name, slug, filename, linkEmbed, linkM3u8, null, List.of());
    }
}
