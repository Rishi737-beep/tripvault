package com.travelmemoryvault.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * JPA entity representing a travel trip owned by a user.
 * One user can have many trips; one trip can have many expenses.
 * Deleting a trip cascades and removes all its expenses.
 */
@Entity
@Table(name = "trips", indexes = {
        @Index(name = "idx_trips_user_id", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String destination;

    private LocalDate startDate;
    private LocalDate endDate;

    /** Trip budget stored as exact decimal — use BigDecimal for all monetary values. */
    @Column(precision = 15, scale = 2)
    private BigDecimal budget;

    /** ISO 4217 currency code, e.g. "INR", "USD", "EUR" */
    @Column(length = 3)
    private String currency;

    @Column(length = 1000)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Cascade ALL + orphanRemoval ensures expenses are deleted with the trip. */
    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Expense> expenses = new ArrayList<>();

    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<TripPhoto> photos = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
