package com.rapphim.warehouse.provider;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ProviderSupportTest {

    @Test
    @DisplayName("slugify bo dau tieng Viet va doi sang dang gach noi")
    void slugifyRemovesVietnameseDiacritics() {
        assertThat(ProviderSupport.slugify("Hành Động")).isEqualTo("hanh-dong");
        assertThat(ProviderSupport.slugify("Hồng Kông")).isEqualTo("hong-kong");
        assertThat(ProviderSupport.slugify("Đang cập nhật")).isEqualTo("dang-cap-nhat");
        assertThat(ProviderSupport.slugify("  Tâm  Lý  ")).isEqualTo("tam-ly");
        assertThat(ProviderSupport.slugify("   ")).isNull();
        assertThat(ProviderSupport.slugify(null)).isNull();
    }

    @Test
    @DisplayName("isPlaceholder nhan dien gia tri rong ke ca khi nguon viet co dau")
    void isPlaceholderMatchesBothSpellings() {
        assertThat(ProviderSupport.isPlaceholder("Đang cập nhật")).isTrue();
        assertThat(ProviderSupport.isPlaceholder("Dang cap nhat")).isTrue();
        assertThat(ProviderSupport.isPlaceholder("  ")).isTrue();
        assertThat(ProviderSupport.isPlaceholder("Trần Hiểu Hoa")).isFalse();
    }

    @Test
    @DisplayName("absoluteImage chi ghep CDN khi duong dan la tuong doi")
    void absoluteImageOnlyPrefixesRelativePaths() {
        assertThat(ProviderSupport.absoluteImage("uploads/a.webp", "https://phimimg.com"))
                .isEqualTo("https://phimimg.com/uploads/a.webp");
        assertThat(ProviderSupport.absoluteImage("/uploads/a.webp", "https://phimimg.com/"))
                .isEqualTo("https://phimimg.com/uploads/a.webp");
        assertThat(ProviderSupport.absoluteImage("https://cdn.example/a.jpg", "https://phimimg.com"))
                .isEqualTo("https://cdn.example/a.jpg");
        assertThat(ProviderSupport.absoluteImage(null, "https://phimimg.com")).isNull();
    }

    @Test
    @DisplayName("splitCsv tach ten dien vien va bo cac gia tri rong")
    void splitCsvDropsPlaceholders() {
        assertThat(ProviderSupport.splitCsv("Trần Hiểu Hoa, Vi Gia Hùng , Mã Quán Đông"))
                .containsExactly("Trần Hiểu Hoa", "Vi Gia Hùng", "Mã Quán Đông");
        assertThat(ProviderSupport.splitCsv("Đang cập nhật")).isEmpty();
        assertThat(ProviderSupport.splitCsv(null)).isEmpty();
    }

    @Test
    @DisplayName("normalizeInstant tra ve chuoi ISO-8601 chuan")
    void normalizeInstantReturnsIsoString() {
        assertThat(ProviderSupport.normalizeInstant("2026-09-08T20:42:25.000Z"))
                .isEqualTo("2026-09-08T20:42:25Z");
        assertThat(ProviderSupport.normalizeInstant("khong-phai-thoi-gian"))
                .isEqualTo("khong-phai-thoi-gian");
        assertThat(ProviderSupport.normalizeInstant(null)).isNull();
    }

    @Test
    @DisplayName("parseInt va orEmpty an toan voi gia tri null")
    void nullSafeHelpers() {
        assertThat(ProviderSupport.parseInt("2026")).isEqualTo(2026);
        assertThat(ProviderSupport.parseInt("abc")).isNull();
        assertThat(ProviderSupport.parseInt(null)).isNull();
        assertThat(ProviderSupport.<String>orEmpty(null)).isEmpty();
        assertThat(ProviderSupport.orEmpty(List.of("a"))).containsExactly("a");
    }
}
