package com.rapphim.warehouse.common;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * Ket qua dang danh sach co phan trang.
 *
 * @param <T> kieu phan tu trong danh sach
 */
@Schema(description = "Danh sach ket qua kem thong tin phan trang")
public record PageResponse<T>(

        @Schema(description = "Danh sach phan tu cua trang hien tai")
        List<T> items,

        @Schema(description = "Thong tin phan trang")
        PageMeta meta,

        @Schema(description = "Nguon du lieu da phuc vu request nay", example = "kkphim")
        String provider
) {

    public static <T> PageResponse<T> of(List<T> items, PageMeta meta, String provider) {
        return new PageResponse<>(items == null ? List.of() : items, meta, provider);
    }

    public static <T> PageResponse<T> empty(int page, int limit, String provider) {
        return new PageResponse<>(List.of(), PageMeta.of(page, limit, 0), provider);
    }
}
