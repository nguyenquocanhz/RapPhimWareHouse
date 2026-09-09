package com.rapphim.warehouse.service;

import com.rapphim.warehouse.config.CacheConfig;
import com.rapphim.warehouse.dto.ProviderType;
import com.rapphim.warehouse.dto.Taxonomy;
import com.rapphim.warehouse.provider.ProviderRegistry;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Tang nghiep vu cho danh muc the loai / quoc gia.
 *
 * <p>Moi nguon tra ve danh muc cua rieng no. Dieu nay bat buoc vi hai nguon
 * dat slug khac nhau cho cung mot the loai: "Hai" la {@code phim-hai} tren
 * NguonC nhung la {@code hai-huoc} tren KKPhim. Dung nham slug se ra 404.</p>
 */
@Service
public class TaxonomyService {

    private final ProviderRegistry registry;

    public TaxonomyService(ProviderRegistry registry) {
        this.registry = registry;
    }

    @Cacheable(cacheNames = CacheConfig.TAXONOMY_CACHE, key = "'categories:' + #provider")
    public List<Taxonomy> categories(String provider) {
        return registry.get(provider).categories();
    }

    @Cacheable(cacheNames = CacheConfig.TAXONOMY_CACHE, key = "'countries:' + #provider")
    public List<Taxonomy> countries(String provider) {
        return registry.get(provider).countries();
    }
}
