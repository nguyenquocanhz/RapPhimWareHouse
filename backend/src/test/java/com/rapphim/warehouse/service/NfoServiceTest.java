package com.rapphim.warehouse.service;

import com.rapphim.warehouse.dto.ImdbRef;
import com.rapphim.warehouse.dto.MovieDetail;
import com.rapphim.warehouse.dto.Taxonomy;
import com.rapphim.warehouse.dto.TmdbCast;
import com.rapphim.warehouse.dto.TmdbDetail;
import com.rapphim.warehouse.dto.TmdbRef;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class NfoServiceTest {

    private final NfoService service = new NfoService();

    private MovieDetail movie(String type, String content) {
        return new MovieDetail(
                "id-1", "doi-chung", "Đối Chứng", "Cause Of Death",
                content,
                "https://phimimg.com/poster.webp", "https://phimimg.com/thumb.webp",
                null, 2026, type, "ongoing", "FHD", "Lồng Tiếng", "45 phút/tập",
                "Tập 2", "25",
                List.of("Hera Chan", "Mark Ma"),
                List.of(),
                List.of(new Taxonomy("1", "Bí Ẩn", "bi-an")),
                List.of(new Taxonomy("2", "Hồng Kông", "hong-kong")),
                List.of(),
                new TmdbRef("331912", "tv", 1, 7.4, 1280),
                new ImdbRef("tt37015024", 8.1, 4521),
                "kkphim", "2026-09-08T20:42:25Z");
    }

    @Test
    @DisplayName("Phim bo sinh the goc tvshow, phim le sinh the goc movie")
    void rootElementFollowsMovieType() {
        assertThat(service.build(movie("series", null), Optional.empty()))
                .contains("<tvshow>")
                .doesNotContain("<movie>");

        assertThat(service.build(movie("single", null), Optional.empty()))
                .contains("<movie>")
                .doesNotContain("<tvshow>");
    }

    @Test
    @DisplayName("Van xuat duoc file day du khi khong co metadata TMDB")
    void worksWithoutTmdbMetadata() {
        String xml = service.build(movie("series", "<p>Nội dung phim.</p>"), Optional.empty());

        assertThat(xml)
                .contains("<title>Đối Chứng</title>")
                .contains("<originaltitle>Cause Of Death</originaltitle>")
                .contains("<year>2026</year>")
                .contains("<genre>Bí Ẩn</genre>")
                .contains("<country>Hồng Kông</country>")
                .contains("<episode>25</episode>")
                .contains("<name>Hera Chan</name>");
    }

    @Test
    @DisplayName("The uniqueid ghi ca ma TMDB lan IMDb de Kodi khop dung phim")
    void writesBothUniqueIds() {
        String xml = service.build(movie("series", null), Optional.empty());

        assertThat(xml)
                .contains("<uniqueid default=\"true\" type=\"tmdb\">331912</uniqueid>")
                .contains("<uniqueid default=\"false\" type=\"imdb\">tt37015024</uniqueid>");
    }

    @Test
    @DisplayName("Diem so tu ca hai he thong deu duoc ghi, TMDB la mac dinh")
    void writesRatingsFromBothSources() {
        String xml = service.build(movie("series", null), Optional.empty());

        assertThat(xml)
                .contains("<rating default=\"true\" max=\"10\" name=\"themoviedb\">")
                .contains("<value>7.4</value>")
                .contains("<rating default=\"false\" max=\"10\" name=\"imdb\">")
                .contains("<votes>4521</votes>");
    }

    @Test
    @DisplayName("The HTML trong noi dung nguon bi loai bo khoi the plot")
    void stripsHtmlFromPlot() {
        String xml = service.build(
                movie("single", "<p>Dòng một.</p><p>Dòng&nbsp;hai.</p>"), Optional.empty());

        assertThat(xml)
                .contains("<plot>Dòng một. Dòng hai.</plot>")
                .doesNotContain("&lt;p&gt;");
    }

    @Test
    @DisplayName("Ky tu dac biet trong ten phim duoc escape dung chuan XML")
    void escapesSpecialCharacters() {
        MovieDetail tricky = new MovieDetail(
                "id-2", "phim-la", "Phim <b>&</b> \"Dấu\"", null, null,
                null, null, null, 2026, "single", null, null, null, null, null, null,
                List.of(), List.of(), List.of(), List.of(), List.of(),
                null, null, "kkphim", null);

        String xml = service.build(tricky, Optional.empty());

        assertThat(xml)
                .contains("&lt;b&gt;&amp;&lt;/b&gt;")
                .doesNotContain("<b>&</b>");
    }

    @Test
    @DisplayName("Co TMDB thi uu tien metadata cua TMDB")
    void prefersTmdbMetadataWhenAvailable() {
        TmdbDetail tmdb = new TmdbDetail(
                "331912", "tv", "Đối Chứng", "Cause Of Death",
                "Tóm tắt từ TMDB.", "Sự thật không im lặng", "https://example.test",
                "Returning Series", "2026-09-07", 45, 1, 25,
                7.9, 2000, 38.5,
                "https://image.tmdb.org/t/p/w500/poster.jpg",
                "https://image.tmdb.org/t/p/w1280/backdrop.jpg",
                List.of("Chính Kịch"), List.of("Hong Kong"), List.of("TVB"),
                List.of("Lâm Sâm"),
                List.of(new TmdbCast("Hera Chan", "Trình Chỉ Hân", 0, null)),
                "tt37015024");

        String xml = service.build(movie("series", "<p>Nội dung của nguồn.</p>"), Optional.of(tmdb));

        assertThat(xml)
                .contains("<plot>Tóm tắt từ TMDB.</plot>")
                .contains("<tagline>Sự thật không im lặng</tagline>")
                .contains("<runtime>45</runtime>")
                .contains("<genre>Chính Kịch</genre>")
                .contains("<studio>TVB</studio>")
                .contains("<director>Lâm Sâm</director>")
                .contains("<role>Trình Chỉ Hân</role>")
                .doesNotContain("Nội dung của nguồn");
    }

    @Test
    @DisplayName("Ten file lay theo slug cua phim")
    void fileNameUsesSlug() {
        assertThat(service.fileNameFor(movie("series", null))).isEqualTo("doi-chung.nfo");
    }
}
