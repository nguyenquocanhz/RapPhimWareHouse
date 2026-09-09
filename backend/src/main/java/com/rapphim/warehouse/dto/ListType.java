package com.rapphim.warehouse.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Arrays;

/**
 * Cac nhom danh sach phim (tuong ung "type_list" cua nguon).
 */
@Schema(name = "ListType", description = "Nhom danh sach phim", example = "phim-bo")
public enum ListType {

    PHIM_BO("phim-bo", "Phim bo"),
    PHIM_LE("phim-le", "Phim le"),
    TV_SHOWS("tv-shows", "TV Shows"),
    HOAT_HINH("hoat-hinh", "Hoat hinh"),
    PHIM_VIETSUB("phim-vietsub", "Phim Vietsub"),
    PHIM_THUYET_MINH("phim-thuyet-minh", "Phim thuyet minh"),
    PHIM_LONG_TIENG("phim-long-tieng", "Phim long tieng"),
    DANG_CHIEU("dang-chieu", "Dang chieu");

    private final String slug;
    private final String label;

    ListType(String slug, String label) {
        this.slug = slug;
        this.label = label;
    }

    @JsonValue
    public String slug() {
        return slug;
    }

    public String label() {
        return label;
    }

    @JsonCreator
    public static ListType from(String value) {
        if (value == null || value.isBlank()) {
            return PHIM_BO;
        }
        return Arrays.stream(values())
                .filter(t -> t.slug.equalsIgnoreCase(value.trim()) || t.name().equalsIgnoreCase(value.trim()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Danh sach '" + value + "' khong hop le. Chi chap nhan: phim-bo, phim-le, tv-shows, "
                                + "hoat-hinh, phim-vietsub, phim-thuyet-minh, phim-long-tieng, dang-chieu"));
    }
}
