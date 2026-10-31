package com.travelmemoryvault.backend.service;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LoginRateLimiter {

    private static final int MAX_FAILURES = 5;
    private static final int MAX_TRACKED_ADDRESSES = 10_000;
    private static final long WINDOW_MILLIS = Duration.ofMinutes(15).toMillis();

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public boolean isBlocked(String address) {
        Window window = windows.get(address);
        if (window == null) return false;
        if (System.currentTimeMillis() - window.startedAt() >= WINDOW_MILLIS) {
            windows.remove(address, window);
            return false;
        }
        return window.failures() >= MAX_FAILURES;
    }

    public void recordFailure(String address) {
        long now = System.currentTimeMillis();
        Window current = windows.get(address);
        if (current == null && windows.size() >= MAX_TRACKED_ADDRESSES) {
            windows.entrySet().removeIf(entry -> now - entry.getValue().startedAt() >= WINDOW_MILLIS);
            if (windows.size() >= MAX_TRACKED_ADDRESSES) return;
        }
        windows.compute(address, (key, previous) -> {
            if (previous == null || now - previous.startedAt() >= WINDOW_MILLIS) {
                return new Window(now, 1);
            }
            return new Window(previous.startedAt(), previous.failures() + 1);
        });
    }

    public void reset(String address) {
        windows.remove(address);
    }

    private record Window(long startedAt, int failures) {
    }
}
