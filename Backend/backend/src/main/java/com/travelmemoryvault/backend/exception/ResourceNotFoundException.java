package com.travelmemoryvault.backend.exception;

/**
 * Thrown when a requested resource (trip, expense, user) does not exist.
 * Maps to HTTP 404 Not Found.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
