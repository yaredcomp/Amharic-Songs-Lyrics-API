import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env.ts';
import { logger } from './config/logger.ts';
import { enforceJsonContentType } from './middleware/contentType.ts';
import { errorHandler, notFoundApiHandler } from './middleware/errorHandler.ts';
import { adminRouter } from './routes/adminRoutes.ts';
import { authRouter } from './routes/authRoutes.ts';
import { developerRouter } from './routes/developerRoutes.ts';
import { docsRouter } from './routes/docsRoutes.ts';
import { healthRouter } from './routes/healthRoutes.ts';
import { publicApiRouter } from './routes/publicApiRoutes.ts';

export function createApiApp() {
  const app = express();
  app.set('trust proxy', 1);

  // Request correlation ID
  app.use((req, res, next) => {
    const requestId =
      (req.headers['x-request-id'] as string | undefined) || crypto.randomUUID();
    res.locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  });

  // Security headers
  app.use(
    helmet({
      xFrameOptions: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            'https://accounts.google.com',
            'https://apis.google.com',
            'https://www.gstatic.com',
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://accounts.google.com',
            'https://fonts.googleapis.com',
          ],
          fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: [
            "'self'",
            'https://accounts.google.com',
            'https://oauth2.googleapis.com',
            'https://www.googleapis.com',
          ],
          frameSrc: [
            "'self'",
            'https://accounts.google.com',
          ],
          frameAncestors: ["'self'", 'https://aistudio.google.com', 'https://*.google.com'],
        },
      },
    })
  );

  // Strict X-Frame-Options on API routes
  app.use('/api', (_req, res, next) => {
    if (!_req.path.startsWith('/docs')) {
      res.setHeader('X-Frame-Options', 'DENY');
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  // CORS allowlist
  const allowedOrigins = new Set(
    [
      env.appUrl,
      ...env.corsOrigin.split(',').map((s) => s.trim()),
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ].filter(Boolean)
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.has(origin) || origin.endsWith('.run.app')) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-api-key',
        'Idempotency-Key',
        'X-Request-Id',
      ],
      exposedHeaders: [
        'X-Request-Id',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-Idempotency-Replayed',
      ],
    })
  );

  // Structured HTTP logging
  app.use(
    pinoHttp({
      logger,
      autoLogging: env.nodeEnv !== 'test',
    })
  );

  // Body parsing with strict size limit
  app.use(express.json({ limit: '100kb' }));

  // Rate limiters
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: env.nodeEnv === 'test' ? 1000 : 120,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many requests, please try again shortly',
          details: [],
        },
      });
    },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.nodeEnv === 'test' ? 500 : 40,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'AUTH_RATE_LIMITED',
          message: 'Too many authentication attempts, please wait before retrying',
          details: [],
        },
      });
    },
  });

  // Health checks
  app.use(healthRouter);

  // OpenAPI & Swagger UI
  app.use('/api', docsRouter);

  // REST API v1
  app.use('/api/v1', apiLimiter, enforceJsonContentType);
  app.use('/api/v1/auth', authLimiter, authRouter);
  app.use('/api/v1/developer', developerRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1', publicApiRouter);

  // API 404 fallback
  app.use('/api', notFoundApiHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}
