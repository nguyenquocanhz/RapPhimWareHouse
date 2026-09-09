package com.rapphim.warehouse.provider;

import com.rapphim.warehouse.dto.ProviderType;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Tra ve cai dat {@link MovieProvider} tuong ung voi nguon duoc yeu cau.
 */
@Component
public class ProviderRegistry {

    private final Map<ProviderType, MovieProvider> providers = new EnumMap<>(ProviderType.class);

    public ProviderRegistry(List<MovieProvider> discovered) {
        discovered.forEach(provider -> providers.put(provider.type(), provider));
    }

    /**
     * @param type nguon can dung, {@code null} se lay nguon mac dinh (KKPhim)
     * @throws IllegalArgumentException neu nguon chua duoc cai dat
     */
    public MovieProvider get(ProviderType type) {
        ProviderType resolved = type == null ? ProviderType.KKPHIM : type;
        MovieProvider provider = providers.get(resolved);
        if (provider == null) {
            throw new IllegalArgumentException("Chua ho tro nguon '" + resolved.code() + "'");
        }
        return provider;
    }

    /** Danh sach ma cac nguon dang hoat dong. */
    public List<String> availableCodes() {
        return providers.keySet().stream().map(ProviderType::code).sorted().toList();
    }
}
