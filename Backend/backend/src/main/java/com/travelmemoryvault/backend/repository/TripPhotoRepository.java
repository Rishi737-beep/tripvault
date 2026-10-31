package com.travelmemoryvault.backend.repository;

import com.travelmemoryvault.backend.entity.TripPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TripPhotoRepository extends JpaRepository<TripPhoto, Long> {

    List<TripPhoto> findByTripIdOrderByCreatedAtDesc(Long tripId);

    Optional<TripPhoto> findByIdAndTripId(Long id, Long tripId);
}
