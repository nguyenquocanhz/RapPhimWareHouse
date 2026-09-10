package com.rapphim.warehouse.provider.vsmov.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Cac ban ghi anh xa phan hoi cua VSMOV.
 *
 * <p>VSMOV cung ho voi KKPhim (ten truong trong moi phim giong het), nhung KHAC vo boc:
 * KKPhim goi {@code /v1/api/...} tra {@code data.items}, con VSMOV goi {@code /api/...}
 * tra {@code items} ngay o goc. Phan trang cung dat ten truong khac. Vi vay phai co bo
 * model rieng thay vi dung lai cua KKPhim.</p>
 *
 * <p>Chi tiet phim chi co {@code link_embed}, khong co {@code .m3u8} - giong NguonC.</p>
 */
public final class VsmovModels {

    private VsmovModels() {
    }

    // ---------------------------------------------------------------- danh sach

    /** Vo boc danh sach. {@code status} (kieu boolean) va {@code pathImage} bo qua vi khong dung. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ListEnvelope(List<Item> items, Pagination pagination) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Pagination(Integer totalItems, Integer totalItemsPerPage,
                             Integer currentPage, Integer totalPages) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Item(
            @JsonProperty("_id") String id,
            String name,
            String slug,
            @JsonProperty("origin_name") String originName,
            // VSMOV tra {} (object rong) cho anh thieu thay vi chuoi/null - de Object roi
            // loc trong provider, neu de String se vo khi gap {}.
            @JsonProperty("poster_url") Object posterUrl,
            @JsonProperty("thumb_url") Object thumbUrl,
            Integer year,
            TmdbRaw tmdb,
            ImdbRaw imdb,
            Modified modified) {
    }

    // ---------------------------------------------------------------- chi tiet

    /** Vo boc chi tiet. {@code status}/{@code msg} bo qua vi khong dung trong logic. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DetailEnvelope(Movie movie, List<ServerRaw> episodes) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Movie(
            @JsonProperty("_id") String id,
            String name,
            String slug,
            @JsonProperty("origin_name") String originName,
            String content,
            @JsonProperty("poster_url") Object posterUrl,
            @JsonProperty("thumb_url") Object thumbUrl,
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
            Modified modified) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ServerRaw(
            @JsonProperty("server_name") String serverName,
            @JsonProperty("server_data") List<EpisodeRaw> serverData) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EpisodeRaw(
            String name,
            String slug,
            String filename,
            @JsonProperty("link_embed") String linkEmbed,
            @JsonProperty("link_m3u8") String linkM3u8) {
    }

    // ---------------------------------------------------------------- dung chung

    /** The loai / quoc gia. Trong list dat ten {@code id}, trong endpoint danh muc lai
     * dat {@code _id} - ta khong dung id nen bo qua, chi lay ten va slug. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TaxonomyItem(String name, String slug) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TmdbRaw(
            String id,
            String type,
            Integer season,
            @JsonProperty("vote_average") Double voteAverage,
            @JsonProperty("vote_count") Integer voteCount) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ImdbRaw(String id) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Modified(String time) {
    }

    /** Vo boc endpoint danh muc {@code /api/the-loai}, {@code /api/quoc-gia}. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TaxonomyEnvelope(TaxonomyData data) {

        @JsonIgnoreProperties(ignoreUnknown = true)
        public record TaxonomyData(List<TaxonomyItem> items) {
        }
    }
}
