package com.travelmemoryvault.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExpenseRequest(
        @NotBlank @Pattern(regexp = "HOTEL|FOOD|TRANSPORT|SHOPPING|OTHER") String category,
        @NotNull @DecimalMin(value = "0.01") @Digits(integer = 13, fraction = 2) BigDecimal amount,
        @Size(max = 500) String description,
        @NotNull LocalDate date) {
}
