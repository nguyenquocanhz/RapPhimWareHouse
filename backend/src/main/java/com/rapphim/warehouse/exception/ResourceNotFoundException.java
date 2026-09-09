package com.rapphim.warehouse.exception;

/**
 * Nem ra khi khong tim thay tai nguyen duoc yeu cau (phim, the loai...).
 */
public class ResourceNotFoundException extends RuntimeException {

    private final String code;

    public ResourceNotFoundException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
