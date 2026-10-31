package com.travelmemoryvault.backend.exception;

public class PhotoTooLargeException extends RuntimeException {

    public PhotoTooLargeException() {
        super("Image must be 5 MB or smaller.");
    }
}
