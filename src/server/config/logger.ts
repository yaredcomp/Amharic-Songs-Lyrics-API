import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'req.headers.cookie',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.refreshToken',
      '*.rawKey',
    ],
    censor: '[REDACTED]',
  },
  base: {
    service: 'amharic-lyrics-api',
  },
});
