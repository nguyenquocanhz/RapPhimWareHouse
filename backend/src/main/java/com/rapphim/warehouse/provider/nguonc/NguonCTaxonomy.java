package com.rapphim.warehouse.provider.nguonc;

import com.rapphim.warehouse.dto.Taxonomy;

import java.util.List;

/**
 * The loai va quoc gia cua NguonC.
 *
 * <p>NguonC khong co endpoint liet ke danh muc (tai lieu chinh thuc chi cong bo
 * 7 endpoint), nen danh sach nay duoc chep tu menu cua chinh trang nguon.</p>
 *
 * <p>Khong dung chung danh muc voi KKPhim duoc vi hai ben dat slug khac nhau:
 * the loai "Hai" o NguonC la {@code phim-hai} trong khi KKPhim dung
 * {@code hai-huoc}, va NguonC con co {@code gay-can}, {@code mien-tay},
 * {@code quoc-gia-khac} ma KKPhim khong co.</p>
 */
final class NguonCTaxonomy {

    private NguonCTaxonomy() {
    }

    static final List<Taxonomy> CATEGORIES = List.of(
            of("Hành Động", "hanh-dong"),
            of("Phiêu Lưu", "phieu-luu"),
            of("Hoạt Hình", "hoat-hinh"),
            of("Hài", "phim-hai"),
            of("Hình Sự", "hinh-su"),
            of("Tài Liệu", "tai-lieu"),
            of("Chính Kịch", "chinh-kich"),
            of("Gia Đình", "gia-dinh"),
            of("Giả Tưởng", "gia-tuong"),
            of("Lịch Sử", "lich-su"),
            of("Kinh Dị", "kinh-di"),
            of("Nhạc", "phim-nhac"),
            of("Bí Ẩn", "bi-an"),
            of("Lãng Mạn", "lang-man"),
            of("Khoa Học Viễn Tưởng", "khoa-hoc-vien-tuong"),
            of("Gây Cấn", "gay-can"),
            of("Chiến Tranh", "chien-tranh"),
            of("Tâm Lý", "tam-ly"),
            of("Tình Cảm", "tinh-cam"),
            of("Cổ Trang", "co-trang"),
            of("Miền Tây", "mien-tay"),
            of("Phim 18+", "phim-18"));

    static final List<Taxonomy> COUNTRIES = List.of(
            of("Âu Mỹ", "au-my"),
            of("Anh", "anh"),
            of("Trung Quốc", "trung-quoc"),
            of("Indonesia", "indonesia"),
            of("Việt Nam", "viet-nam"),
            of("Pháp", "phap"),
            of("Hồng Kông", "hong-kong"),
            of("Hàn Quốc", "han-quoc"),
            of("Nhật Bản", "nhat-ban"),
            of("Thái Lan", "thai-lan"),
            of("Đài Loan", "dai-loan"),
            of("Nga", "nga"),
            of("Hà Lan", "ha-lan"),
            of("Philippines", "philippines"),
            of("Ấn Độ", "an-do"),
            of("Quốc gia khác", "quoc-gia-khac"));

    /** NguonC khong cap id cho danh muc nen dung slug lam dinh danh. */
    private static Taxonomy of(String name, String slug) {
        return new Taxonomy(slug, name, slug);
    }
}
