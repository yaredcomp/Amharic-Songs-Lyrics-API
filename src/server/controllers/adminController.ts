import { NextFunction, Request, Response } from 'express';
import { apiKeysRepository } from '../repositories/apiKeysRepository.ts';
import { auditLogsRepository } from '../repositories/auditLogsRepository.ts';
import { lyricsRepository, LyricsFilterParams } from '../repositories/lyricsRepository.ts';
import { apiKeysService } from '../services/apiKeysService.ts';
import { lyricsService } from '../services/lyricsService.ts';
import { sendSuccess } from '../utils/response.ts';

export const adminController = {
  async listLyrics(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.validated?.query as LyricsFilterParams;
      const result = await lyricsService.listLyrics(query);
      return sendSuccess(res, result.items, 200, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (err) {
      return next(err);
    }
  },

  async createLyrics(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.validated?.body as {
        title: string;
        titleTranslit: string;
        artist: string;
        album: string;
        lyrics: string;
        language: string;
        genre: string;
        releaseYear?: number | null;
      };
      const created = await lyricsService.createLyrics(req.authUser!.id, body);
      return sendSuccess(res, created, 201);
    } catch (err) {
      return next(err);
    }
  },

  async updateLyrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.validated?.params as { id: string };
      const body = req.validated?.body as Record<string, unknown>;
      const updated = await lyricsService.updateLyrics(req.authUser!.id, id, body);
      return sendSuccess(res, updated, 200);
    } catch (err) {
      return next(err);
    }
  },

  async deleteLyrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.validated?.params as { id: string };
      await lyricsService.deleteLyrics(req.authUser!.id, id);
      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  },

  async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const [catalog, keys] = await Promise.all([
        lyricsRepository.getStats(),
        apiKeysRepository.getStats(),
      ]);
      return sendSuccess(res, { catalog, keys }, 200);
    } catch (err) {
      return next(err);
    }
  },

  async listApiKeys(_req: Request, res: Response, next: NextFunction) {
    try {
      const keys = await apiKeysService.listAll();
      return sendSuccess(res, keys, 200, { total: keys.length });
    } catch (err) {
      return next(err);
    }
  },

  async createApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.validated?.body as { name: string; dailyQuota: number };
      const created = await apiKeysService.createKey({
        ownerId: req.authUser!.id,
        name: body.name,
        dailyQuota: body.dailyQuota,
      });
      return sendSuccess(res, created, 201);
    } catch (err) {
      return next(err);
    }
  },

  async updateApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.validated?.params as { id: string };
      const body = req.validated?.body as {
        name?: string;
        isActive?: boolean;
        dailyQuota?: number;
      };
      const updated = await apiKeysService.updateKey({
        keyId: id,
        actorId: req.authUser!.id,
        isAdmin: true,
        patch: body,
      });
      return sendSuccess(res, updated, 200);
    } catch (err) {
      return next(err);
    }
  },

  async regenerateApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.validated?.params as { id: string };
      const regenerated = await apiKeysService.regenerateKey({
        keyId: id,
        actorId: req.authUser!.id,
        isAdmin: true,
      });
      return sendSuccess(res, regenerated, 200);
    } catch (err) {
      return next(err);
    }
  },

  async deleteApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.validated?.params as { id: string };
      await apiKeysService.revokeKey({
        keyId: id,
        actorId: req.authUser!.id,
        isAdmin: true,
      });
      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  },

  async listAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.validated?.query as {
        page: number;
        limit: number;
        entityType?: string;
        action?: string;
      };
      const result = await auditLogsRepository.list(query);
      return sendSuccess(res, result.items, 200, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (err) {
      return next(err);
    }
  },
};
