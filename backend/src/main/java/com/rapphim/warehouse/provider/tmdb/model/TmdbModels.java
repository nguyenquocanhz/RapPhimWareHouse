package com.rapphim.warehouse.provider.tmdb.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Cac ban ghi anh xa 1-1 voi JSON tho cua TheMovieDB.
 * Chi dung noi bo trong tang provider, khong lo ra ngoai REST API.
 */
public final class TmdbModels {

    private TmdbModels() {
    }

    /**
     * Chi tiet mot ban ghi. TMDB dung hai schema khac nhau cho phim le
     * ({@code /movie/{id}}) va phim bo ({@code /tv/{id}}); ban ghi nay gom ca hai,
     * truong nao khong thuoc loai dang goi se la null.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Details(
            Integer id,
            @JsonProperty("imdb_id") String imdbId,

            // Phim le dung title, phim bo dung name.
            String title,
            String name,
            @JsonProperty("original_title") String originalTitle,
            @JsonProperty("original_name") String originalName,

            String overview,
            String tagline,
            String homepage,
            String status,

            @JsonProperty("release_date") String releaseDate,
            @JsonProperty("first_air_date") String firstAirDate,
            @JsonProperty("last_air_date") String lastAirDate,

            Integer runtime,
            @JsonProperty("episode_run_time") List<Integer> episodeRunTime,
            @JsonProperty("number_of_seasons") Integer numberOfSeasons,
            @JsonProperty("number_of_episodes") Integer numberOfEpisodes,

            @JsonProperty("vote_average") Double voteAverage,
            @JsonProperty("vote_count") Integer voteCount,
            Double popularity,

            @JsonProperty("poster_path") String posterPath,
            @JsonProperty("backdrop_path") String backdropPath,

            List<Named> genres,
            @JsonProperty("production_countries") List<Country> productionCountries,
            @JsonProperty("production_companies") List<Named> productionCompanies,
            @JsonProperty("created_by") List<Named> createdBy,
            List<Named> networks,

            Credits credits,
            @JsonProperty("external_ids") ExternalIds externalIds) {

        /** Ten hien thi, khong phu thuoc loai ban ghi. */
        public String displayTitle() {
            return title != null ? title : name;
        }

        /** Ten goc, khong phu thuoc loai ban ghi. */
        public String displayOriginalTitle() {
            return originalTitle != null ? originalTitle : originalName;
        }

        /** Ngay phat hanh, khong phu thuoc loai ban ghi. */
        public String displayReleaseDate() {
            return releaseDate != null ? releaseDate : firstAirDate;
        }

        /** Thoi luong tinh bang phut. Phim bo tra ve mang thoi luong moi tap. */
        public Integer displayRuntime() {
            if (runtime != null && runtime > 0) {
                return runtime;
            }
            if (episodeRunTime != null && !episodeRunTime.isEmpty()) {
                return episodeRunTime.get(0);
            }
            return null;
        }

        /** IMDb id nam o hai cho tuy endpoint. */
        public String resolvedImdbId() {
            if (imdbId != null && !imdbId.isBlank()) {
                return imdbId;
            }
            return externalIds == null ? null : externalIds.imdbId();
        }
    }

    /** Phan tu chi co id va ten: the loai, hang phim, dai truyen hinh, nguoi tao. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Named(Integer id, String name) {
    }

    /** Quoc gia san xuat. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Country(@JsonProperty("iso_3166_1") String code, String name) {
    }

    /** Khoi dinh danh o cac he thong khac, lay qua append_to_response. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ExternalIds(@JsonProperty("imdb_id") String imdbId) {
    }

    /** Danh sach dien vien va doan lam phim, lay qua append_to_response. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Credits(List<Cast> cast, List<Crew> crew) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Cast(
            Integer id,
            String name,
            String character,
            Integer order,
            @JsonProperty("profile_path") String profilePath) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Crew(Integer id, String name, String job, String department) {
    }

    /** Response cua {@code /discover/movie} va cac endpoint danh sach khac. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Page(
            Integer page,
            List<Result> results,
            @JsonProperty("total_pages") Integer totalPages,
            @JsonProperty("total_results") Long totalResults) {
    }

    /** Mot phim trong ket qua discover. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Result(
            Integer id,
            String title,
            String name,
            @JsonProperty("original_title") String originalTitle,
            @JsonProperty("original_name") String originalName,
            @JsonProperty("original_language") String originalLanguage,
            String overview,
            @JsonProperty("release_date") String releaseDate,
            @JsonProperty("first_air_date") String firstAirDate,
            @JsonProperty("poster_path") String posterPath,
            @JsonProperty("backdrop_path") String backdropPath,
            @JsonProperty("genre_ids") List<Integer> genreIds,
            @JsonProperty("vote_average") Double voteAverage,
            @JsonProperty("vote_count") Integer voteCount,
            Double popularity,
            Boolean adult) {

        public String displayTitle() {
            return title != null ? title : name;
        }

        public String displayOriginalTitle() {
            return originalTitle != null ? originalTitle : originalName;
        }

        public String displayReleaseDate() {
            return releaseDate != null ? releaseDate : firstAirDate;
        }
    }

    /** Response cua {@code /genre/movie/list} va {@code /genre/tv/list}. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GenreList(List<Named> genres) {
    }
}
