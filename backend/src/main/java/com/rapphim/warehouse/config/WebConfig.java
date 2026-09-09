package com.rapphim.warehouse.config;

import com.rapphim.warehouse.dto.ListType;
import com.rapphim.warehouse.dto.ProviderType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Cau hinh tang web: mo CORS cho frontend Next.js va doc enum tu query param theo slug.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final String[] allowedOrigins;

    public WebConfig(@Value("${rapphim.cors.allowed-origins}") String[] allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .maxAge(3600);
    }

    /**
     * Mac dinh Spring chi doi query param sang enum theo dung ten hang (KKPHIM).
     * Dang ky them hai converter de client goi bang slug thuong dung (kkphim, phim-bo).
     */
    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(String.class, ProviderType.class, ProviderType::from);
        registry.addConverter(String.class, ListType.class, ListType::from);
    }
}
