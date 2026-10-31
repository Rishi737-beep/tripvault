package com.travelmemoryvault.backend.controller;

import com.travelmemoryvault.backend.dto.TripRequest;
import com.travelmemoryvault.backend.dto.TripResponse;
import com.travelmemoryvault.backend.entity.Trip;
import com.travelmemoryvault.backend.entity.User;
import com.travelmemoryvault.backend.exception.ResourceNotFoundException;
import com.travelmemoryvault.backend.repository.ExpenseRepository;
import com.travelmemoryvault.backend.repository.TripPhotoRepository;
import com.travelmemoryvault.backend.repository.TripRepository;
import com.travelmemoryvault.backend.repository.UserRepository;
import com.travelmemoryvault.backend.service.TripPhotoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trips")
public class TripController {

    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final ExpenseRepository expenseRepository;
    private final TripPhotoRepository photoRepository;
    private final TripPhotoService photoService;

    public TripController(TripRepository tripRepository, UserRepository userRepository,
                          ExpenseRepository expenseRepository, TripPhotoRepository photoRepository,
                          TripPhotoService photoService) {
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
        this.expenseRepository = expenseRepository;
        this.photoRepository = photoRepository;
        this.photoService = photoService;
    }

    @GetMapping
    public List<TripResponse> getTrips(@AuthenticationPrincipal UserDetails principal) {
        User user = getUser(principal);
        return tripRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(TripController::toResponse)
                .toList();
    }

    @GetMapping("/{tripId}")
    public TripResponse getTrip(@PathVariable Long tripId, @AuthenticationPrincipal UserDetails principal) {
        User user = getUser(principal);
        return toResponse(findTrip(tripId, user.getId()));
    }

    @PostMapping
    public TripResponse createTrip(@Valid @RequestBody TripRequest request,
                                   @AuthenticationPrincipal UserDetails principal) {
        validateDates(request);

        User user = getUser(principal);
        Trip trip = Trip.builder()
                .destination(request.destination().trim())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .budget(request.budget())
                .currency(request.currency())
                .description(request.description())
                .user(user)
                .build();
        return toResponse(tripRepository.save(trip));
    }

    @PutMapping("/{tripId}")
    @Transactional
    public TripResponse updateTrip(@PathVariable Long tripId, @Valid @RequestBody TripRequest request,
                                   @AuthenticationPrincipal UserDetails principal) {
        validateDates(request);
        User user = getUser(principal);
        Trip trip = findTrip(tripId, user.getId());
        if (expenseRepository.existsByTripIdAndExpenseDateBefore(tripId, request.startDate())
                || expenseRepository.existsByTripIdAndExpenseDateAfter(tripId, request.endDate())) {
            throw new IllegalArgumentException("Trip dates cannot exclude existing expense dates.");
        }

        trip.setDestination(request.destination().trim());
        trip.setStartDate(request.startDate());
        trip.setEndDate(request.endDate());
        trip.setBudget(request.budget());
        trip.setCurrency(request.currency());
        trip.setDescription(request.description());
        return toResponse(tripRepository.save(trip));
    }

    @DeleteMapping("/{tripId}")
    @Transactional
    public ResponseEntity<Void> deleteTrip(
            @PathVariable Long tripId, @AuthenticationPrincipal UserDetails principal) {
        User user = getUser(principal);
        Trip trip = findTrip(tripId, user.getId());
        List<String> storageKeys = photoRepository.findByTripIdOrderByCreatedAtDesc(tripId).stream()
                .map(photo -> photo.getStorageKey())
                .toList();
        tripRepository.delete(trip);
        for (String storageKey : storageKeys) {
            photoService.deleteAfterCommit(storageKey);
        }
        return ResponseEntity.noContent().build();
    }

    private Trip findTrip(Long tripId, Long userId) {
        return tripRepository.findByIdAndUserId(tripId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found."));
    }

    private User getUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }

    private static void validateDates(TripRequest request) {
        if (request.endDate().isBefore(request.startDate())) {
            throw new IllegalArgumentException("End date must be on or after start date.");
        }
    }

    private static TripResponse toResponse(Trip trip) {
        return new TripResponse(trip.getId(), trip.getDestination(), trip.getStartDate(),
                trip.getEndDate(), trip.getBudget(), trip.getCurrency(), trip.getDescription());
    }
}
