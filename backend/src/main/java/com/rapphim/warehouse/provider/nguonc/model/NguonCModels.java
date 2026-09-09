package com.rapphim.warehouse.provider.nguonc.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

/**
 * Cac ban ghi anh xa 1-1 voi JSON tho cua NguonC (phim.nguonc.com).
 * Chi dung noi bo trong tang provider, khong lo ra ngoai REST API.
 */
public final class NguonCModels {

    private NguonCModels() {
    }

    /** Response cua moi endpoint danh sach {@code /api/films/...}. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ListEnvelope(
            String status,
            Paginate paginate,
            List<Item> items) {
    }

    /** Khoi phan trang cua NguonC. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Paginate(
            @JsonProperty("current_page") int currentPage,
            @JsonProperty("total_page") int totalPage,
            @JsonProperty("total_items") long totalItems,
            @JsonProperty("items_per_page") int itemsPerPage) {
    }

    /** Mot phim trong danh sach. NguonC khong tra ve the loai o muc danh sach. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Item(
            String name,
            String slug,
            @JsonProperty("original_name") String originalName,
            @JsonProperty("thumb_url") String thumbUrl,
            @JsonProperty("poster_url") String posterUrl,
            String created,
            String modified,
            String description,
            @JsonProperty("total_episodes") Integer totalEpisodes,
            @JsonProperty("current_episode") String currentEpisode,
            String time,
            String quality,
            String language,
            String director,
            String casts,
            String year) {
    }

    /** Response cua {@code /api/film/...}. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DetailEnvelope(String status, Movie movie) {
    }

    /** Khoi thong tin phim trong response chi tiet. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Movie(
            String id,
            String name,
            String slug,
            @JsonProperty("original_name") String originalName,
            @JsonProperty("thumb_url") String thumbUrl,
            @JsonProperty("poster_url") String posterUrl,
            String created,
            String modified,
            String description,
            @JsonProperty("total_episodes") Integer totalEpisodes,
            @JsonProperty("current_episode") String currentEpisode,
            String time,
            String quality,
            String language,
            String director,
            String casts,
            Map<String, CategoryGroup> category,
            List<ServerRaw> episodes) {
    }

    /**
     * Mot nhom phan loai. NguonC gom moi phan loai vao mot map co khoa la so thu tu,
     * moi phan tu gom ten nhom ({@code group}) va danh sach gia tri ({@code list}).
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CategoryGroup(GroupInfo group, List<GroupInfo> list) {
    }

    /** Ten mot nhom hoac mot gia tri trong nhom. NguonC khong tra ve slug. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GroupInfo(String id, String name) {
    }

    /** Mot server phat kem danh sach tap. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ServerRaw(
            @JsonProperty("server_name") String serverName,
            List<EpisodeRaw> items) {
    }

    /** Mot tap phim tho. NguonC chi cung cap link embed. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EpisodeRaw(
            String name,
            String slug,
            String embed,
            String m3u8) {
    }
}
