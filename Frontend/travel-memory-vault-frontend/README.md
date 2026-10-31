# Travel Memory Vault: Frontend

React 18 + Vite. Design: travel-journal / ticket-stub look, system fonts only (no third-party requests).

## Run
    npm install
    npm run dev        # http://localhost:5173, proxies /api -> http://localhost:8080
    npm run build      # production bundle in dist/ (CSP meta injected at build)

## API contract this UI expects (adjust src/api.js if yours differs)
- POST /api/auth/register {fullName,email,password}
- POST /api/auth/login {email,password} -> {token}
- GET/POST /api/trips, GET/PUT/DELETE /api/trips/{id}
- GET/POST /api/trips/{id}/expenses, DELETE /api/trips/{id}/expenses/{expenseId}
- GET/POST /api/trips/{id}/photos, GET/DELETE /api/trips/{id}/photos/{photoId}
- Trip: id, destination, startDate, endDate, budget, currency, description
- Expense: id, category, amount, description, date
- Photos are private, authenticated JPEG/PNG/GIF uploads (maximum 5 MB each).

## Security decisions
- JWT lives in memory only (no localStorage/sessionStorage); refresh = log in again. Upgrade path: httpOnly + Secure + SameSite cookie issued by Spring.
- No dangerouslySetInnerHTML anywhere; React escapes all output.
- Strict CSP in production build (no inline scripts, same-origin connect only), no external fonts/CDNs, no-referrer.
- 15-minute idle auto-logout; any 401 clears the session.
- Server error bodies are never shown (generic messages only); 10s request timeout; path ids validated as integers.
- Client validation is UX only. The backend must enforce ownership (user can only touch their own trips/expenses), validation, and rate-limit login.

## Backend checklist (Spring)
- CORS: configure `CORS_ALLOWED_ORIGINS` to the exact frontend origins if served separately.
- Send security headers (HSTS, X-Content-Type-Options, X-Frame-Options/frame-ancestors).
- Use BigDecimal for money; return 404 (not 403) for other users' resources.
- The in-memory login limiter is per backend instance; use a shared gateway/store for multi-instance production.
