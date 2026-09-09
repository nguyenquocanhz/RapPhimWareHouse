package com.rapphim.warehouse.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Mot nguon phim do nguoi dung tu them qua trang quan tri.
 *
 * <p>Rat nhieu trang phim Viet dung chung dinh dang API cua KKPhim, chi khac ten mien.
 * Voi nhung trang do thi chi can khai bao dia chi la dung duoc ngay, khong phai viet
 * them ma nao.</p>
 *
 * @param id       ma dinh danh tren URL, vi du {@code phimmoi}
 * @param name     ten hien cho nguoi dung
 * @param baseUrl  goc REST API cua nguon
 * @param cdnImage goc CDN anh, de trong neu nguon tra ve dia chi anh day du
 * @param enabled  dang bat hay tam tat
 */
@Schema(name = "CustomSource", description = "Nguon phim do nguoi dung tu them")
public record CustomSource(

        @Schema(description = "Ma dinh danh dung tren URL", example = "phimmoi")
        @NotBlank(message = "Thiếu mã nguồn")
        @Pattern(regexp = "[a-z0-9][a-z0-9-]{1,30}",
                message = "Mã nguồn chỉ gồm chữ thường, số và dấu gạch ngang")
        String id,

        @Schema(description = "Ten hien thi", example = "Phim Mới")
        @NotBlank(message = "Thiếu tên nguồn")
        String name,

        @Schema(description = "Goc REST API cua nguon", example = "https://phimapi.com")
        @NotBlank(message = "Thiếu địa chỉ API")
        @Pattern(regexp = "https?://.+", message = "Địa chỉ API phải bắt đầu bằng http:// hoặc https://")
        String baseUrl,

        @Schema(description = "Goc CDN anh, de trong neu nguon tra ve dia chi day du")
        String cdnImage,

        @Schema(description = "Dang bat hay tam tat")
        boolean enabled
) {

    public CustomSource {
        id = id == null ? null : id.trim().toLowerCase();
        name = name == null ? null : name.trim();
        // Bo dau gach cuoi de ghep duong dan khong thanh hai gach lien nhau.
        baseUrl = trimSlash(baseUrl);
        cdnImage = trimSlash(cdnImage);
    }

    private static String trimSlash(String value) {
        if (value == null || value.isBlank()) {
            return value == null ? null : "";
        }
        String trimmed = value.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }
}
