import { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger.ts';
import { apiKeysRepository } from '../repositories/apiKeysRepository.ts';
import { usersRepository } from '../repositories/usersRepository.ts';
import { ApiKeyContext, AppError, AuthenticatedUser } from '../types/api.ts';
import { sha256Hex, verifyAccessToken } from '../utils/crypto.ts';

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
      apiKey?: ApiKeyContext;
    }
  }
}

export async function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startedAt = Date.now();
  const rawKeyHeader = req.headers['x-api-key'];
  const rawKey = Array.isArray(rawKeyHeader) ? rawKeyHeader[0] : rawKeyHeader;

  if (!rawKey || !rawKey.trim()) {
    return next(
      new AppError(401, 'API_KEY_MISSING', 'Missing x-api-key request header', [
        { field: 'x-api-key', location: 'headers', message: 'API key is required' },
      ])
    );
  }

  try {
    const keyHash = sha256Hex(rawKey.trim());
    const keyRecord = await apiKeysRepository.findByHash(keyHash);

    if (!keyRecord) {
      logger.warn({ event: 'api_key_invalid', path: req.originalUrl }, 'Invalid API key presented');
      return next(new AppError(401, 'API_KEY_INVALID', 'Invalid API key'));
    }

    if (!keyRecord.isActive) {
      logger.warn(
        { event: 'api_key_disabled', keyPrefix: keyRecord.keyPrefix },
        'Disabled API key attempted request'
      );
      return next(new AppError(403, 'API_KEY_DISABLED', 'API key has been disabled or revoked'));
    }

    if (keyRecord.requestsUsed >= keyRecord.dailyQuota) {
      logger.warn(
        { event: 'api_key_quota_exceeded', keyPrefix: keyRecord.keyPrefix },
        'API key daily quota exceeded'
      );
      return next(
        new AppError(429, 'RATE_LIMIT_EXCEEDED', 'API key daily quota has been exceeded')
      );
    }

    req.apiKey = {
      id: keyRecord.id,
      ownerId: keyRecord.ownerId,
      name: keyRecord.name,
      keyPrefix: keyRecord.keyPrefix,
      dailyQuota: keyRecord.dailyQuota,
      requestsUsed: keyRecord.requestsUsed,
    };

    res.setHeader('X-RateLimit-Limit', String(keyRecord.dailyQuota));
    res.setHeader(
      'X-RateLimit-Remaining',
      String(Math.max(0, keyRecord.dailyQuota - keyRecord.requestsUsed - 1))
    );

    res.on('finish', () => {
      const latencyMs = Math.max(1, Date.now() - startedAt);
      void apiKeysRepository.incrementUsage(keyRecord.id);
      void apiKeysRepository.logUsageEvent({
        apiKeyId: keyRecord.id,
        ownerId: keyRecord.ownerId,
        method: req.method,
        endpoint: req.baseUrl + (req.route?.path ?? req.path),
        statusCode: res.statusCode,
        latencyMs,
      });
    });

    return next();
  } catch (err) {
    return next(err);
  }
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Missing Bearer authorization token'));
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Empty authorization token'));
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await usersRepository.findById(decoded.sub);
    if (!user || !user.isActive) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Account is inactive or not found'));
    }
    req.authUser = {
      id: user.id,
      uid: user.uid,
      name: user.name,
      email: user.email,
      role: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
      isActive: user.isActive,
    };
    return next();
  } catch {
    logger.warn({ event: 'auth_token_invalid' }, 'Rejected invalid bearer token');
    return next(new AppError(401, 'INVALID_TOKEN', 'Invalid or expired authorization token'));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.authUser) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  }
  if (req.authUser.role !== 'ADMIN') {
    logger.warn(
      { event: 'forbidden_admin_access', userId: req.authUser.id, path: req.originalUrl },
      'Non-admin user attempted admin operation'
    );
    return next(new AppError(403, 'FORBIDDEN', 'Administrator privileges required'));
  }
  return next();
}
