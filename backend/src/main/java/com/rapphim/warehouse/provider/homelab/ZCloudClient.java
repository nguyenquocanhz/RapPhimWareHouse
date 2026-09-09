package com.rapphim.warehouse.provider.homelab;

import com.rapphim.warehouse.config.ZCloudProperties;
import com.rapphim.warehouse.exception.UpstreamException;
import com.rapphim.warehouse.provider.homelab.model.ZCloudModels.ListResponse;
import com.rapphim.warehouse.provider.homelab.model.ZCloudModels.LoginRequest;
import com.rapphim.warehouse.provider.homelab.model.ZCloudModels.ObjectItem;
import com.rapphim.warehouse.provider.homelab.model.ZCloudModels.PresignRequest;
import com.rapphim.warehouse.provider.homelab.model.ZCloudModels.PresignResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Cau noi toi ZCloud - dich vu luu tru chay tren homelab.
 *
 * <p>ZCloud nhan hai cach xac thuc: header {@code x-api-key}, hoac dang nhap bang
 * mat khau roi giu cookie phien. Uu tien khoa vi no khong co phien de het han giua
 * chung; duong dang nhap chi la duong lui khi nguoi dung chua tao khoa.</p>
 */
@Component
public class ZCloudClient {

    private static final Logger log = LoggerFactory.getLogger(ZCloudClient.class);

    private static final String API_KEY_HEADER = "x-api-key";

    private final RestClient client;
    private final ZCloudProperties properties;

    /** Khoa co the doi tren trang quan tri nen phai hoi moi lan dung, khong giu lai. */
    private final com.rapphim.warehouse.service.SettingsService settings;

    /**
     * Cookie phien lay tu lan dang nhap gan nhat.
     *
     * <p>Chi dung khi xac thuc bang mat khau. Giu trong bien nguyen tu vi nhieu
     * request co the cung cham vao mot luc.</p>
     */
    private final AtomicReference<String> session = new AtomicReference<>();

    public ZCloudClient(RestClient zcloudRestClient,
                        ZCloudProperties properties,
                        @org.springframework.context.annotation.Lazy
                        com.rapphim.warehouse.service.SettingsService settings) {
        this.client = zcloudRestClient;
        this.properties = properties;
        this.settings = settings;
    }

    /** Kho da san sang de goi chua. */
    public boolean isConfigured() {
        return settings.zcloudApiKey() != null || properties.password() != null;
    }

    /**
     * Duyet toan bo file nam duoi mot thu muc, di qua het cac trang.
     *
     * <p>Dung {@code flat=true} de lay thang moi file trong ca cay thu muc con thay
     * vi phai de quy tung cap - mot kho phim vai nghin file chi ton vai lan goi.</p>
     *
     * @param prefix thu muc goc, chuoi rong nghia la ca kho
     */
    public List<ObjectItem> listAll(String prefix) {
        if (!isConfigured()) {
            return List.of();
        }

        List<ObjectItem> all = new ArrayList<>();
        String token = null;

        // Chan cung so vong de mot kho bat thuong khong lam treo tien trinh.
        for (int page = 0; page < 200; page++) {
            ListResponse response = listPage(prefix, token);
            if (response == null) {
                break;
            }
            all.addAll(response.items());

            token = response.nextToken();
            if (token == null || token.isBlank()) {
                break;
            }
        }
        return all;
    }

    private ListResponse listPage(String prefix, String token) {
        try {
            RestClient.RequestHeadersSpec<?> spec = client.get()
                    .uri(builder -> {
                        builder.path("/v1/objects")
                                .queryParam("flat", true)
                                .queryParam("limit", properties.pageSize());
                        if (prefix != null && !prefix.isBlank()) {
                            builder.queryParam("prefix", prefix);
                        }
                        if (token != null && !token.isBlank()) {
                            builder.queryParam("token", token);
                        }
                        return builder.build();
                    });

            return authorise(spec).retrieve().body(ListResponse.class);
        } catch (UpstreamException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new UpstreamException(
                    "homelab", "Không đọc được kho phim trên homelab: " + ex.getMessage(), ex);
        }
    }

