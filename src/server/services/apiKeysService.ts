import { logger } from '../config/logger.ts';
import { apiKeysRepository } from '../repositories/apiKeysRepository.ts';
import { auditLogsRepository } from '../repositories/auditLogsRepository.ts';
import { AppError } from '../types/api.ts';
import { generateApiKey } from '../utils/crypto.ts';

export const apiKeysService = {
  async listForUser(ownerId: string) {
    return apiKeysRepository.listByOwner(ownerId);
  },

  async listAll() {
    return apiKeysRepository.listAll();
  },

  async createKey(input: { ownerId: string; name: string; dailyQuota: number }) {
    const { rawKey, keyPrefix, keyHash } = generateApiKey();
    const created = await apiKeysRepository.create({
      keyHash,
      keyPrefix,
      name: input.name,
      ownerId: input.ownerId,
      dailyQuota: input.dailyQuota,
    });

    await auditLogsRepository.create({
      actorId: input.ownerId,
      action: 'API_KEY_CREATED',
      entityType: 'API_KEY',
      entityId: created.id,
      metadata: { name: created.name, keyPrefix: created.keyPrefix, dailyQuota: created.dailyQuota },
    });

    logger.info(
      { event: 'api_key_created', keyId: created.id, keyPrefix: created.keyPrefix },
      'API key provisioned'
    );

    // Raw key is returned strictly once at creation
    return {
      ...created,
      rawKey,
    };
  },

  async updateKey(input: {
    keyId: string;
    actorId: string;
    isAdmin: boolean;
    patch: { name?: string; isActive?: boolean; dailyQuota?: number };
  }) {
    const existing = await apiKeysRepository.findById(input.keyId);
    if (!existing) {
      throw new AppError(404, 'API_KEY_NOT_FOUND', 'API key not found');
    }
    if (!input.isAdmin && existing.ownerId !== input.actorId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to modify this API key');
    }

    const updated = await apiKeysRepository.updateById(input.keyId, input.patch);
    if (!updated) {
      throw new AppError(404, 'API_KEY_NOT_FOUND', 'API key not found');
    }

    await auditLogsRepository.create({
      actorId: input.actorId,
      action: input.patch.isActive === false ? 'API_KEY_DISABLED' : 'API_KEY_UPDATED',
      entityType: 'API_KEY',
      entityId: updated.id,
      metadata: { keyPrefix: updated.keyPrefix, patch: input.patch },
    });

    return updated;
  },

  async regenerateKey(input: { keyId: string; actorId: string; isAdmin: boolean }) {
    const existing = await apiKeysRepository.findById(input.keyId);
    if (!existing) {
      throw new AppError(404, 'API_KEY_NOT_FOUND', 'API key not found');
    }
    if (!input.isAdmin && existing.ownerId !== input.actorId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to regenerate this API key');
    }

    const { rawKey, keyPrefix, keyHash } = generateApiKey();
    const updated = await apiKeysRepository.updateById(input.keyId, {
      keyHash,
      keyPrefix,
      isActive: true,
    });
    if (!updated) {
      throw new AppError(404, 'API_KEY_NOT_FOUND', 'API key not found');
    }

    await auditLogsRepository.create({
      actorId: input.actorId,
      action: 'API_KEY_REGENERATED',
      entityType: 'API_KEY',
      entityId: updated.id,
      metadata: { oldPrefix: existing.keyPrefix, newPrefix: updated.keyPrefix },
    });

    logger.info(
      { event: 'api_key_regenerated', keyId: updated.id, keyPrefix: updated.keyPrefix },
      'API key regenerated'
    );

    return {
      ...updated,
      rawKey,
    };
  },

  async revokeKey(input: { keyId: string; actorId: string; isAdmin: boolean }) {
    const existing = await apiKeysRepository.findById(input.keyId);
    if (!existing) {
      throw new AppError(404, 'API_KEY_NOT_FOUND', 'API key not found');
    }
    if (!input.isAdmin && existing.ownerId !== input.actorId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to revoke this API key');
    }

    const deleted = await apiKeysRepository.deleteById(input.keyId);
    if (!deleted) {
      throw new AppError(404, 'API_KEY_NOT_FOUND', 'API key not found');
    }

    await auditLogsRepository.create({
      actorId: input.actorId,
      action: 'API_KEY_REVOKED',
      entityType: 'API_KEY',
      entityId: deleted.id,
      metadata: { name: deleted.name, keyPrefix: deleted.keyPrefix },
    });

    return deleted;
  },
};
