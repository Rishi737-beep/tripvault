package com.travelmemoryvault.backend.repository;

import com.travelmemoryvault.backend.entity.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TripRepository extends JpaRepository<Trip, Long> {

    /** Fetches all trips owned by a given user, ordered by creation date descending. */
    List<Trip> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** Finds a trip by ID only if it belongs to the specified user — safe ownership check. */
    Optional<Trip> findByIdAndUserId(Long id, Long userId);

    /** Checks if a trip exists for a user — used for lightweight ownership verification. */
    boolean existsByIdAndUserId(Long id, Long userId);
}
