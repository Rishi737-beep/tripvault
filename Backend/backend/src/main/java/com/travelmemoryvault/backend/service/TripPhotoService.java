package com.travelmemoryvault.backend.service;

import com.travelmemoryvault.backend.dto.TripPhotoResponse;
import com.travelmemoryvault.backend.entity.Trip;
import com.travelmemoryvault.backend.entity.TripPhoto;
import com.travelmemoryvault.backend.entity.User;
import com.travelmemoryvault.backend.exception.ResourceNotFoundException;
import com.travelmemoryvault.backend.exception.PhotoTooLargeException;
import com.travelmemoryvault.backend.repository.TripPhotoRepository;
import com.travelmemoryvault.backend.repository.TripRepository;
import com.travelmemoryvault.backend.repository.UserRepository;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;

@Service
public class TripPhotoService {

    private static final Logger log = LoggerFactory.getLogger(TripPhotoService.class);
    private static final long MAX_IMAGE_PIXELS = 20_000_000L;

    private final TripPhotoRepository photoRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final PhotoStorage photoStorage;
    private final long maxFileSize;

    public TripPhotoService(TripPhotoRepository photoRepository, TripRepository tripRepository,
                            UserRepository userRepository, PhotoStorage photoStorage,
                            @Value("${app.photo-storage.max-file-size-bytes:5242880}") long maxFileSize) {
        this.photoRepository = photoRepository;
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
        this.photoStorage = photoStorage;
        this.maxFileSize = maxFileSize;
    }

    @Transactional
    public TripPhotoResponse upload(Long tripId, String email, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Choose an image to upload.");
        }
        if (file.getSize() > maxFileSize) {
            throw new PhotoTooLargeException();
        }

        byte[] content = file.getBytes();
        ImageFormat format = validateImage(content);
        User user = findUser(email);
        Trip trip = tripRepository.findByIdAndUserId(tripId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found."));
        String storageKey = photoStorage.store(content, format.extension());
        try {
            TripPhoto photo = TripPhoto.builder()
                    .storageKey(storageKey)
                    .contentType(format.contentType())
                    .fileSize(content.length)
                    .trip(trip)
                    .build();
            return toResponse(photoRepository.saveAndFlush(photo));
        } catch (RuntimeException ex) {
            try {
                photoStorage.delete(storageKey);
            } catch (IOException cleanupException) {
                ex.addSuppressed(cleanupException);
                log.error("Failed to clean up photo after metadata persistence failed ({}).",
                        cleanupException.getClass().getSimpleName());
            }
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public List<TripPhotoResponse> list(Long tripId, String email) {
        Trip trip = findOwnedTrip(tripId, email);
        return photoRepository.findByTripIdOrderByCreatedAtDesc(trip.getId()).stream()
                .map(TripPhotoService::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public StoredPhoto read(Long tripId, Long photoId, String email) throws IOException {
        Trip trip = findOwnedTrip(tripId, email);
        TripPhoto photo = photoRepository.findByIdAndTripId(photoId, trip.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found."));
        return new StoredPhoto(photoStorage.read(photo.getStorageKey()), photo.getContentType());
    }

    @Transactional
    public void delete(Long tripId, Long photoId, String email) {
        Trip trip = findOwnedTrip(tripId, email);
        TripPhoto photo = photoRepository.findByIdAndTripId(photoId, trip.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found."));
        String storageKey = photo.getStorageKey();
        photoRepository.delete(photo);
        photoRepository.flush();
        deleteAfterCommit(storageKey);
    }

    public void deleteStoredPhoto(String storageKey) {
        try {
            photoStorage.delete(storageKey);
        } catch (IOException ex) {
            log.error("Photo metadata was deleted, but the stored image could not be removed ({}).",
                    ex.getClass().getSimpleName());
        }
    }

    public void deleteAfterCommit(String storageKey) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deleteStoredPhoto(storageKey);
            }
        });
    }

    private Trip findOwnedTrip(Long tripId, String email) {
        User user = findUser(email);
        return tripRepository.findByIdAndUserId(tripId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found."));
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }

    private ImageFormat validateImage(byte[] content) throws IOException {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(content))) {
            if (input == null) {
                throw new IllegalArgumentException("The selected file is not a supported image.");
            }
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw new IllegalArgumentException("The selected file is not a supported image.");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                ImageFormat imageFormat = switch (format) {
                    case "png" -> new ImageFormat("png", "image/png");
                    case "jpeg", "jpg" -> new ImageFormat("jpg", "image/jpeg");
                    case "gif" -> new ImageFormat("gif", "image/gif");
                    default -> throw new IllegalArgumentException("Only JPEG, PNG, and GIF images are supported.");
                };
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width <= 0 || height <= 0 || (long) width * height > MAX_IMAGE_PIXELS) {
                    throw new IllegalArgumentException("Image dimensions are too large.");
                }
                if (reader.read(0) == null) {
                    throw new IllegalArgumentException("The selected file is not a valid image.");
                }
                return imageFormat;
            } finally {
                reader.dispose();
            }
        }
    }

    private static TripPhotoResponse toResponse(TripPhoto photo) {
        return new TripPhotoResponse(photo.getId(), photo.getContentType(),
                photo.getFileSize(), photo.getCreatedAt());
    }

    public record StoredPhoto(byte[] content, String contentType) {
    }

    private record ImageFormat(String extension, String contentType) {
    }
}
