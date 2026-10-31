# Travel Memory Vault — Project Report

## Overview

Travel Memory Vault is a personal travel organizer. Users can create an account, record trips, set a budget and currency for each trip, and track dated expenses against that trip. The interface presents trips as travel-ticket cards and shows a budget-versus-spending summary for each trip.

The application provides a private trip and expense tracker, with persistent, trip-scoped photo uploads.

## What users can do

1. **Create an account or log in.** Registration takes a name, email, and password. A successful registration signs the user in automatically. Login returns a JWT.
2. **Create and review trips.** A trip records a destination, start and end dates, budget, currency, and optional notes.
3. **Track trip expenses.** Each expense has a category, amount, description, and date. The date must be within the trip dates.
4. **Review spending.** The trip page totals expenses, calculates the remaining budget, and indicates when spending is over budget.
5. **Delete expenses.** Users can remove an expense from one of their trips.
6. **Manage trips.** Users can edit trips, as long as existing expenses remain within the edited dates, or delete a trip and its associated expenses/photos.
7. **Save private trip photos.** JPEG, PNG, and GIF files are content-checked and stored outside MySQL; authenticated users can view and delete photos for trips they own.

## How it works

```text
Browser (React + Vite, port 5173)
    │  JSON requests to /api/*
    ▼
Vite development proxy
    │  forwards to localhost:8080
    ▼
Spring Boot REST API
    │  validates requests, checks JWT and resource ownership
    ▼
MySQL database (travel_memory_vault)
```

- **Frontend:** React 18, React Router, and Vite. Shared HTTP functions are in `Frontend/travel-memory-vault-frontend/src/api.js`; the Vite development proxy forwards `/api` requests to the backend.
- **Backend:** Java 25 LTS and Spring Boot. Controllers expose the REST API; services and Spring Data JPA repositories handle user and data operations.
- **Database:** MySQL stores users, trips, and expenses. Monetary values use decimal types on the backend.
- **Authentication:** Passwords are BCrypt-hashed. Login creates a signed JWT. The frontend keeps the token in memory and sends it as a bearer token on protected API requests. Refreshing the page clears the session, so log in again.
- **Ownership:** Trip and expense operations are scoped to the signed-in user; another user's trip is not available through that user's API requests.
- **Photo storage:** The backend keeps metadata and trip relationships in MySQL and files in the configurable `PHOTO_STORAGE_PATH`; photo bytes are only served after JWT and trip ownership checks.

## Main API routes

| Method | Route | Purpose | Access |
|---|---|---|---|
| POST | `/api/auth/register` | Create an account with `fullName`, `email`, and `password` | Public |
| POST | `/api/auth/login` | Authenticate and receive a JWT | Public |
| GET | `/api/trips` | List the signed-in user's trips | JWT required |
| POST | `/api/trips` | Create a trip | JWT required |
| GET | `/api/trips/{tripId}` | Read one owned trip | JWT required |
| PUT | `/api/trips/{tripId}` | Update an owned trip | JWT required |
| DELETE | `/api/trips/{tripId}` | Delete an owned trip and its expenses/photos | JWT required |
| GET | `/api/trips/{tripId}/expenses` | List expenses for an owned trip | JWT required |
| POST | `/api/trips/{tripId}/expenses` | Add an expense to an owned trip | JWT required |
| DELETE | `/api/trips/{tripId}/expenses/{expenseId}` | Delete an expense from an owned trip | JWT required |
| GET/POST | `/api/trips/{tripId}/photos` | List/upload photos for an owned trip | JWT required |
| GET/DELETE | `/api/trips/{tripId}/photos/{photoId}` | Read/delete an owned trip photo | JWT required |

## Running locally

Prerequisites: Java 25 LTS, Node.js/npm, and a running MySQL server with a `travel_memory_vault` database and a user whose credentials match the configured settings. Set a strong Base64-encoded `JWT_SECRET` (at least 32 random bytes) before starting the backend; the application no longer contains a fallback JWT signing secret.

1. In PowerShell, run the local backend launcher. It prompts for the MySQL username and masks the password; it generates an ephemeral JWT secret and does not save credentials:

   ```powershell
   Set-Location 'C:\Users\rishi\OneDrive\Desktop\Travel Money\travel-memory-vault-main\Backend'
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\run-local.ps1
   ```

2. In another terminal, start the frontend:

   ```powershell
   Set-Location 'C:\Users\rishi\OneDrive\Desktop\Travel Money\travel-memory-vault-main\Frontend\travel-memory-vault-frontend'
   npm install
   npm run dev -- --host 127.0.0.1
   ```

3. Open `http://127.0.0.1:5173`. The frontend proxies API requests to `http://localhost:8080`.

The backend database URL, username, password, and port use `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, and `PORT`. The required JWT secret and its expiry use `JWT_SECRET` and `JWT_EXPIRATION_MS`. `Backend/backend/.env.example` contains placeholders only; Spring does not automatically load it.

For production, set `SPRING_PROFILES_ACTIVE=prod`, provide every required environment variable, use HTTPS at the trusted reverse proxy, configure a private persistent photo volume, and set `CORS_ALLOWED_ORIGINS` to the exact deployed frontend origin(s). Apply the additive photo-table SQL before starting with the `prod` profile.

## Validation and tests

- Backend test command: `.\mvnw.cmd -f .\backend\pom.xml test` from the `Backend` directory.
- Frontend production build: `npm run build` from `Frontend/travel-memory-vault-frontend`.
- The backend tests use isolated H2 and exercise registration, login throttling, trip/expense CRUD, date constraints, private photo upload and ownership checks, and deletion. They do not certify a production MySQL migration or deployment.

## Current scope and considerations

- There is no password-reset, email-verification, or profile-editing flow.
- Login throttling is in-memory and per backend instance. Production deployments with multiple backend instances need a shared rate-limiting layer or gateway.
- The frontend's JWT is intentionally memory-only, which reduces persistence in browser storage but requires users to log in after a refresh.
- Hibernate schema update remains enabled for local development. For production, apply the additive MySQL script at `Backend/backend/src/main/resources/db/manual/V001__create_trip_photos.sql` before starting with the `prod` profile; production uses Hibernate schema validation rather than mutation.
- Photo storage is local by default. Back it up separately from MySQL, restrict filesystem access to the backend service account, and configure a private durable volume or object-store adapter before deploying multiple instances.
- A filesystem failure during post-commit photo cleanup is logged; the metadata is already removed, so an inaccessible orphaned file may need administrative cleanup.
- The backend includes compatibility handling for the existing legacy expense foreign key to the old `travels` table. It removes that obsolete constraint, not travel or expense records.
