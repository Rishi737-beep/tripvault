package com.travelmemoryvault.backend.service;

import java.io.IOException;

public interface PhotoStorage {

    String store(byte[] content, String extension) throws IOException;

    byte[] read(String storageKey) throws IOException;

    void delete(String storageKey) throws IOException;
}
