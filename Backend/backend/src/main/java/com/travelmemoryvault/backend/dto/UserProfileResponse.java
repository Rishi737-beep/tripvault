package com.travelmemoryvault.backend.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Safe user profile view — never includes the password field.
 */
@Getter
@Setter
@Builder
public class UserProfileResponse {

    private Long id;
    private String fullName;
    private String email;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
