package com.travelmemoryvault.backend.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;


@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Travel Memory Vault API",
                version = "1.0.0",
                description = "REST API for tracking travel expenses and memories. " +
                        "Register an account, login to receive a JWT token, then use " +
                        "the Authorize button to test protected endpoints.",
                contact = @Contact(name = "Travel Memory Vault")
        )
)
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "Paste the JWT token received from POST /api/auth/login"
)
public class OpenApiConfig {
}
