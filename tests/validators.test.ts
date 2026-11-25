import { describe, expect, it } from 'vitest';
import {
  apiKeyHeaderSchema,
  createApiKeySchema,
  createLyricsSchema,
  lyricsQuerySchema,
  patchLyricsSchema,
  registerSchema,
  uuidParamSchema,
} from '../src/server/validators/schemas.ts';

describe('Zod Request Validation Schemas', () => {
  it('validates and coerces lyrics pagination and sorting query params', () => {
    const parsed = lyricsQuerySchema.parse({
      page: '2',
      limit: '25',
      search: '  Tizita ',
      sortBy: 'views',
      order: 'asc',
    });

    expect(parsed).toEqual({
      page: 2,
      limit: 25,
      search: 'Tizita',
      sortBy: 'views',
      order: 'asc',
    });

    const invalid = lyricsQuerySchema.safeParse({ limit: '500', sortBy: 'unknown' });
    expect(invalid.success).toBe(false);
  });

  it('rejects malformed UUIDs and short API keys', () => {
    expect(uuidParamSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
    expect(
      uuidParamSchema.safeParse({ id: '550e8400-e29b-41d4-a716-446655440000' }).success
    ).toBe(true);

    expect(apiKeyHeaderSchema.safeParse({ 'x-api-key': 'short' }).success).toBe(false);
    expect(
      apiKeyHeaderSchema.safeParse({ 'x-api-key': 'amlp_live_1234567890abcdef' }).success
    ).toBe(true);
  });

  it('validates createLyrics, partial patchLyrics, register, and createApiKey payloads', () => {
    const validTrack = createLyricsSchema.safeParse({
      title: 'ትዝታ',
      titleTranslit: 'Tizita',
      artist: 'Aster Aweke',
      album: 'Aster',
      lyrics: 'ትዝታው መጣብኝ የጥንቱ ዘመን\nበልቤ ጓዳ ውስጥ',
      genre: 'Tizita',
      releaseYear: 1989,
    });
    expect(validTrack.success).toBe(true);

    expect(patchLyricsSchema.safeParse({}).success).toBe(false);
    expect(patchLyricsSchema.safeParse({ genre: 'Ethio-Jazz' }).success).toBe(true);

    expect(
      registerSchema.safeParse({
        name: 'Abebe Bikila',
        email: 'ABEBE@EXAMPLE.COM',
        password: 'StrongPassword123',
      }).success
    ).toBe(true);

    expect(
      createApiKeySchema.safeParse({
        name: 'Production Web App',
        dailyQuota: 5000,
      }).success
    ).toBe(true);
  });
});
