import { NextFunction, Request, Response } from 'express';
import { apiKeysRepository } from '../repositories/apiKeysRepository.ts';
import { apiKeysService } from '../services/apiKeysService.ts';
import { sendSuccess } from '../utils/response.ts';

export const developerController = {
  async listKeys(req: Request, res: Response, next: NextFunction) {
    try {
      const keys = await apiKeysService.listForUser(req.authUser!.id);
      return sendSuccess(res, keys, 200, { total: keys.length });
    } catch (err) {
      return next(err);
    }
  },

  async createKey(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.validated?.body as { name: string; dailyQuota: number };
      const created = await apiKeysService.createKey({
        ownerId: req.authUser!.id,
        name: body.name,
        dailyQuota: Math.min(body.dailyQuota, 10000),
      });
      return sendSuccess(res, created, 201);
    } catch (err) {
      return next(err);
    }
  },

  async updateKey(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.validated?.params as { id: string };
      const body = req.validated?.body as { name?: string; isActive?: boolean };
      const updated = await apiKeysService.updateKey({
        keyId: id,
        actorId: req.authUser!.id,
        isAdmin: req.authUser!.role === 'ADMIN',
        patch: { name: body.name, isActive: body.isActive },
      });
      return sendSuccess(res, updated, 200);
    } catch (err) {
      return next(err);
    }
  },

  async regenerateKey(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.validated?.params as { id: string };
      const regenerated = await apiKeysService.regenerateKey({
        keyId: id,
        actorId: req.authUser!.id,
        isAdmin: req.authUser!.role === 'ADMIN',
      });
      return sendSuccess(res, regenerated, 200);
    } catch (err) {
      return next(err);
    }
  },

  async revokeKey(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.validated?.params as { id: string };
      await apiKeysService.revokeKey({
        keyId: id,
        actorId: req.authUser!.id,
        isAdmin: req.authUser!.role === 'ADMIN',
      });
      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  },

  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const analytics = await apiKeysRepository.getAnalytics(
        req.authUser!.role === 'ADMIN' ? undefined : req.authUser!.id
      );
      return sendSuccess(res, analytics, 200);
    } catch (err) {
      return next(err);
    }
  },
};
