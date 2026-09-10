package com.rapphim.warehouse.config;

import org.springframework.boot.http.client.ClientHttpRequestFactoryBuilder;
import org.springframework.boot.http.client.HttpClientSettings;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * Tao san hai {@link RestClient} rieng cho tung nguon phim, kem timeout va header mac dinh.
 */
@Configuration
public class RestClientConfig {

    private static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RapPhimWareHouse/1.0";

    private final ProviderProperties properties;
    private final TmdbProperties tmdbProperties;
    private final ZCloudProperties zcloudProperties;
    private final AniListProperties aniListProperties;
    private final JikanProperties jikanProperties;

    public RestClientConfig(ProviderProperties properties,
                            TmdbProperties tmdbProperties,
                            ZCloudProperties zcloudProperties,
                            AniListProperties aniListProperties,
                            JikanProperties jikanProperties) {
        this.properties = properties;
        this.tmdbProperties = tmdbProperties;
        this.zcloudProperties = zcloudProperties;
        this.aniListProperties = aniListProperties;
        this.jikanProperties = jikanProperties;
    }

    /** Factory dung chung, gioi han thoi gian cho de mot nguon cham khong lam treo API. */
    @Bean
    public ClientHttpRequestFactory providerRequestFactory() {
        HttpClientSettings settings = HttpClientSettings.defaults()
                .withTimeouts(properties.connectTimeout(), properties.readTimeout());
        return ClientHttpRequestFactoryBuilder.detect().build(settings);
    }

    @Bean
    public RestClient kkphimRestClient(RestClient.Builder builder, ClientHttpRequestFactory factory) {
        return baseClient(builder, factory, properties.kkphim().baseUrl());
    }

    @Bean
    public RestClient nguoncRestClient(RestClient.Builder builder, ClientHttpRequestFactory factory) {
        return baseClient(builder, factory, properties.nguonc().baseUrl());
    }

    @Bean
    public RestClient vsmovRestClient(RestClient.Builder builder, ClientHttpRequestFactory factory) {
        return baseClient(builder, factory, properties.vsmov().baseUrl());
    }

    /**
     * Client cho TheMovieDB.
     *
     * <p>Khong gan thong tin xac thuc o day: khoa TMDB doi duoc tren trang quan tri,
     * ma client thi chi dung mot lan luc khoi dong. {@code TmdbClient} tu gan token
     * hoac khoa vao tung request.</p>
     */
    @Bean
    public RestClient tmdbRestClient(RestClient.Builder builder, ClientHttpRequestFactory factory) {
        return builder.clone()
                .requestFactory(factory)
                .baseUrl(tmdbProperties.baseUrl())
                .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    /**
     * Client cho AniList (metadata anime, GraphQL). Khong can khoa. Gui va nhan JSON;
     * cau truy van di trong than POST nen chi can dat san Content-Type / Accept.
     */
    @Bean
    public RestClient anilistRestClient(RestClient.Builder builder, ClientHttpRequestFactory factory) {
        return builder.clone()
                .requestFactory(factory)
                .baseUrl(aniListProperties.baseUrl())
                .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    /**
     * Client cho Jikan (MyAnimeList) - nguon metadata anime du phong. REST, khong khoa.
     */
    @Bean
    public RestClient jikanRestClient(RestClient.Builder builder, ClientHttpRequestFactory factory) {
        return builder.clone()
                .requestFactory(factory)
                .baseUrl(jikanProperties.baseUrl())
                .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    /**
     * Client cho kho phim rieng. Khong dat san header xac thuc o day: kho nhan ca
     * khoa lan cookie phien, nen viec do de {@code ZCloudClient} quyet dinh tung lan.
     */
    @Bean
    public RestClient zcloudRestClient(RestClient.Builder builder, ClientHttpRequestFactory factory) {
        return builder.clone()
                .requestFactory(factory)
                .baseUrl(zcloudProperties.baseUrl())
                .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
                .build();
    }

    private RestClient baseClient(RestClient.Builder builder, ClientHttpRequestFactory factory, String baseUrl) {
        return builder.clone()
                .requestFactory(factory)
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }
}
