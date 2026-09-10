package com.rapphim.warehouse.provider.anilist.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Cac ban ghi anh xa phan hoi GraphQL cua AniList.
 *
 * <p>Moi ban ghi bo qua truong khong biet ({@code ignoreUnknown}) vi AniList tra ve
 * nhieu truong hon ta can. Hai cho phai dat ten qua {@code @JsonProperty}: field
 * {@code Page}/{@code Media}/{@code GenreCollection} viet hoa trong JSON, va field
 * {@code native} trung tu khoa Java nen phai doi ten thanh {@code nativeTitle}.</p>
 */
public final class AniListModels {

    private AniListModels() {
    }

    // ---------------------------------------------------------------- envelope

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PageEnvelope(PageData data, List<GraphQLError> errors) {
        @JsonIgnoreProperties(ignoreUnknown = true)
        public record PageData(@JsonProperty("Page") Page page) {
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MediaEnvelope(MediaData data, List<GraphQLError> errors) {
        @JsonIgnoreProperties(ignoreUnknown = true)
        public record MediaData(@JsonProperty("Media") Media media) {
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GenreEnvelope(GenreData data, List<GraphQLError> errors) {
        @JsonIgnoreProperties(ignoreUnknown = true)
        public record GenreData(@JsonProperty("GenreCollection") List<String> genreCollection) {
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GraphQLError(String message) {
    }

    // ---------------------------------------------------------------- du lieu

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Page(PageInfo pageInfo, List<Media> media) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PageInfo(Integer total, Integer currentPage, Integer lastPage,
                           Integer perPage, Boolean hasNextPage) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Media(
            Integer id,
            Title title,
            String description,
            String format,
            String status,
            Integer episodes,
            Integer duration,
            Integer seasonYear,
            String season,
            Integer averageScore,
            Integer popularity,
            List<String> genres,
            CoverImage coverImage,
            String bannerImage,
            String siteUrl,
            FuzzyDate startDate,
            Studios studios,
            NextAiring nextAiringEpisode) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Title(String romaji, String english,
                        @JsonProperty("native") String nativeTitle) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CoverImage(String extraLarge, String large, String color) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record FuzzyDate(Integer year, Integer month, Integer day) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Studios(List<Node> nodes) {
        @JsonIgnoreProperties(ignoreUnknown = true)
        public record Node(String name) {
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NextAiring(Integer episode, Long airingAt, Long timeUntilAiring) {
    }
}
