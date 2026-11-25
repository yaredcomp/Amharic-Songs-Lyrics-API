import { NextFunction, Request, Response } from 'express';
import { lyricsService } from '../services/lyricsService.ts';
import { LyricsFilterParams } from '../repositories/lyricsRepository.ts';
import { sendSuccess } from '../utils/response.ts';

export const lyricsController = {
  async list(req: Request, res: Response, next: NextFunction) {
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

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.validated?.params as { id: string };
      const item = await lyricsService.getLyricsById(id, true);
      return sendSuccess(res, item, 200);
    } catch (err) {
      return next(err);
    }
  },

  async popular(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await lyricsService.getPopularLyrics(10);
      return sendSuccess(res, items, 200, { total: items.length });
    } catch (err) {
      return next(err);
    }
  },

  async recent(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await lyricsService.getRecentLyrics(10);
      return sendSuccess(res, items, 200, { total: items.length });
    } catch (err) {
      return next(err);
    }
  },

  async listArtists(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await lyricsService.listArtists();
      return sendSuccess(res, items, 200, { total: items.length });
    } catch (err) {
      return next(err);
    }
  },

  async getArtist(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.validated?.params as { name: string };
      const artist = await lyricsService.getArtistByName(name);
      return sendSuccess(res, artist, 200);
    } catch (err) {
      return next(err);
    }
  },
};
