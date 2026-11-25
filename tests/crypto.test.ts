import { describe, expect, it } from 'vitest';
import {
  generateApiKey,
  hashPassword,
  sha256Hex,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyPassword,
  verifyRefreshToken,
} from '../src/server/utils/crypto.ts';

describe('Crypto & Token Utilities', () => {
  it('hashes and verifies passwords with scrypt safely', async () => {
    const hash = await hashPassword('AddisMusic!2025');
    expect(hash.startsWith('scrypt:')).toBe(true);
    expect(hash).not.toContain('AddisMusic!2025');

    const valid = await verifyPassword('AddisMusic!2025', hash);
    expect(valid).toBe(true);

    const invalid = await verifyPassword('WrongPassword', hash);
    expect(invalid).toBe(false);
    expect(await verifyPassword('anything', 'malformed-hash')).toBe(false);
  });

  it('generates API keys with amlp_live_ prefix and deterministic SHA-256 hash', () => {
    const { rawKey, keyPrefix, keyHash } = generateApiKey();
    expect(rawKey.startsWith('amlp_live_')).toBe(true);
    expect(rawKey.length).toBeGreaterThanOrEqual(32);
    expect(keyPrefix).toBe(rawKey.slice(0, 18));
    expect(keyHash).toBe(sha256Hex(rawKey));
    expect(keyHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('signs and verifies JWT access and refresh tokens with strict type enforcement', () => {
    const user = {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      email: 'dev@zema.et',
      role: 'ADMIN' as const,
    };

    const accessToken = signAccessToken(user);
    const decodedAccess = verifyAccessToken(accessToken);
    expect(decodedAccess.sub).toBe(user.id);
    expect(decodedAccess.email).toBe(user.email);
    expect(decodedAccess.role).toBe('ADMIN');
    expect(decodedAccess.type).toBe('access');

    const refresh = signRefreshToken(user);
    const decodedRefresh = verifyRefreshToken(refresh.token);
    expect(decodedRefresh.sub).toBe(user.id);
    expect(decodedRefresh.type).toBe('refresh');
    expect(refresh.tokenHash).toBe(sha256Hex(refresh.token));
    expect(refresh.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Cross-type token rejection
    expect(() => verifyRefreshToken(accessToken)).toThrow();
    expect(() => verifyAccessToken(refresh.token)).toThrow();
  });
});
