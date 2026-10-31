package com.travelmemoryvault.backend.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Response body for POST /api/auth/login.
 * Contains the JWT token and basic user info so the frontend
 * does not need a separate profile call immediately after login.
 */
@Getter
@Setter
@Builder
public class LoginResponse {

    private String token;

    /** Always "Bearer" — clients should prefix this when sending the token. */
    private String tokenType;

    private Long userId;
    private String fullName;
    private String email;
    private LocalDateTime issuedAt;
}