    /**
     * Xin mot duong dan tam de trinh duyet tai thang file, khong di qua backend.
     *
     * <p>Quan trong voi video: duong nay ho tro {@code Range} nen tua duoc, va byte
     * video khong phai chay vong qua Spring. Duong co han su dung nen khong the chia
     * se ra ngoai vo thoi han.</p>
     */
    public String presign(String key) {
        if (!isConfigured() || key == null || key.isBlank()) {
            return null;
        }

        try {
            PresignRequest body = new PresignRequest(
                    key, "GET", (int) properties.presignExpiry().toSeconds(), false);

            RestClient.RequestBodySpec spec = client.post()
                    .uri("/v1/presign")
                    .contentType(MediaType.APPLICATION_JSON);
            applyAuth(spec);

            PresignResponse response = spec.body(body)
                    .retrieve()
                    .body(PresignResponse.class);

            return response == null ? null : response.url();
        } catch (Exception ex) {
            log.warn("Không tạo được đường phát cho {}: {}", key, ex.getMessage());
            return null;
        }
    }

    /**
     * Tai nguyen ven mot file nho ve bo nho.
     *
     * <p>Chi dung cho phu de - vai chuc KB. Video khong bao gio di duong nay ma dung
     * duong tam o tren, de byte video khong phai chay vong qua backend.</p>
     */
    public byte[] download(String key) {
        if (!isConfigured() || key == null || key.isBlank()) {
            return null;
        }
        try {
            RestClient.RequestHeadersSpec<?> spec = client.get()
                    .uri(builder -> builder.path("/v1/download/{key}")
                            .queryParam("inline", true)
                            .build(key));

            return authorise(spec).retrieve().body(byte[].class);
        } catch (Exception ex) {
            log.warn("Không tải được {}: {}", key, ex.getMessage());
            return null;
        }
    }

    /**
     * Gan thong tin xac thuc vao mot request.
     *
     * <p>Co khoa thi chi can mot header. Khong co thi phai dang nhap truoc de lay
     * cookie phien, va dang nhap lai khi phien het han.</p>
     */
    private RestClient.RequestHeadersSpec<?> authorise(RestClient.RequestHeadersSpec<?> spec) {
        applyAuth(spec);
        return spec;
    }

    /**
     * Them header xac thuc vao spec dang dung do.
     *
     * <p>{@code RestClient} tra ve chinh no tu {@code header(...)} nen sua tai cho la
     * du; khong tra ve gia tri de khoi vuong vao generic tu tham chieu cua no.</p>
     */
    private void applyAuth(RestClient.RequestHeadersSpec<?> spec) {
        String key = settings.zcloudApiKey();
        if (key != null) {
            spec.header(API_KEY_HEADER, key);
            return;
        }

        String cookie = session.get();
        if (cookie == null) {
            cookie = login();
        }
        if (cookie != null) {
            spec.header(HttpHeaders.COOKIE, cookie);
        }
    }

    /**
     * Dang nhap bang mat khau va giu lai cookie phien.
     *
     * @return chuoi cookie, hoac null neu dang nhap khong thanh cong
     */
    private String login() {
        if (properties.password() == null) {
            return null;
        }

        try {
            HttpHeaders headers = client.post()
                    .uri("/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new LoginRequest(properties.password()))
                    .retrieve()
                    .toBodilessEntity()
                    .getHeaders();

            List<String> cookies = headers.get(HttpHeaders.SET_COOKIE);
            if (cookies == null || cookies.isEmpty()) {
                log.warn("ZCloud nhận đăng nhập nhưng không trả về cookie phiên.");
                return null;
            }

            // Chi giu phan "ten=gia tri", bo cac thuoc tinh Path/Expires phia sau.
            String cookie = cookies.stream()
                    .map(value -> value.split(";", 2)[0])
                    .reduce((a, b) -> a + "; " + b)
                    .orElse(null);

            session.set(cookie);
            return cookie;
        } catch (Exception ex) {
            log.warn("Không đăng nhập được vào ZCloud: {}", ex.getMessage());
            return null;
        }
    }
}
