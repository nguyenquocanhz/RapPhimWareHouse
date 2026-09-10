package com.rapphim.warehouse.provider.jikan.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Cac ban ghi anh xa phan hoi REST cua Jikan v4.
 *
 * <p>Truong Jikan viet snake_case nen dat ten qua {@code @JsonProperty}. Bo qua truong
 * khong biet vi Jikan tra ve rat nhieu truong ta khong dung.</p>
 */
public final class JikanModels {

    private JikanModels() {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AnimePage(Pagination pagination, List<Anime> data) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AnimeWrapper(Anime data) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GenrePage(List<Genre> data) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Pagination(
            @JsonProperty("last_visible_page") Integer lastVisiblePage,
            @JsonProperty("has_next_page") Boolean hasNextPage,
            @JsonProperty("current_page") Integer currentPage,
            Items items) {

        @JsonIgnoreProperties(ignoreUnknown = true)
        public record Items(Integer count, Integer total,
                            @JsonProperty("per_page") Integer perPage) {
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Genre(@JsonProperty("mal_id") Integer malId, String name) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Anime(
            @JsonProperty("mal_id") Integer malId,
            String title,
            @JsonProperty("title_english") String titleEnglish,
            @JsonProperty("title_japanese") String titleJapanese,
            String type,
            Integer episodes,
            Integer year,
            Double score,
            Integer members,
            List<Genre> genres,
            Images images,
            String url,
            String synopsis,
            String status,
            String duration,
            String season,
            List<Studio> studios,
            Aired aired) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Images(Jpg jpg) {
        @JsonIgnoreProperties(ignoreUnknown = true)
        public record Jpg(@JsonProperty("image_url") String imageUrl,
                          @JsonProperty("large_image_url") String largeImageUrl) {
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Studio(String name) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Aired(Prop prop) {
        @JsonIgnoreProperties(ignoreUnknown = true)
        public record Prop(DateParts from) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        public record DateParts(Integer day, Integer month, Integer year) {
        }
    }
}
