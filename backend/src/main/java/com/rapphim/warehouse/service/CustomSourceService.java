package com.rapphim.warehouse.service;

import com.rapphim.warehouse.config.AdminProperties;
import com.rapphim.warehouse.dto.CustomSource;
import com.rapphim.warehouse.dto.ProviderType;
import com.rapphim.warehouse.provider.MovieProvider;
import com.rapphim.warehouse.provider.kkphim.KKPhimProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.http.client.ClientHttpRequestFactoryBuilder;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Quan ly cac nguon phim do nguoi dung tu them.
 *
 * <h2>Vi sao luu ra tep chu khong dung co so du lieu</h2>
 * <p>Ca he thong khong co co so du lieu nao - moi thu deu doc tu nguon ngoai roi dem
 * lai. Them han mot co so du lieu chi de giu vai dong khai bao la khong dang; mot tep
 * JSON gan vao volume cua Docker la du ben, va nguoi dung mo ra sua tay duoc.</p>
 *
 * <h2>Vi sao dung lai duoc cach doc cua KKPhim</h2>
 * <p>Rat nhieu trang phim Viet la ban sao API cua KKPhim, chi khac ten mien. Nen mot
 * nguon moi chi can dia chi la chay, khong phai viet them ma nao.</p>
 */
@Service
public class CustomSourceService {

    private static final Logger log = LoggerFactory.getLogger(CustomSourceService.class);

    private static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RapPhimWareHouse/1.0";

    /** Chan so nguon de mot tep hong khong sinh ra hang nghin client. */
    private static final int MAX_SOURCES = 30;

    private final AdminProperties properties;
    private final ObjectMapper mapper;
    private final ClientHttpRequestFactoryBuilder<?> factoryBuilder;

    /** Giu thu tu them vao de danh sach hien ra on dinh. */
    private final Map<String, CustomSource> sources = new LinkedHashMap<>();
    private final Map<String, MovieProvider> providers = new LinkedHashMap<>();

    public CustomSourceService(AdminProperties properties, ObjectMapper mapper) {
        this.properties = properties;
        this.mapper = mapper;
        this.factoryBuilder = ClientHttpRequestFactoryBuilder.detect();
        load();
    }

    /** Toan bo nguon da khai bao, ke ca nguon dang tat. */
    public synchronized List<CustomSource> all() {
        return List.copyOf(sources.values());
    }

    /** Cac nguon dang bat, dang da san sang goi. */
    public synchronized Map<String, MovieProvider> activeProviders() {
        return Map.copyOf(providers);
    }

    public synchronized Optional<CustomSource> find(String id) {
        return Optional.ofNullable(sources.get(id));
    }

    /**
     * Them moi hoac ghi de mot nguon.
     *
     * @throws IllegalArgumentException neu ma trung voi nguon dung san, hoac qua han muc
     */
    public synchronized CustomSource save(CustomSource source) {
        if (isBuiltIn(source.id())) {
            throw new IllegalArgumentException(
                    "Mã '" + source.id() + "' trùng với nguồn dựng sẵn, hãy chọn mã khác.");
        }
        if (!sources.containsKey(source.id()) && sources.size() >= MAX_SOURCES) {
            throw new IllegalArgumentException("Chỉ giữ được tối đa " + MAX_SOURCES + " nguồn.");
        }

        // Ghi xuong dia truoc, doi trang thai trong bo nho sau. Lam nguoc lai thi mot
        // lan ghi that bai se de lai bo nho va tep khac nhau: giao dien bao da them
        // nhung khoi dong lai la mat.
        Map<String, CustomSource> next = new LinkedHashMap<>(sources);
        next.put(source.id(), source);
        persist(next.values());

        sources.clear();
        sources.putAll(next);
        rebuild(source);
        return source;
    }

    public synchronized boolean remove(String id) {
        if (!sources.containsKey(id)) {
            return false;
        }

        Map<String, CustomSource> next = new LinkedHashMap<>(sources);
        next.remove(id);
        persist(next.values());

        sources.remove(id);
        providers.remove(id);
        return true;
    }

    /**
     * Goi thu mot nguon xem co dung dinh dang khong.
     *
     * <p>Chi bao "goi duoc" hay khong kem so phim doc duoc - du de biet dia chi da
     * dung chua, ma khong phai cho lau.</p>
     */
    public String probe(CustomSource source) {
        MovieProvider probe = build(source);
        var page = probe.latest(com.rapphim.warehouse.dto.MovieQuery.of(1, 5));
        return "Gọi được, đọc thử thấy %d phim.".formatted(page.items().size());
    }

    private boolean isBuiltIn(String id) {
        for (ProviderType type : ProviderType.values()) {
            if (type.code().equals(id)) {
                return true;
            }
        }
        return false;
    }

    private void rebuild(CustomSource source) {
        if (source.enabled()) {
            providers.put(source.id(), build(source));
        } else {
            providers.remove(source.id());
        }
    }

    private MovieProvider build(CustomSource source) {
        RestClient client = RestClient.builder()
                .requestFactory(factoryBuilder.build(
                        org.springframework.boot.http.client.HttpClientSettings.defaults()
                                .withTimeouts(properties.connectTimeout(), properties.readTimeout())))
                .baseUrl(source.baseUrl())
                .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();

        return new KKPhimProvider(client, source.cdnImage() == null ? "" : source.cdnImage(), source.id());
    }

    // ------------------------------------------------------------------ luu tru

    private Path file() {
        return Path.of(properties.sourcesFile());
    }

    private void load() {
        Path path = file();
        if (!Files.exists(path)) {
            return;
        }
        try {
            CustomSource[] saved = mapper.readValue(Files.readString(path), CustomSource[].class);
            for (CustomSource source : saved) {
                sources.put(source.id(), source);
                rebuild(source);
            }
            log.info("Đã nạp {} nguồn tự thêm từ {}", sources.size(), path);
        } catch (Exception ex) {
            // Tep hong thi bo qua chu khong chan ca ung dung khoi dong.
            log.warn("Không đọc được {}: {}", path, ex.getMessage());
        }
    }

    private void persist(java.util.Collection<CustomSource> snapshot) {
        Path path = file();
        try {
            Path parent = path.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            Files.writeString(path, mapper.writerWithDefaultPrettyPrinter()
                    .writeValueAsString(new ArrayList<>(snapshot)));
        } catch (IOException | RuntimeException ex) {
            log.error("Không ghi được {}: {}", path, ex.getMessage());
            throw new IllegalStateException("Không lưu được danh sách nguồn: " + ex.getMessage(), ex);
        }
    }
}
