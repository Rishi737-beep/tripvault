package com.travelmemoryvault.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExpenseResponse(
        Long id,
        String category,
        BigDecimal amount,
        String description,
        LocalDate date) {
}
