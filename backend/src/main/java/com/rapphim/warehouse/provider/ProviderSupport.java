package com.rapphim.warehouse.provider;

import java.text.Normalizer;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Cac ham tien ich dung chung khi chuyen du lieu tho tu nguon ve DTO chuan.
 */
public final class ProviderSupport {

    private static final Pattern COMBINING_MARKS = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    private static final Pattern NON_SLUG_CHARS = Pattern.compile("[^a-z0-9]+");

    private ProviderSupport() {
    }

    /**
     * Sinh slug tu ten tieng Viet, dung cho nguon chi tra ve ten ma khong tra ve slug.
     * Vi du {@code "Hanh Dong"} thanh {@code "hanh-dong"}.
     */
    public static String slugify(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String withoutD = value.replace('đ', 'd').replace('Đ', 'D');
        String normalized = Normalizer.normalize(withoutD, Normalizer.Form.NFD);
        String ascii = COMBINING_MARKS.matcher(normalized).replaceAll("");
        String slug = NON_SLUG_CHARS.matcher(ascii.toLowerCase(Locale.ROOT)).replaceAll("-");
        slug = slug.replaceAll("^-+", "").replaceAll("-+$", "");
        return slug.isEmpty() ? null : slug;
    }

    /**
     * Ghep duong dan anh voi CDN neu nguon tra ve duong dan tuong doi.
     *
     * @param path duong dan anh tho, co the null hoac da la URL tuyet doi
     * @param cdn  goc CDN, vi du {@code https://phimimg.com}
     */
    public static String absoluteImage(String path, String cdn) {
        if (path == null || path.isBlank()) {
            return null;
        }
        String trimmed = path.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return trimmed;
        }
        if (cdn == null || cdn.isBlank()) {
            return trimmed;
        }
        String base = cdn.endsWith("/") ? cdn.substring(0, cdn.length() - 1) : cdn;
        String suffix = trimmed.startsWith("/") ? trimmed : "/" + trimmed;
        return base + suffix;
    }

    /**
     * Nhan dien cac gia tri nguon dung de bao "chua co du lieu".
     * So sanh tren slug nen khop ca khi nguon viet co dau hay khong dau.
     */
    public static boolean isPlaceholder(String value) {
        String slug = slugify(value);
        return slug == null || "dang-cap-nhat".equals(slug) || "updating".equals(slug);
    }

    /** Tach chuoi ngan cach bang dau phay thanh danh sach, bo qua phan tu rong. */
    public static List<String> splitCsv(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty() && !isPlaceholder(s))
                .toList();
    }

    /** Doc chuoi thoi gian ISO-8601 ve dang chuan, tra null neu khong doc duoc. */
    public static String normalizeInstant(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(raw.trim()).toString();
        } catch (DateTimeParseException ignored) {
            try {
                return Instant.parse(raw.trim().replace(" ", "T") + "Z").toString();
            } catch (DateTimeParseException stillBad) {
                return raw;
            }
        }
    }

    /** Chuyen chuoi sang so nguyen, tra null neu khong hop le. */
    public static Integer parseInt(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Integer.valueOf(raw.trim());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    /** Tra ve danh sach rong thay vi null. */
    public static <T> List<T> orEmpty(List<T> list) {
        return list == null ? List.of() : list;
    }
}
