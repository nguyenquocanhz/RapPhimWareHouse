package com.rapphim.warehouse.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * Mot dien vien tren TheMovieDB kem cac phim ho tung dong.
 *
 * <p>Dung cho trang "phim cua dien vien": bam vao mot dien vien o trang chi tiet la
 * xem duoc filmography cua ho. Phim tra ve la ban ghi TMDB (metadata), moi phim dan
 * toi trang kham pha cua chinh no de tim ban xem duoc.</p>
 */
@Schema(name = "TmdbPerson", description = "Dien vien TheMovieDB kem danh sach phim")
public record TmdbPerson(

        @Schema(description = "Ma dien vien tren TMDB", example = "1136406")
        String id,

        @Schema(description = "Ten dien vien", example = "Tom Holland")
        String name,

        @Schema(description = "Anh chan dung, null neu TMDB khong co")
        String profileUrl,

        @Schema(description = "Linh vuc noi tieng, vi du Acting", example = "Acting")
        String knownForDepartment,

        @Schema(description = "Cac phim dien vien tung dong, sap theo do pho bien")
        List<TmdbDiscoverItem> films
) {
}
