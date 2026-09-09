package com.rapphim.warehouse.common;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Thong tin phan trang di kem mot danh sach ket qua.
 */
@Schema(name = "PageMeta", description = "Thong tin phan trang")
public record PageMeta(

        @Schema(description = "Trang hien tai, bat dau tu 1", example = "1")
        int page,

        @Schema(description = "So phan tu toi da tren mot trang", example = "24")
        int limit,

        @Schema(description = "Tong so phan tu tim duoc", example = "8993")
        long totalItems,

        @Schema(description = "Tong so trang", example = "375")
        int totalPages
) {

    public static PageMeta of(int page, int limit, long totalItems) {
        int safeLimit = Math.max(limit, 1);
        int totalPages = (int) Math.ceil((double) totalItems / safeLimit);
        return new PageMeta(page, safeLimit, totalItems, totalPages);
    }

    public boolean hasNext() {
        return page < totalPages;
    }

    public boolean hasPrevious() {
        return page > 1;
    }
}
