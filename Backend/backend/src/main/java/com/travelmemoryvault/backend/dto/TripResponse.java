package com.travelmemoryvault.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TripResponse(
        Long id,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal budget,
        String currency,
        String description) {
}
