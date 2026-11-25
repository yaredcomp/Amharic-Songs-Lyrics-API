import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.ts';

const SCRYPT_KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, { N: 16384, r: 8, p: 1 }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, salt, expectedHex] = parts;
  const expected = Buffer.from(expectedHex, 'hex');
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, expected.length, { N: 16384, r: 8, p: 1 }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function generateApiKey(): {
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
} {
  const secretPart = crypto.randomBytes(24).toString('base64url');
  const rawKey = `amlp_live_${secretPart}`;
  const keyPrefix = rawKey.slice(0, 18);
  const keyHash = sha256Hex(rawKey);
  return { rawKey, keyPrefix, keyHash };
}

export interface JwtTokenPayload {
  sub: string;
  email: string;
  role: 'USER' | 'ADMIN';
  type: 'access' | 'refresh';
}

export function signAccessToken(user: {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}): string {
  const payload: JwtTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
  };
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn as jwt.SignOptions['expiresIn'],
    issuer: 'amharic-lyrics-api',
  });
}

export function signRefreshToken(user: {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}): { token: string; tokenHash: string; expiresAt: Date } {
  const jti = crypto.randomUUID();
  const payload: JwtTokenPayload & { jti: string } = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'refresh',
    jti,
  };
  const token = jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: `${env.jwtRefreshExpiresDays}d`,
    issuer: 'amharic-lyrics-api',
  });
  const expiresAt = new Date(Date.now() + env.jwtRefreshExpiresDays * 86_400_000);
  return {
    token,
    tokenHash: sha256Hex(token),
    expiresAt,
  };
}

export function verifyAccessToken(token: string): JwtTokenPayload {
  const decoded = jwt.verify(token, env.jwtAccessSecret, {
    issuer: 'amharic-lyrics-api',
  }) as JwtTokenPayload;
  if (decoded.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return decoded;
}

export function verifyRefreshToken(token: string): JwtTokenPayload {
  const decoded = jwt.verify(token, env.jwtRefreshSecret, {
    issuer: 'amharic-lyrics-api',
  }) as JwtTokenPayload;
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return decoded;
}
