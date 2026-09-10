package com.rapphim.warehouse.web;

import com.rapphim.warehouse.common.PageMeta;
import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.dto.AnimeDetail;
import com.rapphim.warehouse.dto.AnimeSummary;
import com.rapphim.warehouse.service.AnimeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang web anime: envelope, kiem tham so, dinh tuyen chi tiet theo source,
 * va 404. Facade duoc mock nen test khong goi ra AniList/Jikan that.
 */
@WebMvcTest(AnimeController.class)
@AutoConfigureMockMvc
class AnimeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AnimeService service;

    private static AnimeSummary sampleSummary(String source) {
        return new AnimeSummary(
                "21", "One Piece", "One Piece", "ワンピース",
                "TV", 1000, 1999, 88,
                List.of("Action", "Adventure"),
                "https://img/cover.jpg", "https://img/banner.jpg",
                "https://anilist.co/anime/21", source);
    }

    private static AnimeDetail sampleDetail(String source) {
        return new AnimeDetail(
                "21", "One Piece", "One Piece", "One Piece", "ワンピース",
                "Mot cau chuyen hai tac.", "TV", "RELEASING", 1000, 24,
                1999, "FALL", 88, 500000,
                List.of("Action"), List.of("Toei Animation"),
                "https://img/cover.jpg", "https://img/banner.jpg", "1999-10-20",
                new AnimeDetail.NextAiring(1001, "2026-01-01T09:30:00Z"),
                "https://anilist.co/anime/21", source);
    }

    @Test
    @DisplayName("trending: envelope co items kem source")
    void trendingReturnsItems() throws Exception {
        given(service.trending(1, 24))
                .willReturn(PageResponse.of(List.of(sampleSummary("anilist")),
                        PageMeta.of(1, 24, 5000), "anilist"));

        mockMvc.perform(get("/api/v1/anime/trending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].id").value("21"))
                .andExpect(jsonPath("$.data.items[0].source").value("anilist"))
                .andExpect(jsonPath("$.data.items[0].scorePercent").value(88));
    }

    @Test
    @DisplayName("trending: perPage vuot 50 bi tu choi 400")
    void trendingRejectsTooLargePerPage() throws Exception {
        mockMvc.perform(get("/api/v1/anime/trending").param("perPage", "100"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("search: thieu keyword bi tu choi 400")
    void searchRequiresKeyword() throws Exception {
        mockMvc.perform(get("/api/v1/anime/search"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("search: co keyword thi tra ve items")
    void searchReturnsItems() throws Exception {
        given(service.search(eq("one piece"), anyInt(), anyInt()))
                .willReturn(PageResponse.of(List.of(sampleSummary("anilist")),
                        PageMeta.of(1, 24, 1), "anilist"));

        mockMvc.perform(get("/api/v1/anime/search").param("keyword", "one piece"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].title").value("One Piece"));
    }

    @Test
    @DisplayName("chi tiet: mac dinh hoi AniList")
    void detailsDefaultsToAnilist() throws Exception {
        given(service.details(21, "anilist")).willReturn(Optional.of(sampleDetail("anilist")));

        mockMvc.perform(get("/api/v1/anime/21"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.source").value("anilist"))
                .andExpect(jsonPath("$.data.studios[0]").value("Toei Animation"));
    }

    @Test
    @DisplayName("chi tiet: source=jikan dinh tuyen sang Jikan")
    void detailsRoutesToJikan() throws Exception {
        given(service.details(21, "jikan")).willReturn(Optional.of(sampleDetail("jikan")));

        mockMvc.perform(get("/api/v1/anime/21").param("source", "jikan"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.source").value("jikan"));
    }

    @Test
    @DisplayName("chi tiet: khong co ban ghi thi 404")
    void detailsNotFound() throws Exception {
        given(service.details(999999, "anilist")).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/anime/999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ANIME_NOT_FOUND"));
    }

    @Test
    @DisplayName("the loai: tra ve mang ten")
    void genresReturnsList() throws Exception {
        given(service.genres()).willReturn(List.of("Action", "Adventure"));

        mockMvc.perform(get("/api/v1/anime/genres"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0]").value("Action"));
    }
}
