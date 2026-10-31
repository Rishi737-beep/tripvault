package com.travelmemoryvault.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.UUID;

@Component
public class LocalPhotoStorage implements PhotoStorage {

    private final Path root;

    public LocalPhotoStorage(@Value("${app.photo-storage.directory:./data/private-photos}") String directory) {
        root = Path.of(directory).toAbsolutePath().normalize();
    }

    @Override
    public String store(byte[] content, String extension) throws IOException {
        Files.createDirectories(root);
        String storageKey = UUID.randomUUID() + "." + extension;
        Files.write(resolve(storageKey), content, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
        return storageKey;
    }

    @Override
    public byte[] read(String storageKey) throws IOException {
        return Files.readAllBytes(resolve(storageKey));
    }

    @Override
    public void delete(String storageKey) throws IOException {
        Files.deleteIfExists(resolve(storageKey));
    }

    private Path resolve(String storageKey) {
        Path path = root.resolve(storageKey).normalize();
        if (!path.getParent().equals(root)) {
            throw new IllegalArgumentException("Invalid photo storage key.");
        }
        return path;
    }
}
