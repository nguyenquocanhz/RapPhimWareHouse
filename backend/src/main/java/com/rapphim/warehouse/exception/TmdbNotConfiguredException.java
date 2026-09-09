package com.rapphim.warehouse.exception;

/**
 * Nem ra khi goi endpoint TMDB ma he thong chua duoc cap khoa API.
 */
public class TmdbNotConfiguredException extends RuntimeException {

    public TmdbNotConfiguredException() {
        super("Chua cau hinh khoa TheMovieDB. Dat bien moi truong TMDB_ACCESS_TOKEN "
                + "(token v4) hoac TMDB_API_KEY (khoa v3) roi khoi dong lai backend.");
    }
}
