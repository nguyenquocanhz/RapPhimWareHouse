package com.rapphim.warehouse.common;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

/**
 * Envelope chuan cho moi response cua REST API.
 *
 * @param <T> kieu du lieu nghiep vu tra ve trong truong {@code data}
 */
@Schema(description = "Envelope chuan cho moi response cua API")
public record ApiResponse<T>(

        @Schema(description = "True neu request duoc xu ly thanh cong", example = "true")
        boolean success,

        @Schema(description = "Thong diep mo ta ket qua", example = "OK")
        String message,

        @Schema(description = "Du lieu nghiep vu")
        T data,

        @Schema(description = "Thoi diem server tra ve response (UTC)", example = "2026-09-08T16:20:00Z")
        Instant timestamp
) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, "OK", data, Instant.now());
    }

    public static <T> ApiResponse<T> ok(T data, String message) {
        return new ApiResponse<>(true, message, data, Instant.now());
    }

    public static <T> ApiResponse<T> fail(String message) {
        return new ApiResponse<>(false, message, null, Instant.now());
    }
}
