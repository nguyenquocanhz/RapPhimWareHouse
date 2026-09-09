package com.rapphim.warehouse.config;

import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Khai bao tai lieu OpenAPI 3 / Swagger UI cho toan bo API.
 */
@Configuration
public class OpenApiConfig {

    private static final String DESCRIPTION = """
            REST API tong hop du lieu phim tu hai nguon **KKPhim** (`phimapi.com`) va
            **NguonC** (`phim.nguonc.com`), chuan hoa ve mot dinh dang thong nhat.

            ### Quy uoc chung

            - Moi response deu duoc boc trong envelope `ApiResponse` gom
              `success`, `message`, `data`, `timestamp`.
            - Ket qua dang danh sach nam trong `PageResponse` kem `meta`
              (`page`, `limit`, `totalItems`, `totalPages`).
            - Chon nguon du lieu bang query param `provider`: `kkphim` (mac dinh) hoac `nguonc`.
            - Trang bat dau tu `1`. `limit` toi da la `64`.
            - Loi tra ve theo dinh dang `ApiError` kem truong `code` de client xu ly theo tung truong hop.

            ### Bang ma loi

            | code | HTTP | Y nghia |
            |------|------|---------|
            | `INVALID_PARAMETER` | 400 | Tham so truy van sai dinh dang hoac ngoai mien gia tri |
            | `VALIDATION_FAILED` | 400 | Du lieu khong qua buoc validate |
            | `MOVIE_NOT_FOUND` | 404 | Khong tim thay phim theo slug |
            | `ENDPOINT_NOT_FOUND` | 404 | Sai duong dan endpoint |
            | `UPSTREAM_ERROR` | 502 | Nguon phim ben ngoai loi hoac timeout |
            | `INTERNAL_ERROR` | 500 | Loi khong xac dinh phia server |

            ### Cache

            Ket qua goi nguon ngoai duoc cache trong bo nho (Caffeine):
            danh sach 5 phut, chi tiet phim 30 phut, the loai / quoc gia 12 gio.
            """;

    @Value("${server.port:8080}")
    private int serverPort;

    @Bean
    public OpenAPI rapPhimOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("RapPhim WareHouse API")
                        .version("v1")
                        .description(DESCRIPTION)
                        .contact(new Contact()
                                .name("RapPhim WareHouse")
                                .email("support@rapphim.local"))
                        .license(new License()
                                .name("MIT")
                                .url("https://opensource.org/licenses/MIT")))
                .servers(List.of(new Server()
                        .url("http://localhost:" + serverPort)
                        .description("Moi truong local")))
                .tags(List.of(
                        new Tag().name("Movies").description("Danh sach, tim kiem va chi tiet phim"),
                        new Tag().name("Taxonomies").description("The loai va quoc gia"),
                        new Tag().name("System").description("Thong tin he thong va nguon du lieu")))
                .externalDocs(new ExternalDocumentation()
                        .description("Tai lieu API goc cua KKPhim")
                        .url("https://kkphim.com/help/api"));
    }
}
