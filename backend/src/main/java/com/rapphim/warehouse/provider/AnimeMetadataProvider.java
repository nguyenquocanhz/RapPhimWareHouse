package com.rapphim.warehouse.provider;

import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.dto.AnimeDetail;
import com.rapphim.warehouse.dto.AnimeSummary;

import java.util.List;
import java.util.Optional;

/**
 * Hop dong chung cho mot nguon METADATA anime (AniList, Jikan/MyAnimeList...).
 *
 * <p>Cho phep {@code AnimeService} coi cac nguon nhu nhau de lam du phong: het nguon
 * chinh thi sang nguon sau. Them nguon thu ba chi can implement interface nay.</p>
 *
 * <h2>Luu y ve ma dinh danh</h2>
 * <p>Moi nguon co KHONG GIAN MA RIENG - id 21 tren AniList va tren MyAnimeList la hai
 * anime khac nhau. Vi vay {@link #details(int)} chi duoc goi voi ma DUNG cua nguon do;
 * facade khong duoc lay id cua nguon nay hoi nguon kia. Moi {@link AnimeSummary} deu
 * mang {@link AnimeSummary#source()} de biet id thuoc nguon nao.</p>
 */
public interface AnimeMetadataProvider {

    /** Ma nguon, vi du {@code "anilist"} hoac {@code "jikan"}. */
    String source();

    /** Anime dang thinh hanh / pho bien nhat. */
    PageResponse<AnimeSummary> trending(int page, int perPage);

    /** Tim anime theo tu khoa. */
    PageResponse<AnimeSummary> search(String keyword, int page, int perPage);

    /** Metadata day du theo ma CUA CHINH NGUON NAY; rong neu khong co. */
    Optional<AnimeDetail> details(int id);

    /** Danh sach ten the loai anime. */
    List<String> genres();
}
