# Travel Memory Vault: Frontend

React 18 + Vite. Design: travel-journal / ticket-stub look, system fonts only (no third-party requests).

## Run
    npm ci
    npm run dev        # http://localhost:5173, proxies /api -> http://localhost:8080
    npm run build      # production bundle in dist/ (CSP meta injected at build)

To test on a phone over the same Wi-Fi, run `.\run-app.ps1` from the repository root in PowerShell, then open the printed **Phone** URL. The frontend binds only to this PC's Wi-Fi address; the backend and database remain local to the PC. Allow access through Windows Firewall only on a trusted network if prompted.

## API contract this UI expects (adjust src/api.js if yours differs)
- POST /api/auth/register {name,email,password}
- POST /api/auth/login {email,password} -> {token}
- GET/POST /api/trips, GET /api/trips/{id}
- GET/POST /api/trips/{id}/expenses, DELETE /api/trips/{id}/expenses/{expenseId}
- Trip: id, destination, startDate, endDate, budget, currency, description
- Expense: id, category, amount, description, date

## Security decisions
- JWT lives in memory only (no localStorage/sessionStorage); refresh = log in again. Upgrade path: httpOnly + Secure + SameSite cookie issued by Spring.
- No dangerouslySetInnerHTML anywhere; React escapes all output.
- Strict CSP in production build (no inline scripts, same-origin connect only), no external fonts/CDNs, no-referrer.
- 15-minute idle auto-logout; any 401 clears the session.
- Server error bodies are never shown (generic messages only); 10s request timeout; path ids validated as integers.
- Client validation is UX only. The backend must enforce ownership (user can only touch their own trips/expenses), validation, and rate-limit login.

## Backend checklist (Spring)
- CORS: allow only your frontend origin if served separately.
- Send security headers (HSTS, X-Content-Type-Options, X-Frame-Options/frame-ancestors).
- Use BigDecimal for money; return 404 (not 403) for other users' resources.

## Trip photos (gallery)
Contract the frontend uses (all JWT-protected; change in `src/api.js` if yours differs):
- `GET    /api/trips/{id}/cover`                → cover image bytes
- `POST   /api/trips/{id}/cover`                → multipart field `file`
- `DELETE /api/trips/{id}/cover`
- `GET    /api/trips/{id}/photos`             → `[{ id, ... }]` (metadata only)
- `GET    /api/trips/{id}/photos/{photoId}`   → image bytes (`image/jpeg|png|webp`)
- `POST   /api/trips/{id}/photos`             → multipart field `file`; returns `{ id, ... }`
- `DELETE /api/trips/{id}/photos/{photoId}`
Images are fetched with the Authorization header and shown from blob URLs, so no public/guessable image URLs are needed.

Backend must also: check ownership on every call; validate size and magic bytes (not just Content-Type); reject SVG; re-encode images and strip EXIF (GPS location!); store under random names outside the web root; serve with `X-Content-Type-Options: nosniff`; set a request size limit (spring.servlet.multipart.max-file-size).

Cover images and gallery uploads currently use local filesystem storage. Production hosting needs a durable persistent volume or object storage; ephemeral container filesystems can lose uploads during redeployment.
