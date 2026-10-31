package com.travelmemoryvault.backend.exception;

/**
 * Thrown when a registration or profile-update attempts to use an email
 * that is already registered by another account.
 * Maps to HTTP 409 Conflict.
 */
public class DuplicateEmailException extends RuntimeException {

    public DuplicateEmailException(String message) {
        super(message);
    }
}
