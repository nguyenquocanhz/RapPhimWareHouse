package com.rapphim.warehouse.provider;

import com.rapphim.warehouse.dto.ProviderType;
import com.rapphim.warehouse.service.CustomSourceService;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Tra ve cai dat {@link MovieProvider} tuong ung voi nguon duoc yeu cau.
 */
@Component
public class ProviderRegistry {

    private final Map<ProviderType, MovieProvider> providers = new EnumMap<>(ProviderType.class);

    /**
     * Nguon do nguoi dung them, nap luc chay.
     *
     * <p>Dat {@code @Lazy} vi hai ben tro toi nhau: dich vu nguon tu them dung cach doc
     * cua KKPhim, con registry lai phai hoi no de biet co nhung ma nao.</p>
     */
    private final CustomSourceService customSources;

    public ProviderRegistry(List<MovieProvider> discovered, @Lazy CustomSourceService customSources) {
        discovered.forEach(provider -> providers.put(provider.type(), provider));
        this.customSources = customSources;
    }

    /**
     * Tra ve cai dat theo ma tren URL.
     *
     * <p>Tim trong cac nguon dung san truoc, roi moi den nguon nguoi dung tu them.
     * Ma rong nghia la lay nguon mac dinh.</p>
     */
    public MovieProvider get(String code) {
        if (code == null || code.isBlank()) {
            return get(ProviderType.KKPHIM);
        }

        String wanted = code.trim().toLowerCase();
        for (ProviderType type : ProviderType.values()) {
            if (type.code().equals(wanted)) {
                return get(type);
            }
        }

        MovieProvider custom = customSources.activeProviders().get(wanted);
        if (custom == null) {
            throw new IllegalArgumentException(
                    "Nguon '" + code + "' khong hop le. Cac nguon dang co: "
                            + String.join(", ", availableCodes()));
        }
        return custom;
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

    /** Danh sach ma cac nguon dang hoat dong, ke ca nguon nguoi dung tu them. */
    public List<String> availableCodes() {
        List<String> codes = new ArrayList<>(
                providers.keySet().stream().map(ProviderType::code).sorted().toList());
        codes.addAll(customSources.activeProviders().keySet().stream().sorted().toList());
        return List.copyOf(codes);
    }
}
