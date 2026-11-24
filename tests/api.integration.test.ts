import crypto from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminAuth } from '../src/lib/firebase-admin.ts';
import { env } from '../src/server/config/env.ts';
import { sha256Hex } from '../src/server/utils/crypto.ts';

const TEST_ADMIN_PASSCODE = `test-passcode-${'a'.repeat(32)}`;

// In-memory test store backing mocked repositories
const store = {
  users: new Map<string, any>(),
  lyrics: new Map<string, any>(),
  apiKeys: new Map<string, any>(),
  refreshTokens: new Map<string, any>(),
  idempotency: new Map<string, any>(),
  auditLogs: [] as any[],
};

vi.mock('../src/db/index.ts', () => ({
  db: {
    execute: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
  },
  pool: { end: vi.fn() },
  createPool: vi.fn(),
}));

vi.mock('../src/lib/firebase-admin.ts', () => ({
  adminAuth: {
    verifyIdToken: vi.fn().mockRejectedValue(new Error('Mock firebase token invalid')),
  },
}));

vi.mock('../src/server/repositories/usersRepository.ts', () => ({
  usersRepository: {
    findById: vi.fn(async (id: string) => store.users.get(id) ?? null),
    findByEmail: vi.fn(async (email: string) => {
      const lower = email.toLowerCase();
      return Array.from(store.users.values()).find((u) => u.email === lower) ?? null;
    }),
    findByUid: vi.fn(async (uid: string) => {
      return Array.from(store.users.values()).find((u) => u.uid === uid) ?? null;
    }),
    countAdmins: vi.fn(async () => {
      return Array.from(store.users.values()).filter((u) => u.role === 'ADMIN').length;
    }),
    createUser: vi.fn(async (input: any) => {
      const id = crypto.randomUUID();
      const rec = {
        id,
        uid: input.uid ?? null,
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash ?? null,
        role: input.role ?? 'USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.users.set(id, rec);
      return rec;
    }),
    claimFirstAdmin: vi.fn(async (input: { name: string; email: string; passwordHash: string }) => {
      if (Array.from(store.users.values()).some((user) => user.role === 'ADMIN')) {
        return { status: 'already-claimed' as const };
      }
      if (Array.from(store.users.values()).some((user) => user.email === input.email.toLowerCase())) {
        return { status: 'email-exists' as const };
      }
      const id = crypto.randomUUID();
      const user = {
        id,
        uid: null,
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.users.set(id, user);
      return { status: 'created' as const, user };
    }),
    upsertFirebaseUser: vi.fn(async (input: {
      uid: string;
      email: string;
      name: string;
      forceAdmin?: boolean;
    }) => {
      const existing = Array.from(store.users.values()).find(
        (user) => user.email === input.email.toLowerCase()
      );
      if (existing) {
        existing.uid = input.uid;
        if (input.forceAdmin) existing.role = 'ADMIN';
        return existing;
      }
      const id = crypto.randomUUID();
      const user = {
        id,
        uid: input.uid,
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: null,
        role: input.forceAdmin ? 'ADMIN' : 'USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.users.set(id, user);
      return user;
    }),
    updateProfile: vi.fn(async (id: string, name: string) => {
      const existing = store.users.get(id);
      if (!existing) return null;
      existing.name = name;
      existing.updatedAt = new Date();
      return existing;
    }),
  },
}));

vi.mock('../src/server/repositories/lyricsRepository.ts', () => ({
  lyricsRepository: {
    findMany: vi.fn(async (params: any) => {
      let items = Array.from(store.lyrics.values()).filter((l) => !l.deletedAt);
      if (params.artist) {
        items = items.filter((l) =>
          l.artist.toLowerCase().includes(params.artist.toLowerCase())
        );
      }
      if (params.genre) {
        items = items.filter((l) =>
          l.genre.toLowerCase().includes(params.genre.toLowerCase())
        );
      }
      if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter(
          (l) =>
            l.title.toLowerCase().includes(q) ||
            l.titleTranslit.toLowerCase().includes(q) ||
            l.artist.toLowerCase().includes(q) ||
            l.lyrics.toLowerCase().includes(q)
        );
      }
      const total = items.length;
      const start = (params.page - 1) * params.limit;
      return {
        items: items.slice(start, start + params.limit),
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      };
    }),
    findById: vi.fn(async (id: string, incrementViews = false) => {
      const rec = store.lyrics.get(id);
      if (!rec || rec.deletedAt) return null;
      if (incrementViews) rec.views += 1;
      return rec;
    }),
    findPopular: vi.fn(async (limit = 10) => {
      return Array.from(store.lyrics.values())
        .filter((l) => !l.deletedAt)
        .sort((a, b) => b.views - a.views)
        .slice(0, limit);
    }),
    findRecent: vi.fn(async (limit = 10) => {
      return Array.from(store.lyrics.values())
        .filter((l) => !l.deletedAt)
        .slice(0, limit);
    }),
    findArtists: vi.fn(async () => []),
    findArtistByName: vi.fn(async () => null),
    create: vi.fn(async (input: any) => {
      const id = crypto.randomUUID();
      const rec = {
        id,
        ...input,
        releaseYear: input.releaseYear ?? null,
        views: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      store.lyrics.set(id, rec);
      return rec;
    }),
    update: vi.fn(async (id: string, input: any) => {
      const rec = store.lyrics.get(id);
      if (!rec || rec.deletedAt) return null;
      Object.assign(rec, input, { updatedAt: new Date() });
      return rec;
    }),
    softDelete: vi.fn(async (id: string) => {
      const rec = store.lyrics.get(id);
      if (!rec || rec.deletedAt) return null;
      rec.deletedAt = new Date();
      return rec;
    }),
    getStats: vi.fn(async () => ({
      totalLyrics: Array.from(store.lyrics.values()).filter((l) => !l.deletedAt).length,
      totalViews: 1000,
      totalArtists: 2,
      totalGenres: 2,
    })),
  },
}));

vi.mock('../src/server/repositories/apiKeysRepository.ts', () => ({
  apiKeysRepository: {
    findByHash: vi.fn(async (keyHash: string) => {
      return Array.from(store.apiKeys.values()).find((k) => k.keyHash === keyHash) ?? null;
    }),
    findById: vi.fn(async (id: string) => store.apiKeys.get(id) ?? null),
    listByOwner: vi.fn(async (ownerId: string) => {
      return Array.from(store.apiKeys.values()).filter((k) => k.ownerId === ownerId);
    }),
    listAll: vi.fn(async () => Array.from(store.apiKeys.values())),
    create: vi.fn(async (input: any) => {
      const id = crypto.randomUUID();
      const rec = {
        id,
        keyHash: input.keyHash,
        keyPrefix: input.keyPrefix,
        name: input.name,
        ownerId: input.ownerId,
        isActive: true,
        requestsUsed: 0,
        dailyQuota: input.dailyQuota ?? 1000,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.apiKeys.set(id, rec);
      return rec;
    }),
    updateById: vi.fn(async (id: string, patch: any) => {
      const rec = store.apiKeys.get(id);
      if (!rec) return null;
      Object.assign(rec, patch, { updatedAt: new Date() });
      return rec;
    }),
    deleteById: vi.fn(async (id: string) => {
      const rec = store.apiKeys.get(id);
      if (!rec) return null;
      store.apiKeys.delete(id);
      return rec;
    }),
    incrementUsage: vi.fn(async (id: string) => {
      const rec = store.apiKeys.get(id);
      if (rec) rec.requestsUsed += 1;
    }),
    logUsageEvent: vi.fn(async () => {}),
    getStats: vi.fn(async () => ({
      totalKeys: store.apiKeys.size,
      activeKeys: Array.from(store.apiKeys.values()).filter((k) => k.isActive).length,
      totalRequests: 0,
      loggedEvents: 0,
      avgLatencyMs: 0,
    })),
    getAnalytics: vi.fn(async () => ({
      summary: { totalCalls: 0, avgLatencyMs: 0, successCalls: 0, errorCalls: 0 },
      byEndpoint: [],
      recentLogs: [],
    })),
  },
}));

vi.mock('../src/server/repositories/tokensRepository.ts', () => ({
  tokensRepository: {
    saveRefreshToken: vi.fn(async (input: any) => {
      store.refreshTokens.set(input.tokenHash, {
        id: crypto.randomUUID(),
        ...input,
        revokedAt: null,
        createdAt: new Date(),
      });
    }),
    findValidRefreshToken: vi.fn(async (tokenHash: string) => {
      const rec = store.refreshTokens.get(tokenHash);
      if (!rec || rec.revokedAt || rec.expiresAt <= new Date()) return null;
      return rec;
    }),
    revokeRefreshToken: vi.fn(async (tokenHash: string) => {
      const rec = store.refreshTokens.get(tokenHash);
      if (rec) rec.revokedAt = new Date();
    }),
  },
}));

vi.mock('../src/server/repositories/idempotencyRepository.ts', () => ({
  idempotencyRepository: {
    findRecord: vi.fn(async (params: any) => {
      const composite = `${params.key}:${params.actorScope}:${params.method}:${params.path}`;
      return store.idempotency.get(composite) ?? null;
    }),
    saveRecord: vi.fn(async (input: any) => {
      const composite = `${input.key}:${input.actorScope}:${input.method}:${input.path}`;
      if (!store.idempotency.has(composite)) {
        store.idempotency.set(composite, input);
      }
    }),
  },
}));

vi.mock('../src/server/repositories/auditLogsRepository.ts', () => ({
  auditLogsRepository: {
    create: vi.fn(async (input: any) => {
      const rec = { id: crypto.randomUUID(), ...input, createdAt: new Date() };
      store.auditLogs.push(rec);
      return rec;
    }),
    list: vi.fn(async (params: any) => ({
      items: store.auditLogs.slice(0, params.limit),
      total: store.auditLogs.length,
      page: params.page,
      limit: params.limit,
      totalPages: 1,
    })),
  },
}));

import { createApiApp } from '../src/server/app.ts';

const app = createApiApp();

const SAMPLE_LYRICS_ID = '11111111-1111-4111-8111-111111111111';
const ACTIVE_RAW_KEY = 'amlp_live_active_test_key_1234567890';
const DISABLED_RAW_KEY = 'amlp_live_disabled_test_key_123456789';
const EXHAUSTED_RAW_KEY = 'amlp_live_quota_test_key_12345678901';

beforeEach(() => {
  env.adminEmail = 'admin@trusted.test';
  env.adminPasscode = TEST_ADMIN_PASSCODE;
  vi.mocked(adminAuth.verifyIdToken).mockRejectedValue(new Error('Mock firebase token invalid'));
  store.users.clear();
  store.lyrics.clear();
  store.apiKeys.clear();
  store.refreshTokens.clear();
  store.idempotency.clear();
  store.auditLogs.length = 0;

  store.lyrics.set(SAMPLE_LYRICS_ID, {
    id: SAMPLE_LYRICS_ID,
    title: 'ትዝታ',
    titleTranslit: 'Tizita',
    artist: 'Aster Aweke',
    album: 'Aster',
    lyrics: 'ትዝታው መጣብኝ የጥንቱ ዘመን\nበልቤ ጓዳ ውስጥ የተቀመጠውን',
    language: 'am',
    genre: 'Tizita',
    releaseYear: 1989,
    views: 41890,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  const ownerId = '22222222-2222-4222-8222-222222222222';
  store.apiKeys.set('key-active', {
    id: '33333333-3333-4333-8333-333333333333',
    keyHash: sha256Hex(ACTIVE_RAW_KEY),
    keyPrefix: ACTIVE_RAW_KEY.slice(0, 18),
    name: 'Active Key',
    ownerId,
    isActive: true,
    requestsUsed: 5,
    dailyQuota: 1000,
    lastUsedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  store.apiKeys.set('key-disabled', {
    id: '44444444-4444-4444-8444-444444444444',
    keyHash: sha256Hex(DISABLED_RAW_KEY),
    keyPrefix: DISABLED_RAW_KEY.slice(0, 18),
    name: 'Disabled Key',
    ownerId,
    isActive: false,
    requestsUsed: 0,
    dailyQuota: 1000,
    lastUsedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  store.apiKeys.set('key-exhausted', {
    id: '55555555-5555-4555-8555-555555555555',
    keyHash: sha256Hex(EXHAUSTED_RAW_KEY),
    keyPrefix: EXHAUSTED_RAW_KEY.slice(0, 18),
    name: 'Exhausted Key',
    ownerId,
    isActive: true,
    requestsUsed: 100,
    dailyQuota: 100,
    lastUsedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

describe('Amharic Lyrics API Integration Tests', () => {
  it('disables password-based admin bootstrap unless a strong server-side passcode is configured', async () => {
    env.adminPasscode = '';

    const status = await request(app).get('/api/v1/auth/bootstrap-status');
    expect(status.status).toBe(200);
    expect(status.body.data.bootstrapAvailable).toBe(false);

    const response = await request(app).post('/api/v1/auth/bootstrap-admin').send({
      name: 'Chief Curator',
      email: 'admin@addis.dev',
      password: 'AdminPassword!2025',
      passcode: TEST_ADMIN_PASSCODE,
    });
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('ADMIN_BOOTSTRAP_NOT_CONFIGURED');
    expect(store.users.size).toBe(0);
  });

  it('requires the configured passcode and atomically allows only one first admin claim', async () => {
    const invalid = await request(app).post('/api/v1/auth/bootstrap-admin').send({
      name: 'Wrong Passcode',
      email: 'wrong@addis.dev',
      password: 'AdminPassword!2025',
      passcode: 'wrong-passcode-that-is-definitely-not-correct',
    });
    expect(invalid.status).toBe(403);
    expect(invalid.body.error.code).toBe('INVALID_ADMIN_PASSCODE');

    const payload = (email: string) => ({
      name: 'Chief Curator',
      email,
      password: 'AdminPassword!2025',
      passcode: TEST_ADMIN_PASSCODE,
    });
    const results = await Promise.all([
      request(app).post('/api/v1/auth/bootstrap-admin').send(payload('admin-a@addis.dev')),
      request(app).post('/api/v1/auth/bootstrap-admin').send(payload('admin-b@addis.dev')),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(Array.from(store.users.values()).filter((user) => user.role === 'ADMIN')).toHaveLength(1);
  });

  it('does not promote the first Firebase account unless its verified email is allowlisted', async () => {
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
      aud: 'test-project',
      auth_time: 1,
      exp: 9999999999,
      firebase: { identities: { email: ['first-user@example.com'] }, sign_in_provider: 'password' },
      iat: 1,
      iss: 'https://securetoken.google.com/test-project',
      sub: 'firebase-first-user',
      uid: 'firebase-first-user',
      email: 'first-user@example.com',
      email_verified: true,
      name: 'First User',
    });

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer firebase-user-token');

    expect(response.status).toBe(200);
    expect(response.body.data.user.role).toBe('USER');
  });

  it('does not accept an unverified Firebase email as an administrator identity', async () => {
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
      aud: 'test-project',
      auth_time: 1,
      exp: 9999999999,
      firebase: { identities: { email: ['admin@trusted.test'] }, sign_in_provider: 'password' },
      iat: 1,
      iss: 'https://securetoken.google.com/test-project',
      sub: 'firebase-unverified-admin',
      uid: 'firebase-unverified-admin',
      email: 'admin@trusted.test',
      email_verified: false,
      name: 'Unverified Admin',
    });

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer firebase-user-token');

    expect(response.status).toBe(401);
    expect(store.users.size).toBe(0);
  });

  it('promotes only the configured verified Firebase administrator email', async () => {
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
      aud: 'test-project',
      auth_time: 1,
      exp: 9999999999,
      firebase: { identities: { email: ['admin@trusted.test'] }, sign_in_provider: 'password' },
      iat: 1,
      iss: 'https://securetoken.google.com/test-project',
      sub: 'firebase-allowlisted-admin',
      uid: 'firebase-allowlisted-admin',
      email: 'admin@trusted.test',
      email_verified: true,
      name: 'Trusted Admin',
    });

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer firebase-user-token');

    expect(response.status).toBe(200);
    expect(response.body.data.user.role).toBe('ADMIN');
  });

  it('serves health endpoints, OpenAPI spec, and security headers', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toContain('max-age=');

    const ready = await request(app).get('/health/ready');
    expect(ready.status).toBe(200);
    expect(ready.body.data.database).toBe('connected');

    const openapi = await request(app).get('/api/openapi.json');
    expect(openapi.status).toBe(200);
    expect(openapi.body.openapi).toBe('3.1.0');
  });

  it('enforces API key authentication, status codes, and rate-limit headers on public lyrics API', async () => {
    // Missing key -> 422 from header validation or 401
    const missing = await request(app).get('/api/v1/lyrics');
    expect([401, 422]).toContain(missing.status);
    expect(missing.body.success).toBe(false);
    expect(missing.headers['x-frame-options']).toBe('DENY');

    // Invalid key -> 401
    const invalid = await request(app)
      .get('/api/v1/lyrics')
      .set('x-api-key', 'amlp_live_nonexistent_key_12345678');
    expect(invalid.status).toBe(401);
    expect(invalid.body.error.code).toBe('API_KEY_INVALID');

    // Disabled key -> 403
    const disabled = await request(app)
      .get('/api/v1/lyrics')
      .set('x-api-key', DISABLED_RAW_KEY);
    expect(disabled.status).toBe(403);
    expect(disabled.body.error.code).toBe('API_KEY_DISABLED');

    // Quota exceeded -> 429
    const exhausted = await request(app)
      .get('/api/v1/lyrics')
      .set('x-api-key', EXHAUSTED_RAW_KEY);
    expect(exhausted.status).toBe(429);
    expect(exhausted.body.error.code).toBe('RATE_LIMIT_EXCEEDED');

    // Valid key -> 200 with pagination meta & rate-limit headers
    const valid = await request(app)
      .get('/api/v1/lyrics?search=Tizita')
      .set('x-api-key', ACTIVE_RAW_KEY);
    expect(valid.status).toBe(200);
    expect(valid.body.success).toBe(true);
    expect(valid.body.data).toHaveLength(1);
    expect(valid.body.meta.total).toBe(1);
    expect(valid.headers['x-ratelimit-limit']).toBe('1000');

    // Valid single track fetch increments views
    const single = await request(app)
      .get(`/api/v1/lyrics/${SAMPLE_LYRICS_ID}`)
      .set('x-api-key', ACTIVE_RAW_KEY);
    expect(single.status).toBe(200);
    expect(single.body.data.titleTranslit).toBe('Tizita');
  });

  it('enforces 404, 405 Method Not Allowed, 415 Unsupported Media Type, and 422 Validation errors', async () => {
    const notFound = await request(app).get('/api/v1/unknown-endpoint');
    expect(notFound.status).toBe(404);
    expect(notFound.body.error.code).toBe('NOT_FOUND');

    const methodNotAllowed = await request(app).post('/api/v1/lyrics').send({});
    expect(methodNotAllowed.status).toBe(405);
    expect(methodNotAllowed.headers['allow']).toContain('GET');

    const unsupportedType = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'text/plain')
      .send('email=test@example.com');
    expect(unsupportedType.status).toBe(415);
    expect(unsupportedType.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');

    const invalidUuid = await request(app)
      .get('/api/v1/lyrics/not-a-uuid')
      .set('x-api-key', ACTIVE_RAW_KEY);
    expect(invalidUuid.status).toBe(422);
    expect(invalidUuid.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('registers, logs in, rotates refresh tokens, creates API keys with Idempotency-Key, and enforces ADMIN RBAC', async () => {
    // 1. Register developer
    const reg = await request(app).post('/api/v1/auth/register').send({
      name: 'Selamawit',
      email: 'selam@addis.dev',
      password: 'Password!2025',
    });
    expect(reg.status).toBe(201);
    expect(reg.body.data.user.role).toBe('USER');
    const devAccessToken = reg.body.data.accessToken as string;
    const firstRefreshToken = reg.body.data.refreshToken as string;

    // 2. Refresh token rotation & replay protection
    const refreshed = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefreshToken });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.refreshToken).not.toBe(firstRefreshToken);

    const replayOldRefresh = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefreshToken });
    expect(replayOldRefresh.status).toBe(401);

    // 3. Create API Key with Idempotency-Key
    const idempKey = 'idem-create-key-001';
    const keyRes1 = await request(app)
      .post('/api/v1/developer/api-keys')
      .set('Authorization', `Bearer ${devAccessToken}`)
      .set('Idempotency-Key', idempKey)
      .send({ name: 'Mobile Client', dailyQuota: 2000 });
    expect(keyRes1.status).toBe(201);
    expect(keyRes1.body.data.rawKey.startsWith('amlp_live_')).toBe(true);

    // Replay same Idempotency-Key with same payload -> cached response
    const keyRes2 = await request(app)
      .post('/api/v1/developer/api-keys')
      .set('Authorization', `Bearer ${devAccessToken}`)
      .set('Idempotency-Key', idempKey)
      .send({ name: 'Mobile Client', dailyQuota: 2000 });
    expect(keyRes2.status).toBe(201);
    expect(keyRes2.headers['x-idempotency-replayed']).toBe('true');
    expect(keyRes2.body.data.id).toBe(keyRes1.body.data.id);

    // Reuse Idempotency-Key with different payload -> 409 conflict
    const keyConflict = await request(app)
      .post('/api/v1/developer/api-keys')
      .set('Authorization', `Bearer ${devAccessToken}`)
      .set('Idempotency-Key', idempKey)
      .send({ name: 'Different Name', dailyQuota: 5000 });
    expect(keyConflict.status).toBe(409);
    expect(keyConflict.body.error.code).toBe('IDEMPOTENCY_CONFLICT');

    // 4. Non-admin blocked from admin endpoints
    const forbidden = await request(app)
      .post('/api/v1/admin/lyrics')
      .set('Authorization', `Bearer ${devAccessToken}`)
      .send({
        title: 'አዲስ',
        titleTranslit: 'Addis',
        artist: 'Artist',
        album: 'Album',
        lyrics: 'ይህ የሙከራ ግጥም ነው በአማርኛ የተጻፈ።',
        genre: 'Pop',
      });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');

    // 5. Bootstrap Admin -> Create, Patch, Delete lyrics
    const adminReg = await request(app).post('/api/v1/auth/bootstrap-admin').send({
      name: 'Chief Curator',
      email: 'admin@addis.dev',
      password: 'AdminPassword!2025',
      passcode: TEST_ADMIN_PASSCODE,
    });
    expect(adminReg.status).toBe(201);
    expect(adminReg.body.data.user.role).toBe('ADMIN');
    const adminToken = adminReg.body.data.accessToken as string;

    const createdTrack = await request(app)
      .post('/api/v1/admin/lyrics')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'አዲስ ንጋት',
        titleTranslit: 'Addis Nigat',
        artist: 'Aster Aweke',
        album: 'Hagere',
        lyrics: 'አዲስ ንጋት ሲመጣ ብርሃኑ ይታያል\nየፍቅር ዜማችን ሁሌም ይሰማል።',
        genre: 'Tizita',
        releaseYear: 2024,
      });
    expect(createdTrack.status).toBe(201);
    const createdId = createdTrack.body.data.id as string;

    const patchedTrack = await request(app)
      .patch(`/api/v1/admin/lyrics/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ genre: 'Ethio-Soul' });
    expect(patchedTrack.status).toBe(200);
    expect(patchedTrack.body.data.genre).toBe('Ethio-Soul');

    const deletedTrack = await request(app)
      .delete(`/api/v1/admin/lyrics/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deletedTrack.status).toBe(204);
  });
});
