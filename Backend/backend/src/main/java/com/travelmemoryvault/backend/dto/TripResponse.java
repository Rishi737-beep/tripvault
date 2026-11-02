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
        String description,
        boolean hasCover) {

    public TripResponse(Long id, String destination, LocalDate startDate, LocalDate endDate,
                        BigDecimal budget, String currency, String description) {
        this(id, destination, startDate, endDate, budget, currency, description, false);
    }
}
