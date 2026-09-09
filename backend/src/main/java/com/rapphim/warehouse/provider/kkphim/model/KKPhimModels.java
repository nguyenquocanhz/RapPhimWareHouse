package com.rapphim.warehouse.provider.kkphim.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Cac ban ghi anh xa 1-1 voi JSON tho cua KKPhim (phimapi.com).
 * Chi dung noi bo trong tang provider, khong lo ra ngoai REST API.
 */
public final class KKPhimModels {

    private KKPhimModels() {
    }

    /**
     * KKPhim tra ve truong {@code status} khong dong nhat: nhom {@code /danh-sach} tra ve
     * boolean {@code true}, con {@code /v1/api/tim-kiem} tra ve chuoi {@code "success"}.
     * Ham nay chap nhan ca hai dang.
     */
    public static boolean isOk(Object status) {
        if (status instanceof Boolean bool) {
            return bool;
        }
        if (status instanceof String text) {
            return "true".equalsIgnoreCase(text) || "success".equalsIgnoreCase(text);
        }
        return false;
    }

    /** Response cua {@code /danh-sach/phim-moi-cap-nhat}. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LatestEnvelope(
            Object status,
            String msg,
            List<Item> items,
            Pagination pagination) {
    }

    /** Response cua nhom endpoint {@code /v1/api/...}. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record V1Envelope(Object status, String msg, V1Data data) {

        @JsonIgnoreProperties(ignoreUnknown = true)
        public record V1Data(
                String titlePage,
                List<Item> items,
                Params params,
                @JsonProperty("APP_DOMAIN_CDN_IMAGE") String cdnImage) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        public record Params(Pagination pagination) {
        }
    }

    /** Khoi phan trang dung chung cho moi endpoint danh sach. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Pagination(
            long totalItems,
            int totalItemsPerPage,
            int currentPage,
            int totalPages) {
    }

    /** Mot phim trong danh sach. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Item(
            @JsonProperty("_id") String id,
            String name,
            String slug,
            @JsonProperty("origin_name") String originName,
            @JsonProperty("poster_url") String posterUrl,
            @JsonProperty("thumb_url") String thumbUrl,
            Integer year,
            String type,
            String time,
            @JsonProperty("episode_current") String episodeCurrent,
            String quality,
            String lang,
            List<TaxonomyItem> category,
            List<TaxonomyItem> country,
            TmdbRaw tmdb,
            ImdbRaw imdb,
            TimeWrapper modified) {
    }

    /** Response cua {@code /phim/{slug}}. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DetailEnvelope(
            Object status,
            String msg,
            Movie movie,
            List<ServerRaw> episodes) {
    }

    /** Khoi thong tin phim trong response chi tiet. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Movie(
            @JsonProperty("_id") String id,
            String name,
            String slug,
            @JsonProperty("origin_name") String originName,
            String content,
            @JsonProperty("poster_url") String posterUrl,
            @JsonProperty("thumb_url") String thumbUrl,
            @JsonProperty("trailer_url") String trailerUrl,
            Integer year,
            String type,
            String status,
            String quality,
            String lang,
            String time,
            @JsonProperty("episode_current") String episodeCurrent,
            @JsonProperty("episode_total") Object episodeTotal,
            List<String> actor,
            List<String> director,
            List<TaxonomyItem> category,
            List<TaxonomyItem> country,
            TmdbRaw tmdb,
            ImdbRaw imdb,
            TimeWrapper modified) {
    }

    /** Mot server phat kem danh sach tap. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ServerRaw(
            @JsonProperty("server_name") String serverName,
            @JsonProperty("server_data") List<EpisodeRaw> serverData) {
    }

    /** Mot tap phim tho. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EpisodeRaw(
            String name,
            String slug,
            String filename,
            @JsonProperty("link_embed") String linkEmbed,
            @JsonProperty("link_m3u8") String linkM3u8) {
    }

    /** Response cua {@code /the-loai} va {@code /quoc-gia}. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TaxonomyEnvelope(String status, String message, TaxonomyData data) {

        @JsonIgnoreProperties(ignoreUnknown = true)
        public record TaxonomyData(List<TaxonomyItem> items) {
        }
    }

    /** Mot the loai hoac quoc gia. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TaxonomyItem(
            @JsonProperty("_id") String underscoreId,
            String id,
            String name,
            String slug) {

        /** Nguon dung ca {@code _id} lan {@code id} tuy endpoint. */
        public String resolvedId() {
            return underscoreId != null ? underscoreId : id;
        }
    }

    /** Khoi {@code {"time": "..."} } cua truong created / modified. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TimeWrapper(String time) {
    }

    /** Khoi tham chieu TheMovieDB di kem moi phim. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TmdbRaw(
            String id,
            String type,
            Integer season,
            @JsonProperty("vote_average") Double voteAverage,
            @JsonProperty("vote_count") Integer voteCount) {
    }

    /** Khoi tham chieu IMDb di kem moi phim. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ImdbRaw(
            String id,
            @JsonProperty("vote_average") Double voteAverage,
            @JsonProperty("vote_count") Integer voteCount) {
    }
}
