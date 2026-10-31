package com.travelmemoryvault.backend.service;

import com.travelmemoryvault.backend.dto.RegisterRequest;
import com.travelmemoryvault.backend.entity.User;
import com.travelmemoryvault.backend.exception.DuplicateEmailException;
import com.travelmemoryvault.backend.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User registerUser(RegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmail(email)) {
            throw new DuplicateEmailException("Email already exists!");
        }

        User user = new User();

        user.setFullName(request.getFullName().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        try {
            return userRepository.save(user);
        } catch (DataIntegrityViolationException ex) {
            if (userRepository.existsByEmail(email)) {
                throw new DuplicateEmailException("Email already exists!");
            }
            throw ex;
        }
    }
}