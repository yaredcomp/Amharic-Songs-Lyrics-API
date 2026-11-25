import { logger } from '../config/logger.ts';
import { auditLogsRepository } from '../repositories/auditLogsRepository.ts';
import { LyricsFilterParams, lyricsRepository } from '../repositories/lyricsRepository.ts';
import { AppError } from '../types/api.ts';

export const lyricsService = {
  async listLyrics(params: LyricsFilterParams) {
    return lyricsRepository.findMany(params);
  },

  async getLyricsById(id: string, incrementViews = true) {
    const item = await lyricsRepository.findById(id, incrementViews);
    if (!item) {
      throw new AppError(404, 'LYRICS_NOT_FOUND', 'Lyrics track not found');
    }
    return item;
  },

  async getPopularLyrics(limit = 10) {
    return lyricsRepository.findPopular(limit);
  },

  async getRecentLyrics(limit = 10) {
    return lyricsRepository.findRecent(limit);
  },

  async listArtists() {
    return lyricsRepository.findArtists();
  },

  async getArtistByName(name: string) {
    const artist = await lyricsRepository.findArtistByName(name);
    if (!artist) {
      throw new AppError(404, 'ARTIST_NOT_FOUND', `Artist "${name}" not found`);
    }
    return artist;
  },

  async createLyrics(
    actorId: string,
    input: {
      title: string;
      titleTranslit: string;
      artist: string;
      album: string;
      lyrics: string;
      language: string;
      genre: string;
      releaseYear?: number | null;
    }
  ) {
    const created = await lyricsRepository.create(input);
    await auditLogsRepository.create({
      actorId,
      action: 'LYRICS_CREATED',
      entityType: 'LYRICS',
      entityId: created.id,
      metadata: { title: created.title, artist: created.artist },
    });
    logger.info({ event: 'admin_lyrics_created', lyricsId: created.id, actorId }, 'Lyrics created');
    return created;
  },

  async updateLyrics(
    actorId: string,
    id: string,
    input: Partial<{
      title: string;
      titleTranslit: string;
      artist: string;
      album: string;
      lyrics: string;
      language: string;
      genre: string;
      releaseYear: number | null;
    }>
  ) {
    const updated = await lyricsRepository.update(id, input);
    if (!updated) {
      throw new AppError(404, 'LYRICS_NOT_FOUND', 'Lyrics track not found');
    }
    await auditLogsRepository.create({
      actorId,
      action: 'LYRICS_UPDATED',
      entityType: 'LYRICS',
      entityId: updated.id,
      metadata: { title: updated.title, fields: Object.keys(input) },
    });
    logger.info({ event: 'admin_lyrics_updated', lyricsId: updated.id, actorId }, 'Lyrics updated');
    return updated;
  },

  async deleteLyrics(actorId: string, id: string) {
    const deleted = await lyricsRepository.softDelete(id);
    if (!deleted) {
      throw new AppError(404, 'LYRICS_NOT_FOUND', 'Lyrics track not found');
    }
    await auditLogsRepository.create({
      actorId,
      action: 'LYRICS_DELETED',
      entityType: 'LYRICS',
      entityId: deleted.id,
      metadata: { title: deleted.title, artist: deleted.artist },
    });
    logger.info({ event: 'admin_lyrics_deleted', lyricsId: deleted.id, actorId }, 'Lyrics soft-deleted');
    return deleted;
  },
};
