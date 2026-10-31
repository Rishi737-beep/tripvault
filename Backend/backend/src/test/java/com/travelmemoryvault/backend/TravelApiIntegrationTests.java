package com.travelmemoryvault.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Base64;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.emptyString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ActiveProfiles("test")
class TravelApiIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void registersLogsInAndManagesTripsAndExpenses() throws Exception {
        String email = "test-" + UUID.randomUUID() + "@example.test";
        String password = "test-password-123";

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("fullName", "Integration Test", "email", email, "password", password))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("fullName", "Integration Test", "email", email, "password", password))))
                .andExpect(status().isConflict());

        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email.toUpperCase(java.util.Locale.ROOT), "password", password))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", not(emptyString())))
                .andReturn();
        String token = objectMapper.readTree(login.getResponse().getContentAsString()).get("token").asText();

        mockMvc.perform(get("/api/trips").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
        mockMvc.perform(get("/api/trips").header("Authorization", "Bearer malformed"))
                .andExpect(status().isUnauthorized());

        MvcResult tripResult = mockMvc.perform(post("/api/trips")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "destination", "Test City",
                                "startDate", "2030-01-10",
                                "endDate", "2030-01-15",
                                "budget", 500.00,
                                "currency", "INR",
                                "description", "Integration test"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.destination").value("Test City"))
                .andReturn();
        long tripId = objectMapper.readTree(tripResult.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(put("/api/trips/{tripId}", tripId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "destination", "Updated City",
                                "startDate", "2030-01-10",
                                "endDate", "2030-01-15",
                                "budget", 600.00,
                                "currency", "INR",
                                "description", "Updated description"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.destination").value("Updated City"));

        mockMvc.perform(post("/api/trips/{tripId}/expenses", tripId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "category", "FOOD",
                                "amount", 25.50,
                                "description", "Lunch",
                                "date", "2030-01-11"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("Lunch"));

        mockMvc.perform(put("/api/trips/{tripId}", tripId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "destination", "Updated City",
                                "startDate", "2030-01-12",
                                "endDate", "2030-01-15",
                                "budget", 600.00,
                                "currency", "INR",
                                "description", "Updated description"))))
                .andExpect(status().isBadRequest());

        byte[] png = Base64.getDecoder().decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jzQAAAABJRU5ErkJggg==");
        mockMvc.perform(multipart("/api/trips/{tripId}/photos", tripId)
                        .file(new MockMultipartFile("file", "not-image.png", "image/png",
                                "not an image".getBytes(java.nio.charset.StandardCharsets.UTF_8)))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
        mockMvc.perform(multipart("/api/trips/{tripId}/photos", tripId)
                        .file(new MockMultipartFile("file", "too-large.png", "image/png",
                                new byte[5 * 1024 * 1024 + 1]))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isPayloadTooLarge());
        MockMultipartFile photo = new MockMultipartFile("file", "misleading.txt", "text/plain", png);
        MvcResult photoResult = mockMvc.perform(multipart("/api/trips/{tripId}/photos", tripId)
                        .file(photo)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contentType").value("image/png"))
                .andReturn();
        long photoId = objectMapper.readTree(photoResult.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/trips/{tripId}/photos/{photoId}", tripId, photoId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content()
                        .contentType(MediaType.IMAGE_PNG));

        String otherToken = registerAndLogin("other-" + UUID.randomUUID() + "@example.test");
        mockMvc.perform(get("/api/trips/{tripId}/photos/{photoId}", tripId, photoId)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound());
        mockMvc.perform(put("/api/trips/{tripId}", tripId)
                        .header("Authorization", "Bearer " + otherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "destination", "Unauthorized",
                                "startDate", "2030-01-10",
                                "endDate", "2030-01-15",
                                "budget", 600.00,
                                "currency", "INR",
                                "description", ""))))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/trips/{tripId}", tripId)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/trips/{tripId}/photos/{photoId}", tripId, photoId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        MvcResult expenses = mockMvc.perform(get("/api/trips/{tripId}/expenses", tripId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andReturn();
        long expenseId = objectMapper.readTree(expenses.getResponse().getContentAsString())
                .get(0).get("id").asLong();

        mockMvc.perform(delete("/api/trips/{tripId}/expenses/{expenseId}", tripId, expenseId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(delete("/api/trips/{tripId}", tripId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/trips/{tripId}", tripId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void rateLimitsRepeatedFailedLogins() throws Exception {
        String email = "limited-" + UUID.randomUUID() + "@example.test";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("fullName", "Rate Limit Test", "email", email,
                                "password", "test-password-123"))))
                .andExpect(status().isOk());

        for (int attempt = 0; attempt < 5; attempt++) {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json(Map.of("email", email, "password", "incorrect-password"))))
                    .andExpect(status().isUnauthorized());
        }
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", "incorrect-password"))))
                .andExpect(status().isTooManyRequests())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string("Retry-After", "900"));
    }

    private String registerAndLogin(String email) throws Exception {
        String password = "test-password-123";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("fullName", "Other User", "email", email, "password", password))))
                .andExpect(status().isOk());
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", password))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }
}
