package com.travelmemoryvault.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request body for PUT /api/user/profile.
 * All fields are optional — only non-null, non-blank fields are applied.
 */
@Data
public class UpdateProfileRequest {

    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    private String fullName;

    @Email(message = "Please provide a valid email address")
    private String email;
}
