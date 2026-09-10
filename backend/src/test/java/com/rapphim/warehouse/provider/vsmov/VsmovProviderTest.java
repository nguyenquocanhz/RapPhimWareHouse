package com.rapphim.warehouse.provider.vsmov;

import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.config.ProviderProperties;
import com.rapphim.warehouse.dto.MovieDetail;
import com.rapphim.warehouse.dto.MovieQuery;
import com.rapphim.warehouse.dto.MovieSummary;
import com.rapphim.warehouse.dto.ProviderType;
import com.rapphim.warehouse.dto.Taxonomy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestToUriTemplate;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Kiem tra ANH XA that JSON -&gt; DTO cua VsmovProvider bang mot may chu gia.
 *
 * <p>Cac fixture duoi day cat tu chinh phan hoi that cua vsmov.com nen phan biet duoc
 * nhung diem de sai: {@code _id} la SO (khong phai chuoi), {@code vote_average} la CHUOI,
 * {@code items} nam ngay o goc (khong o {@code data.items} nhu KKPhim), va {@code server_name}
 * co lan xuong dong / khoang trang thut le can gom lai.</p>
 */
class VsmovProviderTest {

    private VsmovProvider providerWith(MockRestServiceServer[] holder) {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://vsmov.com");
        holder[0] = MockRestServiceServer.bindTo(builder).build();
        // 5 null: constructor rut gon cua ProviderProperties tu dien mac dinh, gom vsmov.
        ProviderProperties props = new ProviderProperties(null, null, null, null, null);
        return new VsmovProvider(builder.build(), props);
    }

    @Test
    @DisplayName("type() va code() deu la vsmov")
    void identity() {
        VsmovProvider provider = providerWith(new MockRestServiceServer[1]);
        assertThat(provider.type()).isEqualTo(ProviderType.VSMOV);
        assertThat(provider.code()).isEqualTo("vsmov");
    }

    @Test
    @DisplayName("latest: items o goc, _id so -> chuoi, vote_average chuoi -> Double, anh giu tuyet doi")
    void latestMapsRootItems() {
        MockRestServiceServer[] server = new MockRestServiceServer[1];
        VsmovProvider provider = providerWith(server);

        String json = """
                {"status":true,"items":[
                  {"tmdb":{"type":"tv","id":"301489","season":null,"vote_average":"8.0","vote_count":121},
                   "imdb":{"id":"tt18352538"},
                   "modified":{"time":"2026-09-10T17:25:50+07:00"},
                   "_id":52526,"name":"Thâm Uyên Vô Gián","origin_name":"Abyss","slug":"tham-uyen-vo-gian",
                   "poster_url":"https://vsmov.com/storage/images/poster.jpg",
                   "thumb_url":"https://vsmov.com/storage/images/thumb.jpg","year":2026}],
                 "pathImage":"https://nguon.vsphim.com/storage/images/",
                 "pagination":{"totalItems":19306,"totalItemsPerPage":24,"currentPage":1,"totalPages":805}}
                """;
        server[0].expect(requestToUriTemplate("https://vsmov.com/api/danh-sach/phim-moi-cap-nhat?page={p}", 1))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        PageResponse<MovieSummary> page = provider.latest(MovieQuery.of(1, 24));

        assertThat(page.provider()).isEqualTo("vsmov");
        assertThat(page.meta().totalItems()).isEqualTo(19306);
        assertThat(page.meta().totalPages()).isEqualTo(805);
        assertThat(page.meta().limit()).isEqualTo(24);
        assertThat(page.items()).hasSize(1);

        MovieSummary item = page.items().get(0);
        assertThat(item.id()).isEqualTo("52526");
        assertThat(item.slug()).isEqualTo("tham-uyen-vo-gian");
        assertThat(item.name()).isEqualTo("Thâm Uyên Vô Gián");
        assertThat(item.originName()).isEqualTo("Abyss");
        assertThat(item.year()).isEqualTo(2026);
        assertThat(item.posterUrl()).isEqualTo("https://vsmov.com/storage/images/poster.jpg");
        assertThat(item.provider()).isEqualTo("vsmov");
        assertThat(item.tmdb()).isNotNull();
        assertThat(item.tmdb().id()).isEqualTo("301489");
        assertThat(item.tmdb().voteAverage()).isEqualTo(8.0);
        assertThat(item.imdb()).isNotNull();
        assertThat(item.imdb().id()).isEqualTo("tt18352538");
    }

    @Test
    @DisplayName("search: gan tham so keyword vao dung endpoint tim-kiem")
    void searchSendsKeyword() {
        MockRestServiceServer[] server = new MockRestServiceServer[1];
        VsmovProvider provider = providerWith(server);

        server[0].expect(requestTo(org.hamcrest.Matchers.startsWith("https://vsmov.com/api/tim-kiem")))
                .andExpect(method(HttpMethod.GET))
                .andExpect(queryParam("keyword", "moana"))
                .andExpect(queryParam("page", "1"))
                .andRespond(withSuccess(
                        "{\"status\":true,\"items\":[],\"pagination\":{\"totalItems\":0,"
                                + "\"totalItemsPerPage\":24,\"currentPage\":1,\"totalPages\":0}}",
                        MediaType.APPLICATION_JSON));

        PageResponse<MovieSummary> page = provider.search("moana", MovieQuery.of(1, 24));

        assertThat(page.items()).isEmpty();
        assertThat(page.provider()).isEqualTo("vsmov");
    }

