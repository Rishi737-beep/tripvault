package com.travelmemoryvault.backend.security;

import com.travelmemoryvault.backend.repository.UserRepository;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Loads a {@link UserDetails} object from the database using the user's email address.
 * Spring Security calls this during authentication to look up the stored (hashed) password.
 */
@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        com.travelmemoryvault.backend.entity.User appUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("No user found with email: " + email));

        return User.builder()
                .username(appUser.getEmail())
                .password(appUser.getPassword())  // already BCrypt-encoded
                .roles("USER")
                .build();
    }
}
