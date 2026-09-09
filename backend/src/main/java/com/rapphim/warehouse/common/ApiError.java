package com.rapphim.warehouse.common;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;

/**
 * Body tra ve khi request that bai (HTTP 4xx / 5xx).
 */
@Schema(name = "ApiError", description = "Chi tiet loi tra ve cho client")
public record ApiError(

        @Schema(description = "Luon la false", example = "false")
        boolean success,

        @Schema(description = "Ma HTTP status", example = "404")
        int status,

        @Schema(description = "Ma loi noi bo, dung de client xu ly theo tung truong hop", example = "MOVIE_NOT_FOUND")
        String code,

        @Schema(description = "Mo ta loi cho nguoi dung", example = "Khong tim thay phim voi slug 'abc'")
        String message,

        @Schema(description = "Duong dan da goi", example = "/api/v1/movies/abc")
        String path,

        @Schema(description = "Danh sach loi chi tiet (vi du loi validate tung field)")
        List<String> details,

        @Schema(description = "Thoi diem xay ra loi (UTC)")
        Instant timestamp
) {

    public static ApiError of(int status, String code, String message, String path) {
        return new ApiError(false, status, code, message, path, List.of(), Instant.now());
    }

    public static ApiError of(int status, String code, String message, String path, List<String> details) {
        return new ApiError(false, status, code, message, path, details == null ? List.of() : details, Instant.now());
    }
}
