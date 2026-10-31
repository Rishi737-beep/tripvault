package com.travelmemoryvault.backend.dto;

import java.time.LocalDateTime;

public record TripPhotoResponse(Long id, String contentType, long fileSize, LocalDateTime createdAt) {
}
