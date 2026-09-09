package com.rapphim.warehouse.provider;

import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.dto.ListType;
import com.rapphim.warehouse.dto.MovieDetail;
import com.rapphim.warehouse.dto.MovieQuery;
import com.rapphim.warehouse.dto.MovieSummary;
import com.rapphim.warehouse.dto.ProviderType;
import com.rapphim.warehouse.dto.Taxonomy;

import java.util.List;
import java.util.Optional;

/**
 * Hop dong chung cho moi nguon phim. Tang service chi lam viec qua interface nay,
 * nho do them mot nguon moi khong lam thay doi controller.
 */
public interface MovieProvider {

    /** Nguon ma cai dat nay dai dien. */
    ProviderType type();

    /**
     * Ma dinh danh dung tren URL.
     *
     * <p>Cac nguon dung san lay thang ma cua {@link ProviderType}. Nguon do nguoi dung
     * tu them thi khong nam trong enum duoc - enum co dinh luc bien dich - nen chung
     * ghi de ham nay bang ma rieng.</p>
     */
    default String code() {
        return type().code();
    }

    /** Phim moi cap nhat, sap xep theo thoi diem cap nhat giam dan. */
    PageResponse<MovieSummary> latest(MovieQuery query);

    /** Danh sach phim theo nhom (phim bo, phim le, tv shows, hoat hinh...). */
    PageResponse<MovieSummary> listByType(ListType listType, MovieQuery query);

    /** Tim kiem phim theo tu khoa. */
    PageResponse<MovieSummary> search(String keyword, MovieQuery query);

    /** Danh sach phim theo the loai. */
    PageResponse<MovieSummary> listByCategory(String categorySlug, MovieQuery query);

    /** Danh sach phim theo quoc gia. */
    PageResponse<MovieSummary> listByCountry(String countrySlug, MovieQuery query);

    /** Danh sach phim theo nam phat hanh. */
    PageResponse<MovieSummary> listByYear(int year, MovieQuery query);

    /** Chi tiet mot phim kem danh sach server / tap. */
    Optional<MovieDetail> findBySlug(String slug);

    /** Toan bo the loai nguon dang co. */
    List<Taxonomy> categories();

    /** Toan bo quoc gia nguon dang co. */
    List<Taxonomy> countries();
}
