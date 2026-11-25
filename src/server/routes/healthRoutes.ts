import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { sendSuccess } from '../utils/response.ts';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  return sendSuccess(res, {
    status: 'ok',
    service: 'amharic-lyrics-api',
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/health/live', (_req, res) => {
  return sendSuccess(res, {
    status: 'live',
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

healthRouter.get('/health/ready', async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    return sendSuccess(res, {
      status: 'ready',
      database: 'connected',
    });
  } catch {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database connection is not ready',
        details: [],
      },
    });
  }
});
