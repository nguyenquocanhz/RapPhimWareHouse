package com.rapphim.warehouse.exception;

/**
 * Nem ra khi goi endpoint quan tri ma chua dat khoa quan tri.
 *
 * <p>Tra ve 503 chu khong phai 401: khong phai nguoi goi sai khoa, ma la he thong chua
 * duoc cau hinh de cho sua - hai chuyen khac nhau, va loi nhan cung khac nhau.</p>
 */
public class AdminNotConfiguredException extends RuntimeException {

    public AdminNotConfiguredException(String message) {
        super(message);
    }
}
