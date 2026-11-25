import { and, asc, count, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { lyrics } from '../../db/schema.ts';

export type LyricsRecord = typeof lyrics.$inferSelect;

export interface LyricsFilterParams {
  page: number;
  limit: number;
  artist?: string;
  genre?: string;
  search?: string;
  sortBy: 'createdAt' | 'views' | 'title' | 'artist' | 'releaseYear';
  order: 'asc' | 'desc';
}

export const lyricsRepository = {
  async findMany(params: LyricsFilterParams) {
    try {
      const conditions = [isNull(lyrics.deletedAt)];

      if (params.artist) {
        conditions.push(ilike(lyrics.artist, `%${params.artist}%`));
      }
      if (params.genre) {
        conditions.push(ilike(lyrics.genre, `%${params.genre}%`));
      }
      if (params.search) {
        const pattern = `%${params.search}%`;
        const searchCond = or(
          ilike(lyrics.title, pattern),
          ilike(lyrics.titleTranslit, pattern),
          ilike(lyrics.artist, pattern),
          ilike(lyrics.album, pattern),
          ilike(lyrics.lyrics, pattern)
        );
        if (searchCond) conditions.push(searchCond);
      }

      const whereClause = and(...conditions);

      const sortCol =
        params.sortBy === 'views'
          ? lyrics.views
          : params.sortBy === 'title'
            ? lyrics.title
            : params.sortBy === 'artist'
              ? lyrics.artist
              : params.sortBy === 'releaseYear'
                ? lyrics.releaseYear
                : lyrics.createdAt;

      const orderExpr = params.order === 'asc' ? asc(sortCol) : desc(sortCol);
      const offset = (params.page - 1) * params.limit;

      const [items, totalRows] = await Promise.all([
        db
          .select()
          .from(lyrics)
          .where(whereClause)
          .orderBy(orderExpr, desc(lyrics.createdAt))
          .limit(params.limit)
          .offset(offset),
        db.select({ total: count() }).from(lyrics).where(whereClause),
      ]);

      const total = Number(totalRows[0]?.total ?? 0);
      return {
        items,
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      };
    } catch (error) {
      console.error('Database query failed (lyrics.findMany):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async findById(id: string, incrementViews = false): Promise<LyricsRecord | null> {
    try {
      if (incrementViews) {
        const updated = await db
          .update(lyrics)
          .set({
            views: sql`${lyrics.views} + 1`,
          })
          .where(and(eq(lyrics.id, id), isNull(lyrics.deletedAt)))
          .returning();
        return updated[0] ?? null;
      }
      const rows = await db
        .select()
        .from(lyrics)
        .where(and(eq(lyrics.id, id), isNull(lyrics.deletedAt)))
        .limit(1);
      return rows[0] ?? null;
    } catch (error) {
      console.error('Database query failed (lyrics.findById):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async findPopular(limit = 10): Promise<LyricsRecord[]> {
    try {
      return await db
        .select()
        .from(lyrics)
        .where(isNull(lyrics.deletedAt))
        .orderBy(desc(lyrics.views))
        .limit(limit);
    } catch (error) {
      console.error('Database query failed (lyrics.findPopular):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async findRecent(limit = 10): Promise<LyricsRecord[]> {
    try {
      return await db
        .select()
        .from(lyrics)
        .where(isNull(lyrics.deletedAt))
        .orderBy(desc(lyrics.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Database query failed (lyrics.findRecent):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async findArtists() {
    try {
      const rows = await db
        .select({
          artist: lyrics.artist,
          trackCount: count(),
          totalViews: sql<number>`coalesce(sum(${lyrics.views}), 0)`,
          genres: sql<string[]>`array_agg(distinct ${lyrics.genre})`,
        })
        .from(lyrics)
        .where(isNull(lyrics.deletedAt))
        .groupBy(lyrics.artist)
        .orderBy(desc(sql`coalesce(sum(${lyrics.views}), 0)`));

      return rows.map((r) => ({
        name: r.artist,
        trackCount: Number(r.trackCount),
        totalViews: Number(r.totalViews),
        genres: r.genres ?? [],
      }));
    } catch (error) {
      console.error('Database query failed (lyrics.findArtists):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async findArtistByName(name: string) {
    try {
      const tracks = await db
        .select()
        .from(lyrics)
        .where(and(ilike(lyrics.artist, name), isNull(lyrics.deletedAt)))
        .orderBy(desc(lyrics.views));

      if (tracks.length === 0) {
        // fallback partial match if exact case-insensitive name had no tracks
        const partial = await db
          .select()
          .from(lyrics)
          .where(and(ilike(lyrics.artist, `%${name}%`), isNull(lyrics.deletedAt)))
          .orderBy(desc(lyrics.views));
        if (partial.length === 0) return null;
        return {
          name: partial[0].artist,
          trackCount: partial.length,
          totalViews: partial.reduce((acc, t) => acc + t.views, 0),
          genres: Array.from(new Set(partial.map((t) => t.genre))),
          tracks: partial,
        };
      }

      return {
        name: tracks[0].artist,
        trackCount: tracks.length,
        totalViews: tracks.reduce((acc, t) => acc + t.views, 0),
        genres: Array.from(new Set(tracks.map((t) => t.genre))),
        tracks,
      };
    } catch (error) {
      console.error('Database query failed (lyrics.findArtistByName):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async create(input: {
    title: string;
    titleTranslit: string;
    artist: string;
    album: string;
    lyrics: string;
    language: string;
    genre: string;
    releaseYear?: number | null;
  }): Promise<LyricsRecord> {
    try {
      const rows = await db
        .insert(lyrics)
        .values({
          title: input.title,
          titleTranslit: input.titleTranslit,
          artist: input.artist,
          album: input.album,
          lyrics: input.lyrics,
          language: input.language,
          genre: input.genre,
          releaseYear: input.releaseYear ?? null,
        })
        .returning();
      return rows[0];
    } catch (error) {
      console.error('Database query failed (lyrics.create):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async update(
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
  ): Promise<LyricsRecord | null> {
    try {
      const rows = await db
        .update(lyrics)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(and(eq(lyrics.id, id), isNull(lyrics.deletedAt)))
        .returning();
      return rows[0] ?? null;
    } catch (error) {
      console.error('Database query failed (lyrics.update):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async softDelete(id: string): Promise<LyricsRecord | null> {
    try {
      const rows = await db
        .update(lyrics)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(lyrics.id, id), isNull(lyrics.deletedAt)))
        .returning();
      return rows[0] ?? null;
    } catch (error) {
      console.error('Database query failed (lyrics.softDelete):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async getStats() {
    try {
      const [counts] = await db
        .select({
          totalLyrics: count(),
          totalViews: sql<number>`coalesce(sum(${lyrics.views}), 0)`,
          totalArtists: sql<number>`count(distinct ${lyrics.artist})`,
          totalGenres: sql<number>`count(distinct ${lyrics.genre})`,
        })
        .from(lyrics)
        .where(isNull(lyrics.deletedAt));

      return {
        totalLyrics: Number(counts?.totalLyrics ?? 0),
        totalViews: Number(counts?.totalViews ?? 0),
        totalArtists: Number(counts?.totalArtists ?? 0),
        totalGenres: Number(counts?.totalGenres ?? 0),
      };
    } catch (error) {
      console.error('Database query failed (lyrics.getStats):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },
};
