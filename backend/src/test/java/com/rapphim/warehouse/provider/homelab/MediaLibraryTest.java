package com.rapphim.warehouse.provider.homelab;

import com.rapphim.warehouse.provider.homelab.MediaLibrary.LibraryEpisode;
import com.rapphim.warehouse.provider.homelab.MediaLibrary.LibraryTitle;
import com.rapphim.warehouse.provider.homelab.model.ZCloudModels.ObjectItem;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Doc cay file thanh phim - phan duy nhat phu thuoc vao cach dat ten, nen cung la
 * phan de sai nhat khi kho thay doi quy uoc.
 */
class MediaLibraryTest {

    private static ObjectItem file(String key) {
        return new ObjectItem(key, key.substring(key.lastIndexOf('/') + 1), 1024, "2026-09-01T10:00:00Z", "etag");
    }

    @Test
    @DisplayName("Gom file theo thu muc thanh tung bo phim")
    void groupsFilesIntoTitles() {
        List<LibraryTitle> titles = MediaLibrary.build(List.of(
                file("phim/Thanh Khu/Thanh Khu - Tap 01.mp4"),
                file("phim/Thanh Khu/Thanh Khu - Tap 02.mp4"),
                file("phim/Vo Dich/Vo Dich.mkv")
        ), "phim/");

        assertThat(titles).hasSize(2);
        assertThat(titles).extracting(LibraryTitle::slug).containsExactlyInAnyOrder("thanh-khu", "vo-dich");

        LibraryTitle thanhKhu = titles.stream().filter(t -> t.slug().equals("thanh-khu")).findFirst().orElseThrow();
        assertThat(thanhKhu.name()).isEqualTo("Thanh Khu");
        assertThat(thanhKhu.episodes()).hasSize(2);
    }

    @Test
    @DisplayName("Tap duoc sap theo so, khong theo thu tu file tra ve")
    void sortsEpisodesByNumber() {
        List<LibraryTitle> titles = MediaLibrary.build(List.of(
                file("Thanh Khu/Tap 10.mp4"),
                file("Thanh Khu/Tap 02.mp4"),
                file("Thanh Khu/Tap 01.mp4")
        ), "");

        assertThat(titles.get(0).episodes())
                .extracting(LibraryEpisode::number)
                .containsExactly(1, 2, 10);
    }

    @Test
    @DisplayName("File phu de cung ten goc duoc gan vao dung tap")
    void attachesSubtitlesByBaseName() {
        List<LibraryTitle> titles = MediaLibrary.build(List.of(
                file("Thanh Khu/Thanh Khu - Tap 01.mp4"),
                file("Thanh Khu/Thanh Khu - Tap 01.vi.srt"),
                file("Thanh Khu/Thanh Khu - Tap 02.mp4")
        ), "");

        List<LibraryEpisode> episodes = titles.get(0).episodes();
        assertThat(episodes.get(0).subtitles()).hasSize(1);
        assertThat(episodes.get(0).subtitles().get(0).label()).isEqualTo("Tiếng Việt");
        assertThat(episodes.get(0).subtitles().get(0).lang()).isEqualTo("vi");

        // Tap 2 chua co phu de - khong duoc "muon" nham cua tap 1.
        assertThat(episodes.get(1).subtitles()).isEmpty();
    }

    @Test
    @DisplayName("Ten phu de ngan hon van khop duoc nho so tap")
    void fallsBackToEpisodeNumber() {
        List<LibraryTitle> titles = MediaLibrary.build(List.of(
                file("Thanh Khu/Thanh Khu 2023 1080p - Tap 03.mkv"),
                file("Thanh Khu/03.ass")
        ), "");

        assertThat(titles.get(0).episodes().get(0).subtitles()).hasSize(1);
    }

    @Test
    @DisplayName("Thu muc khong co file video thi khong thanh phim")
    void ignoresFoldersWithoutVideo() {
        List<LibraryTitle> titles = MediaLibrary.build(List.of(
                file("Tai lieu/ghi chu.txt"),
                file("Tai lieu/bia.jpg")
        ), "");

        assertThat(titles).isEmpty();
    }

    @ParameterizedTest
    @DisplayName("Doc so tap tu cac cach dat ten thuong gap")
    @CsvSource({
            "'Thanh Khu - Tap 01.mp4', 1",
            "'Thanh Khu Tập 24.mkv', 24",
            "'S01E07.mp4', 7",
            "'Thanh.Khu.E12.1080p.mkv', 12",
            "'Thanh Khu [05].mp4', 5",
            "'Thanh Khu - 108.mp4', 108",
            "'Thanh Khu.mp4', 0"
    })
    void readsEpisodeNumbers(String filename, int expected) {
        assertThat(MediaLibrary.episodeNumber(filename)).isEqualTo(expected);
    }

    @ParameterizedTest
    @DisplayName("Slug bo dau tieng Viet va ky tu la")
    @CsvSource({
            "'Thánh Khư', thanh-khu",
            "'Đấu La Đại Lục', dau-la-dai-luc",
            "'The Sacred Ruins (2023)', the-sacred-ruins-2023"
    })
    void slugifiesVietnamese(String name, String expected) {
        assertThat(MediaLibrary.slugify(name)).isEqualTo(expected);
    }

    @Test
    @DisplayName("File nam thang duoi prefix thanh phim le; thu muc con nhieu tap thanh phim bo")
    void flatFilesBecomeSingleTitles() {
        List<LibraryTitle> titles = MediaLibrary.build(List.of(
                file("Movies/Phim A.mp4"),
                file("Movies/Phim B.mkv"),
                file("Movies/Bo Phim/Tap 01.mp4"),
                file("Movies/Bo Phim/Tap 02.mp4")
        ), "Movies/");

        assertThat(titles).extracting(LibraryTitle::slug)
                .containsExactlyInAnyOrder("phim-a", "phim-b", "bo-phim");

        LibraryTitle phimA = titles.stream().filter(t -> t.slug().equals("phim-a")).findFirst().orElseThrow();
        assertThat(phimA.name()).isEqualTo("Phim A");
        assertThat(phimA.episodes()).hasSize(1);

        LibraryTitle boPhim = titles.stream().filter(t -> t.slug().equals("bo-phim")).findFirst().orElseThrow();
        assertThat(boPhim.episodes()).hasSize(2);
    }

    @Test
    @DisplayName("Ten phim le lay tu ten file, khong dinh tien to thu muc")
    void singleTitleNameStripsFolderPrefix() {
        List<LibraryTitle> titles = MediaLibrary.build(List.of(
                file("Movies/Nàng Thơ.mp4")
        ), "Movies/");

        assertThat(titles).hasSize(1);
        assertThat(titles.get(0).name()).isEqualTo("Nàng Thơ");
    }

    @Test
    @DisplayName("File phang trung slug duoc them hau to de khong mo nham phim")
    void deduplicatesFlatSlugs() {
        List<LibraryTitle> titles = MediaLibrary.build(List.of(
                file("Movies/杏 - AV28.mp4"),
                file("Movies/なみん - AV28.mp4")
        ), "Movies/");

        assertThat(titles).hasSize(2);
        assertThat(titles).extracting(LibraryTitle::slug).doesNotHaveDuplicates();
    }
}
