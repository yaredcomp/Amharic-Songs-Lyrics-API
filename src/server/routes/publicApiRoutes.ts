import { Router } from 'express';
import { lyricsController } from '../controllers/lyricsController.ts';
import { requireApiKey } from '../middleware/authMiddleware.ts';
import { methodNotAllowedHandler } from '../middleware/errorHandler.ts';
import { validate } from '../middleware/validate.ts';
import { lyricsService } from '../services/lyricsService.ts';
import { sendSuccess } from '../utils/response.ts';
import {
  apiKeyHeaderSchema,
  artistNameParamSchema,
  lyricsQuerySchema,
  uuidParamSchema,
} from '../validators/schemas.ts';

export const publicApiRouter = Router();

// Unauthenticated lightweight landing preview metadata (no full lyrics bodies exposed)
publicApiRouter.get('/portal/preview', async (_req, res, next) => {
  try {
    const [popular, artists] = await Promise.all([
      lyricsService.getPopularLyrics(4),
      lyricsService.listArtists(),
    ]);
    return sendSuccess(res, {
      featured: popular.map((item) => ({
        id: item.id,
        title: item.title,
        titleTranslit: item.titleTranslit,
        artist: item.artist,
        album: item.album,
        genre: item.genre,
        releaseYear: item.releaseYear,
        views: item.views,
        excerpt: item.lyrics.split('\n').slice(0, 2).join('\n'),
      })),
      artistsCount: artists.length,
    });
  } catch (err) {
    return next(err);
  }
});

// Public REST API routes requiring x-api-key
publicApiRouter
  .route('/lyrics')
  .get(
    requireApiKey,
    validate({ headers: apiKeyHeaderSchema, query: lyricsQuerySchema }),
    lyricsController.list
  )
  .all(methodNotAllowedHandler(['GET', 'HEAD', 'OPTIONS']));

publicApiRouter
  .route('/lyrics/popular')
  .get(requireApiKey, validate({ headers: apiKeyHeaderSchema }), lyricsController.popular)
  .all(methodNotAllowedHandler(['GET', 'HEAD', 'OPTIONS']));

publicApiRouter
  .route('/lyrics/recent')
  .get(requireApiKey, validate({ headers: apiKeyHeaderSchema }), lyricsController.recent)
  .all(methodNotAllowedHandler(['GET', 'HEAD', 'OPTIONS']));

publicApiRouter
  .route('/lyrics/:id')
  .get(
    requireApiKey,
    validate({ headers: apiKeyHeaderSchema, params: uuidParamSchema }),
    lyricsController.getById
  )
  .all(methodNotAllowedHandler(['GET', 'HEAD', 'OPTIONS']));

publicApiRouter
  .route('/artists')
  .get(requireApiKey, validate({ headers: apiKeyHeaderSchema }), lyricsController.listArtists)
  .all(methodNotAllowedHandler(['GET', 'HEAD', 'OPTIONS']));

publicApiRouter
  .route('/artists/:name')
  .get(
    requireApiKey,
    validate({ headers: apiKeyHeaderSchema, params: artistNameParamSchema }),
    lyricsController.getArtist
  )
  .all(methodNotAllowedHandler(['GET', 'HEAD', 'OPTIONS']));
