# Security Review

Review date: 2026-11-24

The Cloudflare security-audit skill was installed with `npx skills add cloudflare/security-audit-skill`. A read-only project review reported the following high-severity issues:

| # | Severity | Confidence | Finding | Status |
|---|----------|------------|---------|--------|
| 1 | HIGH | 10/10 | First-run password bootstrap could create an administrator without a configured passcode; concurrent claims could race. | Fixed |
| 2 | HIGH | 9/10 | The first Firebase account could become an administrator without an explicit allowlist. | Fixed |
| 3 | HIGH | 10/10 | Docker Compose used a weak PostgreSQL password and published the database port to the host. | Fixed |

## Remediations

1. Password-based administrator bootstrap now requires a configured passcode of at least 32 characters. The initial claim is serialized with a PostgreSQL transaction-scoped advisory lock. The setup page reports when bootstrap is unavailable.
2. Firebase accounts must have verified email addresses. New Firebase accounts receive the `USER` role; administrator promotion requires an explicitly configured `ADMIN_EMAIL` match. The implicit administrator email default was removed.
3. Compose now requires `SQL_PASSWORD`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` rather than using weak fallbacks. PostgreSQL is no longer published on a host port. The standalone Docker deployment instructions use a protected environment file.

## Verification

- `npm test` — 15 tests passed.
- `npm run lint` — passed.
- `npm run build` — passed.
- `docker compose config` — valid; PostgreSQL has no published host ports.
