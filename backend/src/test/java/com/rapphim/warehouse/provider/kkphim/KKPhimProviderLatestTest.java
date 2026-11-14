package com.rapphim.warehouse.provider.kkphim;

import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.dto.MovieQuery;
import com.rapphim.warehouse.dto.MovieSummary;
import com.rapphim.warehouse.exception.UpstreamException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Phim moi cua KKPhim: endpoint cu truoc, endpoint moi chi khi cu tra 404.
 * Endpoint moi co dinh 24 phim/trang (bo qua limit) nen phai tu cat cho dung.
 */
class KKPhimProviderLatestTest {

    private static final String BASE = "https://phimapi.com";

    private MockRestServiceServer server;

    private KKPhimProvider provider() {
        RestClient.Builder builder = RestClient.builder().baseUrl(BASE);
        server = MockRestServiceServer.bindTo(builder).build();
        return new KKPhimProvider(builder.build(), "https://phimimg.com", "kkphim");
    }

    /** Mot trang phim co slug m{from}..m{from+count-1}, dung dang V1 cua KKPhim. */
    private static String page(int from, int count, int perPage, int currentPage, long total) {
        String items = IntStream.range(from, from + count)
                .mapToObj(i -> "{\"_id\":\"id" + i + "\",\"name\":\"M" + i + "\",\"slug\":\"m" + i + "\"}")
                .collect(Collectors.joining(","));
        return """
                {"status":"success","data":{"items":[%s],
                 "params":{"pagination":{"totalItems":%d,"totalItemsPerPage":%d,"currentPage":%d,"totalPages":%d}}}}
                """.formatted(items, total, perPage, currentPage, (total + perPage - 1) / perPage);
    }

    private static final String NOT_FOUND = "{\"status\":false,\"msg\":\"hmmm!\"}";

    @Test
    @DisplayName("Endpoint cu con chay: goi cu, gui limit, khong dong toi endpoint moi")
    void usesOldEndpointWhenAvailable() {
        KKPhimProvider kk = provider();
        server.expect(requestTo(startsWith(BASE + KKPhimProvider.LATEST_PATH)))
                .andExpect(queryParam("limit", "12"))
                .andExpect(queryParam("page", "2"))
                .andRespond(withSuccess(page(13, 12, 12, 2, 100), MediaType.APPLICATION_JSON));

        PageResponse<MovieSummary> result = kk.latest(MovieQuery.of(2, 12));

        assertThat(result.items()).extracting(MovieSummary::slug).first().isEqualTo("m13");
        assertThat(result.items()).hasSize(12);
        server.verify();
    }

    @Test
    @DisplayName("Cu tra 404: chuyen sang endpoint moi va cat dung trang 2 limit 12 (phim 13-24)")
    void fallsBackAndSlicesWithinOneUpstreamPage() {
        KKPhimProvider kk = provider();
        server.expect(requestTo(startsWith(BASE + KKPhimProvider.LATEST_PATH)))
                .andRespond(withStatus(HttpStatus.NOT_FOUND).contentType(MediaType.APPLICATION_JSON).body(NOT_FOUND));
        server.expect(requestTo(BASE + KKPhimProvider.LATEST_FALLBACK_PATH + "?page=1"))
                .andRespond(withSuccess(page(1, 24, 24, 1, 100), MediaType.APPLICATION_JSON));

        PageResponse<MovieSummary> result = kk.latest(MovieQuery.of(2, 12));

        assertThat(result.items()).extracting(MovieSummary::slug)
                .containsExactlyElementsOf(IntStream.rangeClosed(13, 24).mapToObj(i -> "m" + i).toList());
        assertThat(result.meta().page()).isEqualTo(2);
        assertThat(result.meta().limit()).isEqualTo(12);
        assertThat(result.meta().totalItems()).isEqualTo(100);
        assertThat(result.meta().totalPages()).isEqualTo(9);
        server.verify();
    }

    @Test
    @DisplayName("Cu tra 404: doan can lay vat qua hai trang nguon thi ghep hai trang")
    void fallbackSpansTwoUpstreamPages() {
        KKPhimProvider kk = provider();
        server.expect(requestTo(startsWith(BASE + KKPhimProvider.LATEST_PATH)))
                .andRespond(withStatus(HttpStatus.NOT_FOUND).contentType(MediaType.APPLICATION_JSON).body(NOT_FOUND));
        // Trang 2 limit 20 = phim 21-40: nam o trang nguon 1 (1-24) va 2 (25-48).
        server.expect(requestTo(BASE + KKPhimProvider.LATEST_FALLBACK_PATH + "?page=1"))
                .andRespond(withSuccess(page(1, 24, 24, 1, 100), MediaType.APPLICATION_JSON));
        server.expect(requestTo(BASE + KKPhimProvider.LATEST_FALLBACK_PATH + "?page=2"))
                .andRespond(withSuccess(page(25, 24, 24, 2, 100), MediaType.APPLICATION_JSON));

        PageResponse<MovieSummary> result = kk.latest(MovieQuery.of(2, 20));

        assertThat(result.items()).extracting(MovieSummary::slug)
                .containsExactlyElementsOf(IntStream.rangeClosed(21, 40).mapToObj(i -> "m" + i).toList());
        server.verify();
    }

    @Test
    @DisplayName("Cu tra 404, trang cuoi thieu phim: tra phan con lai, khong vo")
    void fallbackLastPartialPage() {
        KKPhimProvider kk = provider();
        server.expect(requestTo(startsWith(BASE + KKPhimProvider.LATEST_PATH)))
                .andRespond(withStatus(HttpStatus.NOT_FOUND).contentType(MediaType.APPLICATION_JSON).body(NOT_FOUND));
        // 30 phim tong; trang 3 limit 12 = phim 25-30 nam o trang nguon 2 (chi co 6 phim).
        server.expect(requestTo(BASE + KKPhimProvider.LATEST_FALLBACK_PATH + "?page=2"))
                .andRespond(withSuccess(page(25, 6, 24, 2, 30), MediaType.APPLICATION_JSON));

        PageResponse<MovieSummary> result = kk.latest(MovieQuery.of(3, 12));

        assertThat(result.items()).extracting(MovieSummary::slug)
                .containsExactly("m25", "m26", "m27", "m28", "m29", "m30");
        assertThat(result.meta().totalPages()).isEqualTo(3);
        server.verify();
    }

    @Test
    @DisplayName("Loi 5xx o endpoint cu KHONG chuyen sang du phong - van bao loi upstream")
    void serverErrorIsNotFallback() {
        KKPhimProvider kk = provider();
        server.expect(requestTo(startsWith(BASE + KKPhimProvider.LATEST_PATH)))
                .andRespond(withStatus(HttpStatus.BAD_GATEWAY));

        assertThatThrownBy(() -> kk.latest(MovieQuery.of(1, 24))).isInstanceOf(UpstreamException.class);
        server.verify();
    }

    @Test
    @DisplayName("Endpoint khac (the loai) gap 404 van doc body nhu cu, khong nem EndpointGone")
    void otherEndpointsKeepOld404Behaviour() {
        KKPhimProvider kk = provider();
        server.expect(requestTo(startsWith(BASE + "/v1/api/the-loai/khong-co")))
                .andRespond(withStatus(HttpStatus.NOT_FOUND).contentType(MediaType.APPLICATION_JSON).body(NOT_FOUND));

        PageResponse<MovieSummary> result = kk.listByCategory("khong-co", MovieQuery.of(1, 24));

        assertThat(result.items()).isEmpty();
        server.verify();
    }
}
