package com.rapphim.warehouse.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TmdbDiscoverQueryTest {

    private TmdbDiscoverQuery query(int page, String sortBy, String genres, String language, String region) {
        return new TmdbDiscoverQuery(page, sortBy, genres, language, null, null, null, region, false);
    }

    @Test
    @DisplayName("Trang nho hon 1 duoc keo ve 1")
    void pageIsClampedToAtLeastOne() {
        assertThat(query(0, null, null, null, null).page()).isEqualTo(1);
        assertThat(query(-5, null, null, null, null).page()).isEqualTo(1);
        assertThat(query(7, null, null, null, null).page()).isEqualTo(7);
    }

    @Test
    @DisplayName("Thieu cach sap xep thi dung mac dinh cua TMDB")
    void sortFallsBackToDefault() {
        assertThat(query(1, null, null, null, null).sortBy()).isEqualTo("popularity.desc");
        assertThat(query(1, "   ", null, null, null).sortBy()).isEqualTo("popularity.desc");
        assertThat(query(1, " vote_average.desc ", null, null, null).sortBy())
                .isEqualTo("vote_average.desc");
    }

    @Test
    @DisplayName("Bo loc rong tro thanh null de khong gui tham so thua len TMDB")
    void blankFiltersBecomeNull() {
        TmdbDiscoverQuery blank = query(1, null, "  ", "", "   ");
        assertThat(blank.withGenres()).isNull();
        assertThat(blank.withOriginalLanguage()).isNull();
        assertThat(blank.region()).isNull();

        TmdbDiscoverQuery filled = query(1, null, " 28,12 ", " ko ", " VN ");
        assertThat(filled.withGenres()).isEqualTo("28,12");
        assertThat(filled.withOriginalLanguage()).isEqualTo("ko");
        assertThat(filled.region()).isEqualTo("VN");
    }
}
