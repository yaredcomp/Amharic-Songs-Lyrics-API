import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { refreshTokens } from '../../db/schema.ts';

export const tokensRepository = {
  async saveRefreshToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    try {
      const rows = await db.insert(refreshTokens).values(input).returning();
      return rows[0];
    } catch (error) {
      console.error('Database query failed (tokens.saveRefreshToken):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async findValidRefreshToken(tokenHash: string) {
    try {
      const rows = await db
        .select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.tokenHash, tokenHash),
            isNull(refreshTokens.revokedAt),
            gt(refreshTokens.expiresAt, new Date())
          )
        )
        .limit(1);
      return rows[0] ?? null;
    } catch (error) {
      console.error('Database query failed (tokens.findValidRefreshToken):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async revokeRefreshToken(tokenHash: string) {
    try {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.tokenHash, tokenHash));
    } catch (error) {
      console.error('Database query failed (tokens.revokeRefreshToken):', error);
    }
  },
};
