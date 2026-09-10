package com.rapphim.warehouse.provider.anilist;

import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.dto.AnimeDetail;
import com.rapphim.warehouse.dto.AnimeSummary;
import com.rapphim.warehouse.exception.UpstreamException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Kiem tra ANH XA that JSON -&gt; DTO va cach xu ly loi cua AniListClient bang mot may
 * chu gia. Vi AniList that co the dang tat, cac test nay khong goi ra ngoai - chung
 * xac minh chinh phan ma khong the smoke-test truc tiep: parse GraphQL va doc errors[].
 */
class AniListClientTest {

    private AniListClient clientWith(MockRestServiceServer[] holder) {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://graphql.anilist.co");
        holder[0] = MockRestServiceServer.bindTo(builder).build();
        return new AniListClient(builder.build());
    }

    @Test
    @DisplayName("trending: parse Page JSON thanh AnimeSummary")
    void trendingMapsPage() {
        MockRestServiceServer[] server = new MockRestServiceServer[1];
        AniListClient client = clientWith(server);

        String json = """
                {"data":{"Page":{
                  "pageInfo":{"total":5000,"currentPage":1,"lastPage":209,"perPage":24,"hasNextPage":true},
                  "media":[{"id":21,
                    "title":{"romaji":"One Piece","english":"One Piece","native":"ワンピース"},
                    "format":"TV","episodes":1000,"seasonYear":1999,"averageScore":88,
                    "genres":["Action","Adventure"],
                    "coverImage":{"large":"https://img/large.jpg"},
                    "bannerImage":"https://img/banner.jpg",
                    "siteUrl":"https://anilist.co/anime/21"}]}}}
                """;
        server[0].expect(method(org.springframework.http.HttpMethod.POST))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        PageResponse<AnimeSummary> page = client.trending(1, 24);

        assertThat(page.provider()).isEqualTo("anilist");
        assertThat(page.meta().totalItems()).isEqualTo(5000);
        assertThat(page.items()).hasSize(1);
        AnimeSummary a = page.items().get(0);
        assertThat(a.id()).isEqualTo("21");
        assertThat(a.title()).isEqualTo("One Piece");
        assertThat(a.scorePercent()).isEqualTo(88);
        assertThat(a.coverImageUrl()).isEqualTo("https://img/large.jpg");
        assertThat(a.genres()).containsExactly("Action", "Adventure");
        assertThat(a.source()).isEqualTo("anilist");
    }

    @Test
    @DisplayName("errors[] kem data null: bao UpstreamException, khong coi la rong")
    void graphqlErrorsRaise() {
        MockRestServiceServer[] server = new MockRestServiceServer[1];
        AniListClient client = clientWith(server);

        // Dung ca AniList tam tat that: HTTP 200 kem errors, data null.
        String json = """
                {"data":null,"errors":[{"message":"The AniList API has been temporarily disabled due to severe stability issues."}]}
                """;
        server[0].expect(method(org.springframework.http.HttpMethod.POST))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.trending(1, 24))
                .isInstanceOf(UpstreamException.class)
                .hasMessageContaining("temporarily disabled");
    }

    @Test
    @DisplayName("chi tiet: 404 tra ve rong, khong nem loi")
    void detailsNotFoundReturnsEmpty() {
        MockRestServiceServer[] server = new MockRestServiceServer[1];
        AniListClient client = clientWith(server);

        server[0].expect(method(org.springframework.http.HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertThat(client.details(999999)).isEmpty();
    }

    @Test
    @DisplayName("chi tiet: parse Media JSON day du, gom startDate/studios/nextAiring")
    void detailsMapsFull() {
        MockRestServiceServer[] server = new MockRestServiceServer[1];
        AniListClient client = clientWith(server);

        String json = """
                {"data":{"Media":{"id":21,
                  "title":{"romaji":"One Piece","english":"One Piece","native":"ワンピース"},
                  "description":"Mot cau chuyen hai tac.","format":"TV","status":"RELEASING",
                  "episodes":null,"duration":24,"seasonYear":1999,"season":"FALL",
                  "averageScore":88,"popularity":500000,"genres":["Action"],
                  "coverImage":{"extraLarge":"https://img/xl.jpg","large":"https://img/l.jpg"},
                  "bannerImage":"https://img/b.jpg","siteUrl":"https://anilist.co/anime/21",
                  "startDate":{"year":1999,"month":10,"day":20},
                  "studios":{"nodes":[{"name":"Toei Animation"}]},
                  "nextAiringEpisode":{"episode":1001,"airingAt":1767260400,"timeUntilAiring":123}}}}
                """;
        server[0].expect(method(org.springframework.http.HttpMethod.POST))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        Optional<AnimeDetail> maybe = client.details(21);

        assertThat(maybe).isPresent();
        AnimeDetail d = maybe.get();
        assertThat(d.title()).isEqualTo("One Piece");
        assertThat(d.startDate()).isEqualTo("1999-10-20");
        assertThat(d.studios()).containsExactly("Toei Animation");
        assertThat(d.coverImageUrl()).isEqualTo("https://img/xl.jpg");
        assertThat(d.nextAiring()).isNotNull();
        assertThat(d.nextAiring().episode()).isEqualTo(1001);
        assertThat(d.nextAiring().airingAt()).isNotBlank();
        assertThat(d.episodes()).isNull();
        assertThat(d.source()).isEqualTo("anilist");
    }
}
