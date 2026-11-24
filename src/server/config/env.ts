import crypto from 'node:crypto';

const ephemeralAccessSecret = crypto.randomBytes(32).toString('hex');
const ephemeralRefreshSecret = crypto.randomBytes(32).toString('hex');

export const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || ephemeralAccessSecret,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || ephemeralRefreshSecret,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresDays: Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 7),
  corsOrigin: process.env.CORS_ORIGIN || '',
  appUrl: process.env.APP_URL || '',
  adminEmail: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  adminPasscode: (process.env.ADMIN_PASSCODE || '').trim(),
};
