import { NextFunction, Request, Response } from 'express';
import { AppError } from '../types/api.ts';

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

export function enforceJsonContentType(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (!BODY_METHODS.has(req.method)) {
    return next();
  }

  const contentLength = Number(req.headers['content-length'] || 0);
  const hasTransferEncoding = Boolean(req.headers['transfer-encoding']);
  if (contentLength === 0 && !hasTransferEncoding) {
    return next();
  }

  if (!req.is('application/json')) {
    return next(
      new AppError(
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        'Content-Type must be application/json for request bodies'
      )
    );
  }

  return next();
}
