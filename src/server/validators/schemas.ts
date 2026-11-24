import { z } from 'zod';

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid UUID identifier'),
});

export const artistNameParamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Artist name is required')
    .max(120, 'Artist name is too long'),
});

export const lyricsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  artist: z.string().trim().max(120).optional(),
  genre: z.string().trim().max(80).optional(),
  search: z.string().trim().max(200).optional(),
  sortBy: z.enum(['createdAt', 'views', 'title', 'artist', 'releaseYear']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const apiKeyHeaderSchema = z.object({
  'x-api-key': z
    .string()
    .trim()
    .min(16, 'API key is malformed')
    .max(128, 'API key is too long'),
});

export const createLyricsSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  titleTranslit: z.string().trim().min(1, 'Transliterated title is required').max(200),
  artist: z.string().trim().min(1, 'Artist is required').max(150),
  album: z.string().trim().min(1, 'Album is required').max(150),
  lyrics: z.string().trim().min(10, 'Lyrics must be at least 10 characters').max(20000),
  language: z.string().trim().min(2).max(10).default('am'),
  genre: z.string().trim().min(1, 'Genre is required').max(80),
  releaseYear: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
});

export const updateLyricsSchema = createLyricsSchema;

export const patchLyricsSchema = createLyricsSchema
  .extend({
    language: z.string().trim().min(2).max(10),
  })
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Valid email address is required').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email address is required').toLowerCase(),
  password: z.string().min(1, 'Password is required').max(128),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10, 'Refresh token is required'),
});

export const bootstrapAdminSchema = z.object({
  name: z.string().trim().min(2).max(100).default('Platform Admin'),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(128),
  passcode: z.string().min(32).max(128),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

export const createApiKeySchema = z.object({
  name: z.string().trim().min(2, 'Key name must be at least 2 characters').max(80),
  dailyQuota: z.coerce.number().int().min(10).max(1000000).default(1000),
});

export const updateApiKeySchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    isActive: z.boolean().optional(),
    dailyQuota: z.coerce.number().int().min(10).max(1000000).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one property must be updated',
  });

export const auditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  entityType: z.string().trim().max(50).optional(),
  action: z.string().trim().max(80).optional(),
});
