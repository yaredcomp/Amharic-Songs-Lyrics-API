import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { ApiErrorDetail, AppError } from '../types/api.ts';

export interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
  headers?: ZodTypeAny;
}

declare global {
  namespace Express {
    interface Request {
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
        headers?: unknown;
      };
    }
  }
}

function mapZodIssues(
  err: ZodError,
  location: 'body' | 'query' | 'params' | 'headers'
): ApiErrorDetail[] {
  return err.issues.map((issue) => ({
    field: issue.path.join('.') || location,
    location,
    message: issue.message,
  }));
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const details: ApiErrorDetail[] = [];
    const validated: Request['validated'] = {};

    if (schemas.headers) {
      const result = schemas.headers.safeParse(req.headers);
      if (!result.success) {
        details.push(...mapZodIssues(result.error, 'headers'));
      } else {
        validated.headers = result.data;
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        details.push(...mapZodIssues(result.error, 'params'));
      } else {
        validated.params = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        details.push(...mapZodIssues(result.error, 'query'));
      } else {
        validated.query = result.data;
      }
    }

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        details.push(...mapZodIssues(result.error, 'body'));
      } else {
        validated.body = result.data;
      }
    }

    if (details.length > 0) {
      const hasHeaderError = details.some((d) => d.location === 'headers');
      return next(
        new AppError(
          hasHeaderError ? 400 : 422,
          'VALIDATION_ERROR',
          'Request validation failed',
          details
        )
      );
    }

    req.validated = validated;
    return next();
  };
}
