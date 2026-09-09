package com.rapphim.warehouse.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * Mot server phat kem danh sach tap cua server do.
 */
@Schema(name = "EpisodeServer", description = "Server phat va danh sach tap")
public record EpisodeServer(

        @Schema(description = "Ten server", example = "Vietsub #1")
        String serverName,

        @Schema(description = "Danh sach tap thuoc server nay")
        List<Episode> episodes
) {
}
