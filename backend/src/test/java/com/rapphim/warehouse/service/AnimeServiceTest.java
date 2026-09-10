package com.rapphim.warehouse.service;

import com.rapphim.warehouse.common.PageMeta;
import com.rapphim.warehouse.common.PageResponse;
import com.rapphim.warehouse.dto.AnimeDetail;
import com.rapphim.warehouse.dto.AnimeSummary;
import com.rapphim.warehouse.exception.UpstreamException;
import com.rapphim.warehouse.provider.anilist.AniListClient;
import com.rapphim.warehouse.provider.jikan.JikanClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * Kiem tra LOGIC DU PHONG cua facade - phan quan trong nhat cua thay doi nay.
 * Cache (@Cacheable) la no-op khi khong co Spring context nen goi thang.
 */
class AnimeServiceTest {

    private final AniListClient anilist = mock(AniListClient.class);
    private final JikanClient jikan = mock(JikanClient.class);
    private final AnimeService service = new AnimeService(anilist, jikan);

    private static PageResponse<AnimeSummary> page(String source) {
        AnimeSummary a = new AnimeSummary("1", "T", "T", "T", "TV", 12, 2020, 80,
                List.of(), null, null, null, source);
        return PageResponse.of(List.of(a), PageMeta.of(1, 24, 1), source);
    }

    @Test
    @DisplayName("trending: AniList song thi dung AniList, khong goi Jikan")
    void usesAniListWhenUp() {
        given(anilist.trending(1, 24)).willReturn(page("anilist"));

        assertThat(service.trending(1, 24).provider()).isEqualTo("anilist");
        verify(jikan, never()).trending(1, 24);
    }

    @Test
    @DisplayName("trending: AniList loi thi chuyen sang Jikan du phong")
    void fallsBackToJikan() {
        given(anilist.trending(1, 24)).willThrow(new UpstreamException("anilist", "tat"));
        given(jikan.trending(1, 24)).willReturn(page("jikan"));

        assertThat(service.trending(1, 24).provider()).isEqualTo("jikan");
        verify(jikan).trending(1, 24);
    }

    @Test
    @DisplayName("trending: ca hai loi thi de loi noi len")
    void bothDownPropagates() {
        given(anilist.trending(1, 24)).willThrow(new UpstreamException("anilist", "tat"));
        given(jikan.trending(1, 24)).willThrow(new UpstreamException("jikan", "504"));

        assertThatThrownBy(() -> service.trending(1, 24)).isInstanceOf(UpstreamException.class);
    }

    @Test
    @DisplayName("chi tiet: source anilist thi hoi AniList, KHONG du phong sang Jikan")
    void detailRoutesToAniListNoFallback() {
        AnimeDetail d = detail("anilist");
        given(anilist.details(21)).willReturn(Optional.of(d));

        assertThat(service.details(21, "anilist")).contains(d);
        verify(jikan, never()).details(21);
    }

    @Test
    @DisplayName("chi tiet: source jikan thi hoi Jikan, khong dung ma AniList")
    void detailRoutesToJikan() {
        AnimeDetail d = detail("jikan");
        given(jikan.details(21)).willReturn(Optional.of(d));

        assertThat(service.details(21, "jikan")).contains(d);
        verify(anilist, never()).details(21);
    }

    @Test
    @DisplayName("chi tiet: AniList loi thi KHONG lang le hoi Jikan cung id (khac khong gian ma)")
    void detailDoesNotFallBackAcrossIdSpaces() {
        given(anilist.details(21)).willThrow(new UpstreamException("anilist", "tat"));

        assertThatThrownBy(() -> service.details(21, "anilist")).isInstanceOf(UpstreamException.class);
        verify(jikan, never()).details(21);
    }

    private static AnimeDetail detail(String source) {
        return new AnimeDetail("21", "T", "T", "T", "T", "d", "TV", "RELEASING",
                12, 24, 2020, "FALL", 80, 1000, List.of(), List.of(),
                null, null, "2020-01-01", null, null, source);
    }
}
