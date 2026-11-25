import { NextFunction, Request, Response } from 'express';
import { idempotencyRepository } from '../repositories/idempotencyRepository.ts';
import { AppError } from '../types/api.ts';
import { sha256Hex } from '../utils/crypto.ts';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!MUTATING_METHODS.has(req.method)) {
    return next();
  }

  const rawHeader = req.headers['idempotency-key'];
  const idempotencyKey = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  if (!idempotencyKey || !idempotencyKey.trim()) {
    return next();
  }

  const key = idempotencyKey.trim();
  if (key.length > 128) {
    return next(
      new AppError(400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key header exceeds 128 chars')
    );
  }

  const actorScope = req.authUser?.id || req.apiKey?.id || req.ip || 'anonymous';
  const path = req.baseUrl + req.path;
  const requestHash = sha256Hex(
    JSON.stringify({
      method: req.method,
      path,
      body: req.body ?? null,
    })
  );

  const existing = await idempotencyRepository.findRecord({
    key,
    actorScope,
    method: req.method,
    path,
  });

  if (existing) {
    if (existing.requestHash !== requestHash) {
      return next(
        new AppError(
          409,
          'IDEMPOTENCY_CONFLICT',
          'Idempotency-Key was already used with a different request payload'
        )
      );
    }
    res.setHeader('X-Idempotency-Replayed', 'true');
    return res.status(existing.statusCode).json(existing.responseBody);
  }

  const originalJson = res.json.bind(res);
  res.json = ((body: Record<string, unknown>) => {
    if (res.statusCode < 500) {
      void idempotencyRepository.saveRecord({
        key,
        actorScope,
        method: req.method,
        path,
        requestHash,
        statusCode: res.statusCode,
        responseBody: body,
      });
    }
    return originalJson(body);
  }) as Response['json'];

  return next();
}
