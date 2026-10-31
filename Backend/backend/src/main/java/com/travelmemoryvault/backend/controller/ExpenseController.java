package com.travelmemoryvault.backend.controller;

import com.travelmemoryvault.backend.dto.ExpenseRequest;
import com.travelmemoryvault.backend.dto.ExpenseResponse;
import com.travelmemoryvault.backend.entity.Expense;
import com.travelmemoryvault.backend.entity.Trip;
import com.travelmemoryvault.backend.entity.User;
import com.travelmemoryvault.backend.exception.ResourceNotFoundException;
import com.travelmemoryvault.backend.repository.ExpenseRepository;
import com.travelmemoryvault.backend.repository.TripRepository;
import com.travelmemoryvault.backend.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trips/{tripId}/expenses")
public class ExpenseController {

    private final ExpenseRepository expenseRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;

    public ExpenseController(ExpenseRepository expenseRepository, TripRepository tripRepository,
                             UserRepository userRepository) {
        this.expenseRepository = expenseRepository;
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<ExpenseResponse> getExpenses(@PathVariable Long tripId,
                                             @AuthenticationPrincipal UserDetails principal) {
        User user = getUser(principal);
        Trip trip = getTrip(tripId, user);
        return expenseRepository.findByTripIdOrderByExpenseDateDesc(trip.getId()).stream()
                .map(ExpenseController::toResponse)
                .toList();
    }

    @PostMapping
    public ExpenseResponse createExpense(@PathVariable Long tripId,
                                         @Valid @RequestBody ExpenseRequest request,
                                         @AuthenticationPrincipal UserDetails principal) {
        User user = getUser(principal);
        Trip trip = getTrip(tripId, user);
        if (request.date().isBefore(trip.getStartDate()) || request.date().isAfter(trip.getEndDate())) {
            throw new IllegalArgumentException("Expense date must fall within the trip dates.");
        }

        Expense expense = Expense.builder()
                .category(request.category())
                .amount(request.amount())
                .notes(request.description())
                .expenseDate(request.date())
                .currency(trip.getCurrency())
                .trip(trip)
                .travelId(trip.getId())
                .user(user)
                .build();
        return toResponse(expenseRepository.save(expense));
    }

    @DeleteMapping("/{expenseId}")
    public ResponseEntity<Void> deleteExpense(@PathVariable Long tripId,
                                              @PathVariable Long expenseId,
                                              @AuthenticationPrincipal UserDetails principal) {
        User user = getUser(principal);
        Trip trip = getTrip(tripId, user);
        Expense expense = expenseRepository.findByIdAndTripId(expenseId, trip.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found."));
        expenseRepository.delete(expense);
        return ResponseEntity.noContent().build();
    }

    private User getUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }

    private Trip getTrip(Long tripId, User user) {
        return tripRepository.findByIdAndUserId(tripId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found."));
    }

    private static ExpenseResponse toResponse(Expense expense) {
        return new ExpenseResponse(expense.getId(), expense.getCategory(), expense.getAmount(),
                expense.getNotes(), expense.getExpenseDate());
    }
}
