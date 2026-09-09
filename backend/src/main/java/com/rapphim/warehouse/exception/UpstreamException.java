package com.rapphim.warehouse.exception;

/**
 * Nem ra khi nguon phim ben ngoai (KKPhim / NguonC) loi hoac khong phan hoi.
 */
public class UpstreamException extends RuntimeException {

    private final String provider;

    public UpstreamException(String provider, String message, Throwable cause) {
        super(message, cause);
        this.provider = provider;
    }

    public UpstreamException(String provider, String message) {
        this(provider, message, null);
    }

    public String getProvider() {
        return provider;
    }
}
