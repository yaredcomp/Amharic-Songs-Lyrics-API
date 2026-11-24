# Amharic Lyrics API Platform

Production-ready SaaS REST API, Developer Portal, and Admin Console for searching, browsing, and managing Amharic music lyrics.

## Features

- **Public REST API (`/api/v1`)**: Paginated search across Ge'ez script, transliteration, artist, album, and lyrics body; artist catalog discovery; popular and recent endpoints; protected by `x-api-key` (`amlp_live_...`) with SHA-256 hashing and per-key daily quota enforcement.
- **Dual Authentication & RBAC**: JWT access/refresh tokens with refresh token rotation (`scrypt` password hashing) plus Google Sign-In via Firebase Auth, role-based access control (`USER`, `ADMIN`), and secure first-run admin bootstrap.
- **Idempotency & Audit Logging**: `Idempotency-Key` support across mutating developer and admin endpoints (`POST`, `PUT`, `PATCH`, `DELETE`), plus persistent audit trails for lyrics and key lifecycle events.
- **OpenAPI 3.1 & Swagger UI**: Interactive documentation served at `/api/docs`, raw OpenAPI spec at `/api/openapi.yaml` and `/api/openapi.json`, and downloadable Postman collection at `/api/postman-collection.json`.
- **Developer Portal & Admin Console**: Built with React 19 and the Astryx Design System (`@astryxdesign/core`), supporting light and dark themes, live API Explorer playground, API key management, usage analytics, and admin catalog management.

## Architecture

- **Web & API Server**: Single Express + Vite/React server (`server.ts` / `src/server/app.ts`) bound to `0.0.0.0:$PORT` (default `3000`).
- **Database**: PostgreSQL via Drizzle ORM (`src/db/schema.ts`) in the live Cloud SQL runtime, plus standalone Prisma export artifacts (`prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`) for Render Managed PostgreSQL deployments.
- **Security**: Helmet CSP/HSTS/XSS protections, strict `X-Frame-Options: DENY` on API routes, CORS allowlist, Zod input validation, rate limiting, and in-memory token management on the client.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables based on `.env.example`:
   - `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME` for PostgreSQL
   - `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (unique random secrets of at least 32 characters)
   - `ADMIN_EMAIL` (optional allowlisted, verified Firebase administrator email)
   - `ADMIN_PASSCODE` (required to enable first-run password-based admin bootstrap; use a unique random secret of at least 32 characters)
   - For Docker Compose, set `SQL_PASSWORD`; the database is private to the Compose network and is not published on the host.
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open the portal at `http://localhost:3000` and Swagger UI at `http://localhost:3000/api/docs`.

## Testing & Verification

Run unit and Supertest API integration tests:

```bash
npm test
```

Run TypeScript static type checking and production bundle build:

```bash
npm run lint
npm run build
```

## Docker

Run the platform and PostgreSQL locally with Docker Compose:

```bash
docker compose up --build
```

## API Quickstart

1. Sign in or register in the Developer Portal and create an API key under **API Keys**.
2. Query lyrics using your key:
   ```bash
   curl -H "x-api-key: amlp_live_your_key" \
     "http://localhost:3000/api/v1/lyrics?search=Tizita&limit=5"
   ```
3. Check liveness and database readiness:
   - `GET /health`
   - `GET /health/live`
   - `GET /health/ready`
