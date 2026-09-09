package com.rapphim.warehouse.dto;

/**
 * Bo tham so cho endpoint duyet tim cua TheMovieDB.
 *
 * @param page                trang, bat dau tu 1
 * @param sortBy              cach sap xep, vi du {@code popularity.desc}
 * @param withGenres          ma the loai TMDB, ngan bang dau phay (va) hoac gach doc (hoac)
 * @param withOriginalLanguage ngon ngu goc theo ma ISO 639-1, vi du {@code ko}
 * @param year                nam phat hanh
 * @param voteAverageGte      diem toi thieu
 * @param voteCountGte        so luot danh gia toi thieu, tranh phim it nguoi cham
 * @param region              ma quoc gia ISO 3166-1 dung cho ngay phat hanh
 * @param includeAdult        co lay ca phim danh cho nguoi lon hay khong
 */
public record TmdbDiscoverQuery(
        int page,
        String sortBy,
        String withGenres,
        String withOriginalLanguage,
        Integer year,
        Double voteAverageGte,
        Integer voteCountGte,
        String region,
        boolean includeAdult
) {

    public static final String DEFAULT_SORT = "popularity.desc";

    public TmdbDiscoverQuery {
        page = Math.max(page, 1);
        sortBy = (sortBy == null || sortBy.isBlank()) ? DEFAULT_SORT : sortBy.trim();
        withGenres = blankToNull(withGenres);
        withOriginalLanguage = blankToNull(withOriginalLanguage);
        region = blankToNull(region);
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
