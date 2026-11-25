import { Response } from 'express';
import { ApiMeta, ApiSuccessResponse } from '../types/api.ts';

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta: ApiMeta = {}
): Response {
  const requestId = (res.locals.requestId as string | undefined) ?? undefined;
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: {
      ...(requestId ? { requestId } : {}),
      ...meta,
    },
  };
  return res.status(statusCode).json(body);
}
