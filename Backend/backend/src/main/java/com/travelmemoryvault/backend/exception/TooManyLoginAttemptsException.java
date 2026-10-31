package com.travelmemoryvault.backend.exception;

public class TooManyLoginAttemptsException extends RuntimeException {

    public TooManyLoginAttemptsException() {
        super("Too many failed sign-in attempts. Try again in 15 minutes.");
    }
}
