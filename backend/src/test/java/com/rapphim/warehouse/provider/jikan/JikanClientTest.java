package com.rapphim.warehouse.provider.jikan;

import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.dto.AnimeDetail;
import com.rapphim.warehouse.dto.AnimeSummary;
import com.rapphim.warehouse.exception.UpstreamException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Kiem tra anh xa JSON Jikan -&gt; DTO bang may chu gia. Cac mau JSON lay tu shape THAT
 * cua Jikan v4 (da probe truc tiep). Chu y hai cho da chuan hoa: diem thang 10 -&gt; 100,
 * va source = "jikan".
 */
class JikanClientTest {

    private JikanClient clientWith(MockRestServiceServer[] holder) {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.jikan.moe/v4");
        holder[0] = MockRestServiceServer.bindTo(builder).build();
        return new JikanClient(builder.build());
    }

    @Test
    @DisplayName("trending: parse /top/anime, diem thang 10 -> 100, source jikan")
    void trendingMapsAndScales() {
        MockRestServiceServer[] server = new MockRestServiceServer[1];
        JikanClient client = clientWith(server);

        String json = """
                {"pagination":{"last_visible_page":100,"has_next_page":true,"current_page":1,
                  "items":{"count":1,"total":2500,"per_page":25}},
                 "data":[{"mal_id":21,"title":"One Piece","title_english":"One Piece",
                   "title_japanese":"ワンピース","type":"TV","episodes":1000,"year":1999,
                   "score":8.7,"members":2000000,"genres":[{"mal_id":1,"name":"Action"}],
                   "images":{"jpg":{"image_url":"https://img/s.jpg","large_image_url":"https://img/l.jpg"}},
                   "url":"https://myanimelist.net/anime/21"}]}
                """;
        server[0].expect(method(org.springframework.http.HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        PageResponse<AnimeSummary> page = client.trending(1, 25);

        assertThat(page.provider()).isEqualTo("jikan");
        assertThat(page.meta().totalItems()).isEqualTo(2500);
        AnimeSummary a = page.items().get(0);
        assertThat(a.id()).isEqualTo("21");
        assertThat(a.scorePercent()).isEqualTo(87);   // 8.7 * 10
        assertThat(a.coverImageUrl()).isEqualTo("https://img/l.jpg");
        assertThat(a.source()).isEqualTo("jikan");
    }

    @Test
    @DisplayName("chi tiet: parse /anime/{id}, startDate tu aired.prop, duration ra so phut")
    void detailsMapsFull() {
        MockRestServiceServer[] server = new MockRestServiceServer[1];
        JikanClient client = clientWith(server);

        String json = """
                {"data":{"mal_id":21,"title":"One Piece","title_english":"One Piece",
                  "title_japanese":"ワンピース","type":"TV","episodes":null,"year":1999,
                  "score":8.7,"members":2000000,"synopsis":"Hai tac.","status":"Currently Airing",
                  "duration":"24 min per ep","season":"fall","genres":[{"mal_id":1,"name":"Action"}],
                  "images":{"jpg":{"large_image_url":"https://img/l.jpg"}},
                  "url":"https://myanimelist.net/anime/21",
                  "studios":[{"name":"Toei Animation"}],
                  "aired":{"prop":{"from":{"day":20,"month":10,"year":1999}}}}}
                """;
        server[0].expect(method(org.springframework.http.HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        Optional<AnimeDetail> maybe = client.details(21);

        assertThat(maybe).isPresent();
        AnimeDetail d = maybe.get();
        assertThat(d.title()).isEqualTo("One Piece");
        assertThat(d.scorePercent()).isEqualTo(87);
        assertThat(d.durationMinutes()).isEqualTo(24);
        assertThat(d.startDate()).isEqualTo("1999-10-20");
        assertThat(d.studios()).containsExactly("Toei Animation");
        assertThat(d.source()).isEqualTo("jikan");
    }

    @Test
    @DisplayName("chi tiet: 404 tra ve rong")
    void detailsNotFound() {
        MockRestServiceServer[] server = new MockRestServiceServer[1];
        JikanClient client = clientWith(server);

        server[0].expect(method(org.springframework.http.HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertThat(client.details(999999)).isEmpty();
    }

    @Test
    @DisplayName("504 lien tuc: thu lai vai lan roi bao UpstreamException, khong nuot")
    void serverErrorRetriesThenRaises() {
        MockRestServiceServer[] server = new MockRestServiceServer[1];
        JikanClient client = clientWith(server);

        // 5xx duoc thu lai NETWORK_ATTEMPTS (3) lan; het lan thi bao loi.
        server[0].expect(ExpectedCount.times(3), method(org.springframework.http.HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.GATEWAY_TIMEOUT));

        assertThatThrownBy(() -> client.trending(1, 25))
                .isInstanceOf(UpstreamException.class);
        server[0].verify();
    }

    @Test
    @DisplayName("504 roi 200: thu lai va hoi phuc, tra ve du lieu")
    void serverErrorThenRecovers() {
        MockRestServiceServer[] server = new MockRestServiceServer[1];
        JikanClient client = clientWith(server);

        String json = """
                {"pagination":{"items":{"total":10}},
                 "data":[{"mal_id":1,"title":"X","score":7.0,
                   "images":{"jpg":{"large_image_url":"https://img/x.jpg"}}}]}
                """;
        server[0].expect(method(org.springframework.http.HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.GATEWAY_TIMEOUT));
        server[0].expect(method(org.springframework.http.HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        assertThat(client.trending(1, 25).items()).hasSize(1);
        server[0].verify();
    }

    @Test
    @DisplayName("429 KHONG thu lai (lam lai chi cang bi gioi han)")
    void rateLimitDoesNotRetry() {
        MockRestServiceServer[] server = new MockRestServiceServer[1];
        JikanClient client = clientWith(server);

        // Chi khai bao MOT lan: neu client thu lai, se co request thu hai khong khop.
        server[0].expect(ExpectedCount.once(), method(org.springframework.http.HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));

        assertThatThrownBy(() -> client.trending(1, 25))
                .isInstanceOf(UpstreamException.class)
                .hasMessageContaining("giới hạn");
        server[0].verify();
    }
}
