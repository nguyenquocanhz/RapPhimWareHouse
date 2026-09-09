package com.rapphim.warehouse.dto;

/**
 * Bo tham so loc / phan trang dung chung cho moi truy van danh sach phim.
 *
 * @param page      trang hien tai, bat dau tu 1
 * @param limit     so phim tren mot trang
 * @param category  slug the loai can loc, co the null
 * @param country   slug quoc gia can loc, co the null
 * @param year      nam phat hanh can loc, co the null
 * @param sortField truong dung de sap xep, mac dinh "modified.time"
 * @param sortType  chieu sap xep: asc hoac desc
 */
public record MovieQuery(
        int page,
        int limit,
        String category,
        String country,
        Integer year,
        String sortField,
        String sortType
) {

    public static final int DEFAULT_LIMIT = 24;
    public static final int MAX_LIMIT = 64;
    public static final String DEFAULT_SORT_FIELD = "modified.time";
    public static final String DEFAULT_SORT_TYPE = "desc";

    /** Chuan hoa gia tri de khong bao gio gui tham so vo ly len nguon. */
    public MovieQuery {
        page = Math.max(page, 1);
        limit = limit <= 0 ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
        sortField = (sortField == null || sortField.isBlank()) ? DEFAULT_SORT_FIELD : sortField;
        sortType = (sortType == null || sortType.isBlank()) ? DEFAULT_SORT_TYPE : sortType.toLowerCase();
        category = blankToNull(category);
        country = blankToNull(country);
    }

    public static MovieQuery of(int page, int limit) {
        return new MovieQuery(page, limit, null, null, null, null, null);
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
