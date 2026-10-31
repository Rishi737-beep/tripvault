package com.travelmemoryvault.backend.repository;

import com.travelmemoryvault.backend.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    /** Returns all expenses for a trip, ordered by date descending. */
    List<Expense> findByTripIdOrderByExpenseDateDesc(Long tripId);

    /** Finds a specific expense only if it belongs to the given trip. */
    Optional<Expense> findByIdAndTripId(Long id, Long tripId);

    /**
     * Sums expense amounts by currency for a given trip.
     * Returns pairs: [currencyCode, totalAmount].
     * NEVER mix currencies — this query groups by currency code.
     */
    @Query("SELECT e.currency, SUM(e.amount) FROM Expense e " +
            "WHERE e.trip.id = :tripId GROUP BY e.currency")
    List<Object[]> sumAmountGroupedByCurrency(@Param("tripId") Long tripId);

    /** Total expense count for a trip — useful for summary stats. */
    long countByTripId(Long tripId);

    boolean existsByTripIdAndExpenseDateBefore(Long tripId, LocalDate date);

    boolean existsByTripIdAndExpenseDateAfter(Long tripId, LocalDate date);
}
