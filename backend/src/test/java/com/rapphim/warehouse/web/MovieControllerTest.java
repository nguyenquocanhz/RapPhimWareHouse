package com.rapphim.warehouse.web;

import com.rapphim.warehouse.common.PageMeta;
import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.dto.ImdbRef;
import com.rapphim.warehouse.dto.ListType;
import com.rapphim.warehouse.dto.MovieQuery;
import com.rapphim.warehouse.dto.MovieSummary;
import com.rapphim.warehouse.dto.ProviderType;
import com.rapphim.warehouse.dto.TmdbRef;
import com.rapphim.warehouse.exception.ResourceNotFoundException;
import com.rapphim.warehouse.service.MovieBatchService;
import com.rapphim.warehouse.service.MovieService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang web: dinh dang envelope, doc enum tu slug va cac tinh huong loi.
 * Tang service duoc thay bang mock nen test khong goi ra nguon ben ngoai.
 */
@WebMvcTest(MovieController.class)
@AutoConfigureMockMvc
class MovieControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MovieService movieService;

    // Controller can bean nay de phuc vu endpoint /batch, du cac test duoi khong dung toi.
    @MockitoBean
    private MovieBatchService batchService;

    private static MovieSummary sampleMovie() {
        return new MovieSummary(
                "id-1", "doi-chung", "Đối Chứng", "Cause Of Death",
                "https://phimimg.com/poster.webp", "https://phimimg.com/thumb.webp",
                2026, "series", "FHD", "Lồng Tiếng", "45 phút/tập", "Tập 2",
                List.of(), List.of(),
                new TmdbRef("331912", "tv", 1, 7.4, 1280),
                new ImdbRef("tt37015024", null, null),
                "kkphim", "2026-09-08T20:42:25Z");
    }

    @Test
    @DisplayName("GET /api/v1/movies/latest tra ve envelope kem meta phan trang")
    void latestReturnsWrappedPage() throws Exception {
        PageResponse<MovieSummary> page = PageResponse.of(
                List.of(sampleMovie()), new PageMeta(1, 24, 100, 5), "kkphim");
        given(movieService.latest(eq(ProviderType.KKPHIM), any(MovieQuery.class))).willReturn(page);

        mockMvc.perform(get("/api/v1/movies/latest").param("limit", "24"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].slug").value("doi-chung"))
                .andExpect(jsonPath("$.data.meta.totalItems").value(100))
                .andExpect(jsonPath("$.data.meta.totalPages").value(5))
                .andExpect(jsonPath("$.data.provider").value("kkphim"));
    }

    @Test
    @DisplayName("Tham so provider va type nhan gia tri dang slug")
    void enumParametersAcceptSlugValues() throws Exception {
        PageResponse<MovieSummary> page = PageResponse.of(
                List.of(sampleMovie()), new PageMeta(1, 24, 10, 1), "nguonc");
        given(movieService.listByType(eq(ProviderType.NGUONC), eq(ListType.PHIM_BO), any(MovieQuery.class)))
                .willReturn(page);

        mockMvc.perform(get("/api/v1/movies")
                        .param("type", "phim-bo")
                        .param("provider", "nguonc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.provider").value("nguonc"));
    }

    @Test
    @DisplayName("Slug khong ton tai tra ve 404 kem ma MOVIE_NOT_FOUND")
    void unknownSlugReturnsNotFound() throws Exception {
        given(movieService.findBySlug(eq(ProviderType.KKPHIM), eq("khong-co")))
                .willThrow(new ResourceNotFoundException("MOVIE_NOT_FOUND", "Khong tim thay phim"));

        mockMvc.perform(get("/api/v1/movies/khong-co"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.code").value("MOVIE_NOT_FOUND"));
    }

    @Test
    @DisplayName("Nguon khong hop le tra ve 400 kem ma INVALID_PARAMETER")
    void invalidProviderReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/movies/latest").param("provider", "khong-ton-tai"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    @Test
    @DisplayName("limit vuot nguong cho phep bi chan tu tang validate")
    void limitAboveMaximumIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/movies/latest").param("limit", "999"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    @DisplayName("Thieu tu khoa tim kiem tra ve 400 kem ma MISSING_PARAMETER")
    void searchWithoutKeywordIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/movies/search"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MISSING_PARAMETER"));
    }
}
