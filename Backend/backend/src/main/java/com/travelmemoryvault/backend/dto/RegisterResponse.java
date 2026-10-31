package com.travelmemoryvault.backend.dto;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class RegisterResponse {

    private Long id;
    private String fullName;
    private String email;
    private LocalDateTime createdAt;
    private String message;
}