package com.travelmemoryvault.backend.controller;

import com.travelmemoryvault.backend.dto.TripPhotoResponse;
import com.travelmemoryvault.backend.service.TripPhotoService;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/trips/{tripId}/photos")
public class TripPhotoController {

    private final TripPhotoService tripPhotoService;

    public TripPhotoController(TripPhotoService tripPhotoService) {
        this.tripPhotoService = tripPhotoService;
    }

    @GetMapping
    public List<TripPhotoResponse> list(@PathVariable Long tripId,
                                        @AuthenticationPrincipal UserDetails principal) {
        return tripPhotoService.list(tripId, principal.getUsername());
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public TripPhotoResponse upload(@PathVariable Long tripId,
                                    @RequestPart("file") MultipartFile file,
                                    @AuthenticationPrincipal UserDetails principal) throws IOException {
        return tripPhotoService.upload(tripId, principal.getUsername(), file);
    }

    @GetMapping("/{photoId}")
    public ResponseEntity<byte[]> read(@PathVariable Long tripId, @PathVariable Long photoId,
                                       @AuthenticationPrincipal UserDetails principal) throws IOException {
        TripPhotoService.StoredPhoto photo = tripPhotoService.read(tripId, photoId, principal.getUsername());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photo.contentType()))
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .body(photo.content());
    }

    @DeleteMapping("/{photoId}")
    public ResponseEntity<Void> delete(@PathVariable Long tripId, @PathVariable Long photoId,
                                       @AuthenticationPrincipal UserDetails principal) {
        tripPhotoService.delete(tripId, photoId, principal.getUsername());
        return ResponseEntity.noContent().build();
    }
}