    @Test
    @DisplayName("findBySlug: parse chi tiet, tap chi co link_embed, ten server gom lai mot dong")
    void detailMapsEmbedServers() {
        MockRestServiceServer[] server = new MockRestServiceServer[1];
        VsmovProvider provider = providerWith(server);

        String json = """
                {"status":true,"msg":"","movie":{
                  "tmdb":{"type":"movie","id":"1108427","season":null,"vote_average":"6.5","vote_count":328},
                  "imdb":{"id":"tt27419466"},
                  "modified":{"time":"2026-09-10T17:23:46+07:00"},
                  "_id":2784,"name":"Hành Trình Của Moana","origin_name":"Moana","slug":"hanh-trinh-cua-moana",
                  "content":"Nghe theo tiếng gọi của Đại Dương.","type":"single","status":"completed",
                  "poster_url":"https://vsmov.com/storage/images/poster.jpg",
                  "thumb_url":"https://vsmov.com/storage/images/thumb.jpg",
                  "trailer_url":"https://youtu.be/abc","time":"115 phút","episode_current":"Full",
                  "episode_total":"1","quality":"4K","lang":"Vietsub","year":2026,
                  "actor":["Dwayne Johnson","","Đang cập nhật"],"director":["Thomas Kail"],
                  "category":[{"id":23,"name":"Phiêu Lưu","slug":"phieu-luu"}],
                  "country":[{"id":7,"name":"Âu Mỹ","slug":"au-my"}]},
                 "episodes":[
                  {"server_name":"Vietsub\\r\\n                        #1",
                   "server_data":[{"name":"Full","slug":"tap-full","filename":"Full",
                     "link_embed":"https://v11.streamvsmov.com/video/bb91"}]},
                  {"server_name":"4K",
                   "server_data":[{"name":"Full","slug":"tap-full","filename":"Full",
                     "link_embed":"https://v13.streamvsmov.com/video/a3a4"}]}]}
                """;
        server[0].expect(requestTo("https://vsmov.com/api/phim/hanh-trinh-cua-moana"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        Optional<MovieDetail> maybe = provider.findBySlug("hanh-trinh-cua-moana");

        assertThat(maybe).isPresent();
        MovieDetail movie = maybe.get();
        assertThat(movie.id()).isEqualTo("2784");
        assertThat(movie.name()).isEqualTo("Hành Trình Của Moana");
        assertThat(movie.type()).isEqualTo("single");
        assertThat(movie.trailerUrl()).isEqualTo("https://youtu.be/abc");
        assertThat(movie.episodeTotal()).isEqualTo("1");
        assertThat(movie.quality()).isEqualTo("4K");
        assertThat(movie.provider()).isEqualTo("vsmov");

        // "Dang cap nhat" va chuoi rong bi loai, chi con dien vien that.
        assertThat(movie.actors()).containsExactly("Dwayne Johnson");
        assertThat(movie.directors()).containsExactly("Thomas Kail");

        assertThat(movie.categories()).extracting(Taxonomy::slug).containsExactly("phieu-luu");
        assertThat(movie.countries()).extracting(Taxonomy::slug).containsExactly("au-my");

        assertThat(movie.servers()).hasSize(2);
        // Ten server gom lan xuong dong + khoang trang thut le thanh mot khoang trang.
        assertThat(movie.servers().get(0).serverName()).isEqualTo("Vietsub #1");
        assertThat(movie.servers().get(0).episodes()).hasSize(1);
        assertThat(movie.servers().get(0).episodes().get(0).linkEmbed())
                .isEqualTo("https://v11.streamvsmov.com/video/bb91");
        assertThat(movie.servers().get(0).episodes().get(0).linkM3u8()).isNull();
    }

    @Test
    @DisplayName("findBySlug: khong tim thay (404) tra ve rong, khong nem loi")
    void detailNotFoundReturnsEmpty() {
        MockRestServiceServer[] server = new MockRestServiceServer[1];
        VsmovProvider provider = providerWith(server);

        server[0].expect(requestTo("https://vsmov.com/api/phim/khong-ton-tai"))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertThat(provider.findBySlug("khong-ton-tai")).isEmpty();
    }

    @Test
    @DisplayName("categories: doc data.items, dung slug lam id")
    void categoriesMapData() {
        MockRestServiceServer[] server = new MockRestServiceServer[1];
        VsmovProvider provider = providerWith(server);

        String json = """
                {"status":"success","message":"","data":{"items":[
                  {"_id":85,"name":"Action & Adventure","slug":"action-adventure"},
                  {"_id":17,"name":"Bí Ẩn","slug":"bi-an"}]}}
                """;
        server[0].expect(requestTo("https://vsmov.com/api/the-loai"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        List<Taxonomy> categories = provider.categories();

        assertThat(categories).hasSize(2);
        assertThat(categories.get(0).name()).isEqualTo("Action & Adventure");
        assertThat(categories.get(0).slug()).isEqualTo("action-adventure");
        // Danh muc khong co ma dinh danh chuoi nen dung slug lam id.
        assertThat(categories.get(0).id()).isEqualTo("action-adventure");
    }
}
