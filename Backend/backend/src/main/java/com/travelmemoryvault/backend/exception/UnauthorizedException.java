package com.travelmemoryvault.backend.exception;

/**
 * Thrown when an authenticated user tries to access a resource they do not own.
 * Maps to HTTP 403 Forbidden.
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
