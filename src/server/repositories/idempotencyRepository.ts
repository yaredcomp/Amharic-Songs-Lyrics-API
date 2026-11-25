import { and, eq, gt } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { idempotencyKeys } from '../../db/schema.ts';

export const idempotencyRepository = {
  async findRecord(params: {
    key: string;
    actorScope: string;
    method: string;
    path: string;
  }) {
    try {
      const rows = await db
        .select()
        .from(idempotencyKeys)
        .where(
          and(
            eq(idempotencyKeys.key, params.key),
            eq(idempotencyKeys.actorScope, params.actorScope),
            eq(idempotencyKeys.method, params.method),
            eq(idempotencyKeys.path, params.path),
            gt(idempotencyKeys.expiresAt, new Date())
          )
        )
        .limit(1);
      return rows[0] ?? null;
    } catch (error) {
      console.error('Database query failed (idempotency.findRecord):', error);
      return null;
    }
  },

  async saveRecord(input: {
    key: string;
    actorScope: string;
    method: string;
    path: string;
    requestHash: string;
    statusCode: number;
    responseBody: Record<string, unknown>;
  }) {
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db
        .insert(idempotencyKeys)
        .values({
          ...input,
          expiresAt,
        })
        .onConflictDoNothing();
    } catch (error) {
      console.error('Database query failed (idempotency.saveRecord):', error);
    }
  },
};
