package com.rapphim.warehouse.exception;

/**
 * Nem ra khi khoa quan tri gui len khong dung.
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
