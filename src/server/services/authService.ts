import { env } from '../config/env.ts';
import { logger } from '../config/logger.ts';
import { auditLogsRepository } from '../repositories/auditLogsRepository.ts';
import { tokensRepository } from '../repositories/tokensRepository.ts';
import { usersRepository } from '../repositories/usersRepository.ts';
import { AppError, AuthenticatedUser } from '../types/api.ts';
import {
  hashPassword,
  sha256Hex,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from '../utils/crypto.ts';

function toPublicUser(user: {
  id: string;
  uid: string | null;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}): AuthenticatedUser {
  return {
    id: user.id,
    uid: user.uid,
    name: user.name,
    email: user.email,
    role: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
    isActive: user.isActive,
  };
}

async function issueTokenPair(user: {
  id: string;
  uid: string | null;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}) {
  const role = user.role === 'ADMIN' ? 'ADMIN' : 'USER';
  const accessToken = signAccessToken({ id: user.id, email: user.email, role });
  const refresh = signRefreshToken({ id: user.id, email: user.email, role });

  await tokensRepository.saveRefreshToken({
    userId: user.id,
    tokenHash: refresh.tokenHash,
    expiresAt: refresh.expiresAt,
  });

  return {
    user: toPublicUser(user),
    accessToken,
    refreshToken: refresh.token,
    expiresIn: env.jwtAccessExpiresIn,
  };
}

export const authService = {
  async register(input: { name: string; email: string; password: string }) {
    const existing = await usersRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);
    const created = await usersRepository.createUser({
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'USER',
    });

    await auditLogsRepository.create({
      actorId: created.id,
      action: 'USER_REGISTERED',
      entityType: 'USER',
      entityId: created.id,
      metadata: { email: created.email },
    });

    logger.info({ event: 'user_registered', userId: created.id }, 'Developer registered');
    return issueTokenPair(created);
  },

  async login(input: { email: string; password: string }) {
    const user = await usersRepository.findByEmail(input.email);
    if (!user || !user.passwordHash) {
      logger.warn({ event: 'login_failed', email: input.email }, 'Invalid credentials');
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (!user.isActive) {
      throw new AppError(403, 'ACCOUNT_DISABLED', 'User account is disabled');
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      logger.warn({ event: 'login_failed', userId: user.id }, 'Invalid password');
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    logger.info({ event: 'user_logged_in', userId: user.id }, 'User authenticated');
    return issueTokenPair(user);
  },

  async refresh(refreshToken: string) {
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
    }

    const tokenHash = sha256Hex(refreshToken);
    const stored = await tokensRepository.findValidRefreshToken(tokenHash);
    if (!stored) {
      throw new AppError(401, 'REFRESH_TOKEN_REVOKED', 'Refresh token has been revoked or expired');
    }

    await tokensRepository.revokeRefreshToken(tokenHash);

    const user = await usersRepository.findById(decoded.sub);
    if (!user || !user.isActive) {
      throw new AppError(401, 'UNAUTHORIZED', 'Account is inactive or not found');
    }

    return issueTokenPair(user);
  },

  async logout(refreshToken?: string) {
    if (refreshToken) {
      await tokensRepository.revokeRefreshToken(sha256Hex(refreshToken));
    }
  },

  async getBootstrapStatus() {
    const adminCount = await usersRepository.countAdmins();
    return {
      needsAdminBootstrap: adminCount === 0,
      requiresPasscode: true,
      bootstrapAvailable: env.adminPasscode.length >= 32,
      allowlistedAdminConfigured: Boolean(env.adminEmail),
    };
  },

  async bootstrapAdmin(input: {
    name: string;
    email: string;
    password: string;
    passcode: string;
  }) {
    if (env.adminPasscode.length < 32) {
      throw new AppError(
        503,
        'ADMIN_BOOTSTRAP_NOT_CONFIGURED',
        'Administrator bootstrap is disabled until a passcode of at least 32 characters is configured'
      );
    }

    if (input.passcode !== env.adminPasscode) {
      throw new AppError(403, 'INVALID_ADMIN_PASSCODE', 'Invalid administrator setup passcode');
    }

    const passwordHash = await hashPassword(input.password);
    const claim = await usersRepository.claimFirstAdmin({
      name: input.name,
      email: input.email,
      passwordHash,
    });

    if (claim.status === 'already-claimed') {
      throw new AppError(
        409,
        'ADMIN_ALREADY_CLAIMED',
        'An administrator account has already been configured'
      );
    }
    if (claim.status === 'email-exists') {
      throw new AppError(409, 'EMAIL_EXISTS', 'Account already exists with this email');
    }

    const admin = claim.user;

    await auditLogsRepository.create({
      actorId: admin.id,
      action: 'ADMIN_BOOTSTRAPPED',
      entityType: 'USER',
      entityId: admin.id,
      metadata: { email: admin.email },
    });

    logger.info({ event: 'admin_bootstrapped', userId: admin.id }, 'Initial admin account claimed');
    return issueTokenPair(admin);
  },

  async updateProfile(userId: string, name: string) {
    const updated = await usersRepository.updateProfile(userId, name);
    if (!updated) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }
    return toPublicUser(updated);
  },
};
