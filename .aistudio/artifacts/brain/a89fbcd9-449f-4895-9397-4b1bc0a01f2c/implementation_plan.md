# Amharic Lyrics API Platform — Implementation Plan

A production-ready SaaS developer platform and REST API for querying, browsing, and managing Amharic music lyrics in Ethiopic script and Latin transliteration, combining a live Express + React portal backed by Cloud SQL PostgreSQL with exportable Render, Docker, OpenAPI 3.1, and CI/CD configurations.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Cloud SQL Provisioning & Authentication Gate**: Upon your approval of this plan, the first implementation step will check project eligibility and present the interactive Cloud SQL setup prompt so you can authorize the hosted PostgreSQL database and Google Sign-In configuration.

- **Confirmed Runtime Architecture**: Live single-server Vite, React 19, and Express.js application running on port `3000` for immediate preview, paired with complete Render (`render.yaml`), Docker, GitHub Actions, OpenAPI 3.1, and Postman deliverables for standalone deployment.
- **Confirmed Persistence & Auth**: Hosted PostgreSQL (Cloud SQL) using Drizzle ORM for the live runtime (as required by AI Studio's Cloud SQL environment), alongside an exportable Prisma schema for external Render PostgreSQL deployments. Authentication pairs Firebase Auth (Google Sign-In) with JWT access/refresh tokens, Argon2/scrypt password hashing, and SHA-256 hashed `amlp_live_*` API keys.
- **Confirmed Aesthetic Direction**: Technical developer portal built with the Astryx Design System (`@astryxdesign/core`), supporting seamless Light and Dark mode switching.
- **Confirmed Scope**: Complete developer portal (Home, Documentation, interactive API Explorer, Pricing, Login, Register, Dashboard, API Keys, Analytics, Settings), live Swagger UI (`/api/docs`), Admin Lyrics & Audit Log console, Vitest + Supertest suite, and all DevOps/CI artifacts.

---

## 1. Overview & Core Concept

- **What It Does**: Provides third-party developers with a fast, authenticated REST API (`x-api-key`) to search, paginate, filter, and retrieve Amharic song lyrics and artist catalogs, while giving platform administrators and developers a self-serve console to mint/revoke API keys, inspect live usage analytics, test endpoints interactively, and manage the lyrics catalog.
- **Target Audience / Persona**: Mobile and web developers building Ethiopian music players, karaoke apps, cultural archives, and language-learning tools, plus content curators and administrators managing licensed Amharic lyric records and API quotas.
- **Key Value**: Bridges a gap in structured Ge'ez/Amharic music metadata by pairing clean Ethiopic typography and transliterated search with Stripe/Vercel-grade developer tooling (one-time API key reveal, idempotent writes, OpenAPI 3.1 spec, and an interactive request playground).

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Developer Discovery & Quickstart (Home -> Documentation -> API Explorer)**:
   - A developer lands on the portal Home page, reads the core value proposition and live `curl` / TypeScript SDK snippet, and navigates to **Documentation** or **Swagger UI** to inspect `/api/v1/lyrics` and `/api/v1/artists` schemas.
   - In the **API Explorer**, they select an endpoint, enter or auto-fill an active API key, tweak query parameters (`artist`, `genre`, `search`, `page`, `limit`, `sortBy`), execute a live HTTP request against the backend, and inspect the formatted JSON body, HTTP status code, latency, and response headers.
2. **Account Onboarding & API Key Provisioning (Register / Login -> API Keys -> Analytics)**:
   - Users register or sign in (via Google Sign-In or email/password JWT flow) and enter the Developer Console **Dashboard**.
   - In **API Keys**, they create a named key (`amlp_live_...`), copy the raw key from the single-reveal confirmation dialog (only its hash and prefix are stored), monitor daily quota usage, or disable, regenerate, or revoke keys.
   - In **Analytics** and **Settings**, developers review request volume, top endpoints, and profile/security preferences.
3. **Admin Catalog & Governance Flow (Admin Dashboard -> Lyrics CRUD -> Audit Logs)**:
   - Administrators manage the Amharic lyrics catalog via a high-density Astryx table with search, genre/artist filters, pagination, and a drawer/dialog editor for creating, updating, or soft-deleting tracks (`deletedAt`).
   - Every administrative mutation and key lifecycle action writes an immutable entry to the **Audit Log**, viewable and filterable in the Admin Console.

### Visual Identity & Theme

- **Aesthetic Direction**: Crisp, utilitarian technical studio modeled after Stripe Docs, Vercel, and Render — uncluttered hairline grids, high-contrast code surfaces, and calm typographic authority.
- **Color Palette & Mood (60-30-10 Budget)**:
  - *Light Mode*: 60% crisp neutral canvas (`#FFFFFF` / `#F8FAFC`), 30% structural slate surfaces and 1px hairline borders (`#E2E8F0`), 10% cobalt/indigo accent (`#2563EB`) for primary actions and active tabs.
  - *Dark Mode*: 60% deep obsidian-slate canvas (`#0B0F19`), 30% elevated slate surfaces (`#111827`) with subtle 1px borders (`#1F2937`), 10% luminous cobalt accent (`#3B82F6`).
  - *Semantic States*: Green (`#16A34A`), Amber (`#D97706`), and Crimson (`#DC2626`) used strictly for HTTP status codes, quota warnings, and active/revoked key states—always paired with explicit text labels.
- **Typography & Hierarchy**:
  - *Display & Navigation*: `Plus Jakarta Sans` (tight tracking, balanced headline wrapping).
  - *Body & Documentation Prose*: `DM Sans` paired with `Noto Sans Ethiopic` for authentic, crisp rendering of Amharic Ge'ez lyrics (`አማርኛ`).
  - *Code, Keys & Tabular Metrics*: `JetBrains Mono` with `font-variant-numeric: tabular-nums` across all request counters, latencies, timestamps, and JSON payloads.
- **Component Styling & Layout**:
  - Built on `@astryxdesign/core` (`Button`, `Card`, `Table`, `Input`, `Dialog`, `Drawer`, `Tabs`, `Toast`, `Layout`) and Astryx CSS token variables synchronized with Tailwind v4 `@custom-variant dark`.
  - *Top Bar Contract*: Single-row three-zone header on public pages (wordmark — 4–5 single-line nav links — 1 primary `Get API Key` CTA), transitioning into a 256px sidebar + breadcrumb workspace shell inside the Developer & Admin Console (where the Light/Dark theme switch lives cleanly).
  - *Anti-Slop Discipline*: Zero static pill capsules on metadata (use quiet `·` typographic separators), zero nested bordered cards, zero decorative pulsing status dots or `//` comment prefixes.
- **Interactive Feedback & Motion**: Smooth 150ms transitions for tab switches, drawer reveals, copy-to-clipboard confirmations, and skeleton table placeholders during API fetches.

---

## 3. Key Product Decisions & Trade-Offs

- **Live Runtime vs. Standalone Render Deliverables**:
  - *Chosen Approach*: Run a unified Vite + React 19 + Express backend in the live workspace on port `3000` (using Astryx components and Cloud SQL via Drizzle ORM), while shipping complete `render.yaml`, `Dockerfile`, `docker-compose.yml`, GitHub Actions workflows, `prisma/schema.prisma`, `openapi.yaml`, and `postman_collection.json` for external Render/Docker deployment.
  - *Why*: Ensures the live preview, API Explorer, Swagger UI, and Admin Console execute immediately against real endpoints and PostgreSQL in this environment while fulfilling every Render/DevOps deliverable.
  - *Alternatives Considered*: Pure static Next.js/Prisma monorepo files without a running preview server, which would prevent live end-to-end testing of the REST API and Explorer in AI Studio.
- **Authentication & API Key Security**:
  - *Chosen Approach*: Support Firebase Auth (Google Sign-In) for seamless AI Studio Cloud SQL compliance alongside custom JWT access/refresh token endpoints (`/api/v1/auth/*`) using Argon2/scrypt password hashing and in-memory token storage on the client, plus SHA-256 hashed `amlp_live_*` API keys with daily quota enforcement on all `/api/v1/lyrics` and `/api/v1/artists` routes.
  - *Why*: Protects credentials against client storage leaks, satisfies Cloud SQL security requirements, and demonstrates full JWT + Refresh + API Key workflows in both the UI and automated tests.
  - *Alternatives Considered*: Storing JWTs or raw API keys in `localStorage` or database plaintext, which introduces unacceptable credential-exposure risk.
- **Idempotency & Request Hardening**:
  - *Chosen Approach*: PostgreSQL-backed idempotency table storing SHA-256 request fingerprints and cached responses for `Idempotency-Key` headers on `POST`/`PUT`/`PATCH`/`DELETE`, paired with Zod schema validation (`body`, `params`, `query`, `headers`), Helmet security headers, CORS allowlisting, rate limiting, and Pino structured logging.
  - *Why*: Guarantees safe retries on mutating admin/key requests and enforces strict API contracts across every status code (`200`–`503`).

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                     DEVELOPER PORTAL & CONSOLE (React 19 + Astryx)        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Public Pages │  │ Docs & Swag- │  │ Live API     │  │ Admin & Dev   │  │
│  │ Home/Pricing │  │ ger UI Frame │  │ Explorer     │  │ Dashboard     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
└─────────┼─────────────────┼─────────────────┼──────────────────┼──────────┘
          │                 │                 │ x-api-key        │ Bearer JWT /
          │                 │                 │                  │ Firebase ID Token
          ▼                 ▼                 ▼                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                  EXPRESS REST API GATEWAY (Clean Architecture)            │
│  Helmet/CSP · CORS · Rate Limiter · Pino Logger · Idempotency · Zod       │
├───────────────────────────────────────────────────────────────────────────┤
│  Routes & Controllers  ──▶  Services (Business/Auth)  ──▶  Repositories   │
│  • /health, /live, /ready   • JWT + Refresh + Argon2       • Lyrics Repo  │
│  • /api/docs (Swagger UI)   • API Key Hash & Quota         • ApiKey Repo  │
│  • /api/v1/lyrics, artists  • Audit Logger                 • User Repo    │
│  • /api/v1/auth/*, admin/*  • Standard {success,data,meta} • Idempotency  │
└───────────────────────────────────────┬───────────────────────────────────┘
                                        │ pg.Pool (Drizzle ORM)
                                        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                      HOSTED POSTGRESQL (Cloud SQL)                        │
│   users · lyrics · api_keys · audit_logs · refresh_tokens · idempotency   │
└───────────────────────────────────────────────────────────────────────────┘
```

### Data Model & Entities

- **Users (`users`)**: `id` (UUID), `uid` (optional Firebase UID), `name`, `email` (unique), `passwordHash`, `role` (`USER` | `ADMIN`), `isActive`, timestamps.
- **Lyrics (`lyrics`)**: `id` (UUID), `title`, `titleTranslit`, `artist`, `album`, `lyrics` (full Amharic Ge'ez text), `language` (`am`), `genre` (`Traditional`, `Ethio-Jazz`, `Tizita`, `Bati`, `Contemporary`, `Gospel`), `views`, `createdAt`, `updatedAt`, `deletedAt` (soft delete).
- **API Keys (`api_keys`)**: `id` (UUID), `keyHash` (SHA-256), `keyPrefix` (`amlp_live_xxxx`), `name`, `ownerId` (FK -> `users`), `isActive`, `requestsUsed`, `dailyQuota`, `lastUsedAt`, timestamps.
- **Audit Logs (`audit_logs`)**: `id` (UUID), `actorId` (FK -> `users`), `action`, `entityType`, `entityId`, `metadata` (JSONB), `createdAt`.
- **Refresh Tokens & Idempotency Records**: `refresh_tokens` for rotating/revoking JWT refresh sessions; `idempotency_keys` storing `(key, actorScope, method, path, requestHash, statusCode, responseBody, expiresAt)`.

### Security & Verification Strategy

- **Parameterized Queries & Input Validation**: All SQL operations run through Drizzle ORM parameterized builders (never raw string interpolation); every endpoint validates `params`, `query`, `body`, and `headers` with Zod, returning structured `422` / `400` envelopes.
- **Server-Side Auth & Secret Boundaries**: API keys are generated with `crypto.randomBytes`, displayed once in the creation modal, and persisted strictly as SHA-256 hashes; JWT secrets and database credentials live solely in server `process.env`; protected admin endpoints verify both valid token and `ADMIN` role on the server.
- **Automated Testing & DevOps**: Vitest + Supertest suite validating health checks, auth/refresh flows, `x-api-key` verification and daily quota enforcement, idempotency replay, Zod validation errors, and security headers, alongside GitHub Actions workflows (`lint`, `test`, `build`, `security`), `Dockerfile`, `docker-compose.yml`, `render.yaml`, `openapi.yaml`, and `postman_collection.json`.
