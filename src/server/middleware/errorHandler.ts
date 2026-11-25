import { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger.ts';
import { ApiErrorResponse, AppError } from '../types/api.ts';

export function methodNotAllowedHandler(allowed: string[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Allow', allowed.join(', '));
    return next(
      new AppError(
        405,
        'METHOD_NOT_ALLOWED',
        `Method not allowed. Supported methods: ${allowed.join(', ')}`
      )
    );
  };
}

export function notFoundApiHandler(req: Request, _res: Response, next: NextFunction) {
  return next(
    new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} does not exist`)
  );
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };
    return res.status(err.statusCode).json(body);
  }

  if (err instanceof SyntaxError && 'body' in err) {
    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Malformed JSON request body',
        details: [],
      },
    };
    return res.status(400).json(body);
  }

  if (err && typeof err === 'object' && 'type' in err && (err as { type?: string }).type === 'entity.too.large') {
    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload exceeds maximum allowed size',
        details: [],
      },
    };
    return res.status(413).json(body);
  }

  logger.error({ err, path: req.originalUrl, method: req.method }, 'Unhandled API error');

  const body: ApiErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred',
      details: [],
    },
  };
  return res.status(500).json(body);
}
