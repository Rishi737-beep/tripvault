package com.travelmemoryvault.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * JPA entity representing a single expense within a trip.
 *
 * Expected categories (not enforced at DB level for flexibility):
 * FOOD, TRANSPORT, ACCOMMODATION, ENTERTAINMENT, SHOPPING, HEALTH, VISA, OTHER
 *
 * IMPORTANT: Amounts from different currencies must NEVER be summed together
 * without an explicit conversion mechanism. The spending summary groups by currency.
 */
@Entity
@Table(name = "expenses", indexes = {
        @Index(name = "idx_expenses_trip_id", columnList = "trip_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Always use BigDecimal for money — never float or double. */
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 50)
    private String category;

    /** ISO 4217 currency code. Defaults to the parent trip's currency if not set. */
    @Column(length = 3)
    private String currency;

    @Column(name = "description", columnDefinition = "text")
    private String notes;

    private LocalDate expenseDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @Column(name = "travel_id", nullable = false)
    private Long travelId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
