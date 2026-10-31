package com.travelmemoryvault.backend.controller;

import com.travelmemoryvault.backend.dto.RegisterRequest;
import com.travelmemoryvault.backend.dto.RegisterResponse;
import com.travelmemoryvault.backend.dto.LoginRequest;
import com.travelmemoryvault.backend.dto.LoginResponse;
import com.travelmemoryvault.backend.entity.User;
import com.travelmemoryvault.backend.repository.UserRepository;
import com.travelmemoryvault.backend.security.CustomUserDetailsService;
import com.travelmemoryvault.backend.security.JwtUtil;
import com.travelmemoryvault.backend.service.UserService;
import com.travelmemoryvault.backend.service.LoginRateLimiter;
import com.travelmemoryvault.backend.exception.TooManyLoginAttemptsException;

import jakarta.validation.Valid;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Locale;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final LoginRateLimiter loginRateLimiter;

    public AuthController(UserService userService, AuthenticationManager authenticationManager,
                          CustomUserDetailsService userDetailsService, UserRepository userRepository,
                          JwtUtil jwtUtil, LoginRateLimiter loginRateLimiter) {
        this.userService = userService;
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.loginRateLimiter = loginRateLimiter;
    }

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> registerUser(
            @Valid @RequestBody RegisterRequest request) {

        User user = userService.registerUser(request);

        RegisterResponse response = RegisterResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .createdAt(user.getCreatedAt())
                .message("User registered successfully.")
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request,
                                               HttpServletRequest httpRequest) {
        String remoteAddress = httpRequest.getRemoteAddr();
        if (loginRateLimiter.isBlocked(remoteAddress)) {
            throw new TooManyLoginAttemptsException();
        }
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword()));
        } catch (AuthenticationException ex) {
            loginRateLimiter.recordFailure(remoteAddress);
            throw ex;
        }
        loginRateLimiter.reset(remoteAddress);

        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Authenticated user was not found."));

        LoginResponse response = LoginResponse.builder()
                .token(jwtUtil.generateToken(userDetails))
                .tokenType("Bearer")
                .userId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .issuedAt(LocalDateTime.now())
                .build();
        return ResponseEntity.ok(response);
    }
}