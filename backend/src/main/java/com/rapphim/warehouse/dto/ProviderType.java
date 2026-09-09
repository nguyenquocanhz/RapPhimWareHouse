package com.rapphim.warehouse.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Arrays;

/**
 * Cac nguon du lieu phim ma he thong ho tro.
 */
@Schema(name = "ProviderType", description = "Nguon du lieu phim", example = "kkphim")
public enum ProviderType {

    /** KKPhim - phimapi.com */
    KKPHIM("kkphim"),

    /** NguonC - phim.nguonc.com */
    NGUONC("nguonc"),

    /** Kho phim rieng tren homelab, doc qua ZCloud. */
    HOMELAB("homelab");

    private final String code;

    ProviderType(String code) {
        this.code = code;
    }

    @JsonValue
    public String code() {
        return code;
    }

    @JsonCreator
    public static ProviderType from(String value) {
        if (value == null || value.isBlank()) {
            return KKPHIM;
        }
        return Arrays.stream(values())
                .filter(p -> p.code.equalsIgnoreCase(value.trim()) || p.name().equalsIgnoreCase(value.trim()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Nguon '" + value + "' khong hop le. Chi chap nhan: kkphim, nguonc, homelab"));
    }
}
