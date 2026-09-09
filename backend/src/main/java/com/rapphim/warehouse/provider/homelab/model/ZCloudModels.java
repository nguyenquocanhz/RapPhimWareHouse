package com.rapphim.warehouse.provider.homelab.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Cac kieu du lieu tra ve tu ZCloud, chep theo dung openapi.json cua no.
 *
 * <p>Ten truong ben do dung kieu snake_case nen phai anh xa lai; giu nguyen ten
 * Java theo loi camelCase cho dong bo voi phan con lai cua du an.</p>
 */
public final class ZCloudModels {

    private ZCloudModels() {
    }

    /** Mot doi tuong trong kho - o day la mot file. */
    public record ObjectItem(
            String key,
            String name,
            long size,
            @JsonProperty("last_modified") String lastModified,
            String etag
    ) {
    }

    /** Ket qua duyet kho. {@code nextToken} khac null nghia la con trang nua. */
    public record ListResponse(
            String prefix,
            List<String> folders,
            List<ObjectItem> items,
            @JsonProperty("next_token") String nextToken,
            boolean truncated
    ) {

        public List<String> folders() {
            return folders == null ? List.of() : folders;
        }

        public List<ObjectItem> items() {
            return items == null ? List.of() : items;
        }
    }

    /** Duong dan tam de tai thang mot file, khong kem thong tin dang nhap. */
    public record PresignResponse(
            String url,
            String method,
            String key,
            @JsonProperty("expires_in") int expiresIn
    ) {
    }

    /** Than yeu cau tao duong dan tam. */
    public record PresignRequest(
            String key,
            String method,
            int expires,
            boolean download
    ) {
    }

    /** Than yeu cau dang nhap; ZCloud chi hoi mat khau, khong hoi ten tai khoan. */
    public record LoginRequest(String password) {
    }
}
