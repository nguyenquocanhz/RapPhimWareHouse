package com.rapphim.warehouse.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Mot muc phan loai dung chung cho the loai / quoc gia.
 */
@Schema(name = "Taxonomy", description = "The loai hoac quoc gia")
public record Taxonomy(

        @Schema(description = "Ma dinh danh tu nguon", example = "9822be111d2ccc29c7172c78b8af8ff5")
        String id,

        @Schema(description = "Ten hien thi", example = "Hanh Dong")
        String name,

        @Schema(description = "Slug dung tren URL", example = "hanh-dong")
        String slug
) {
}
