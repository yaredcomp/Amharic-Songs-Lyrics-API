import { count, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { apiKeys, apiUsageLogs, users } from '../../db/schema.ts';

export type ApiKeyRecord = typeof apiKeys.$inferSelect;

export const apiKeysRepository = {
  async findByHash(keyHash: string): Promise<ApiKeyRecord | null> {
    try {
      const rows = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.keyHash, keyHash))
        .limit(1);
      return rows[0] ?? null;
    } catch (error) {
      console.error('Database query failed (apiKeys.findByHash):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async findById(id: string): Promise<ApiKeyRecord | null> {
    try {
      const rows = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
      return rows[0] ?? null;
    } catch (error) {
      console.error('Database query failed (apiKeys.findById):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async listByOwner(ownerId: string) {
    try {
      return await db
        .select({
          id: apiKeys.id,
          keyPrefix: apiKeys.keyPrefix,
          name: apiKeys.name,
          ownerId: apiKeys.ownerId,
          isActive: apiKeys.isActive,
          requestsUsed: apiKeys.requestsUsed,
          dailyQuota: apiKeys.dailyQuota,
          lastUsedAt: apiKeys.lastUsedAt,
          createdAt: apiKeys.createdAt,
          updatedAt: apiKeys.updatedAt,
        })
        .from(apiKeys)
        .where(eq(apiKeys.ownerId, ownerId))
        .orderBy(desc(apiKeys.createdAt));
    } catch (error) {
      console.error('Database query failed (apiKeys.listByOwner):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async listAll() {
    try {
      return await db
        .select({
          id: apiKeys.id,
          keyPrefix: apiKeys.keyPrefix,
          name: apiKeys.name,
          ownerId: apiKeys.ownerId,
          ownerEmail: users.email,
          ownerName: users.name,
          isActive: apiKeys.isActive,
          requestsUsed: apiKeys.requestsUsed,
          dailyQuota: apiKeys.dailyQuota,
          lastUsedAt: apiKeys.lastUsedAt,
          createdAt: apiKeys.createdAt,
          updatedAt: apiKeys.updatedAt,
        })
        .from(apiKeys)
        .leftJoin(users, eq(apiKeys.ownerId, users.id))
        .orderBy(desc(apiKeys.createdAt));
    } catch (error) {
      console.error('Database query failed (apiKeys.listAll):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async create(input: {
    keyHash: string;
    keyPrefix: string;
    name: string;
    ownerId: string;
    dailyQuota: number;
  }) {
    try {
      const rows = await db
        .insert(apiKeys)
        .values({
          keyHash: input.keyHash,
          keyPrefix: input.keyPrefix,
          name: input.name,
          ownerId: input.ownerId,
          dailyQuota: input.dailyQuota,
        })
        .returning({
          id: apiKeys.id,
          keyPrefix: apiKeys.keyPrefix,
          name: apiKeys.name,
          ownerId: apiKeys.ownerId,
          isActive: apiKeys.isActive,
          requestsUsed: apiKeys.requestsUsed,
          dailyQuota: apiKeys.dailyQuota,
          lastUsedAt: apiKeys.lastUsedAt,
          createdAt: apiKeys.createdAt,
          updatedAt: apiKeys.updatedAt,
        });
      return rows[0];
    } catch (error) {
      console.error('Database query failed (apiKeys.create):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async updateById(
    id: string,
    patch: Partial<{ name: string; isActive: boolean; dailyQuota: number; keyHash: string; keyPrefix: string }>
  ) {
    try {
      const rows = await db
        .update(apiKeys)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(eq(apiKeys.id, id))
        .returning({
          id: apiKeys.id,
          keyPrefix: apiKeys.keyPrefix,
          name: apiKeys.name,
          ownerId: apiKeys.ownerId,
          isActive: apiKeys.isActive,
          requestsUsed: apiKeys.requestsUsed,
          dailyQuota: apiKeys.dailyQuota,
          lastUsedAt: apiKeys.lastUsedAt,
          createdAt: apiKeys.createdAt,
          updatedAt: apiKeys.updatedAt,
        });
      return rows[0] ?? null;
    } catch (error) {
      console.error('Database query failed (apiKeys.updateById):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async deleteById(id: string) {
    try {
      const rows = await db
        .delete(apiKeys)
        .where(eq(apiKeys.id, id))
        .returning({ id: apiKeys.id, name: apiKeys.name, keyPrefix: apiKeys.keyPrefix });
      return rows[0] ?? null;
    } catch (error) {
      console.error('Database query failed (apiKeys.deleteById):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async incrementUsage(apiKeyId: string) {
    try {
      await db
        .update(apiKeys)
        .set({
          requestsUsed: sql`${apiKeys.requestsUsed} + 1`,
          lastUsedAt: new Date(),
        })
        .where(eq(apiKeys.id, apiKeyId));
    } catch (error) {
      console.error('Database query failed (apiKeys.incrementUsage):', error);
    }
  },

  async logUsageEvent(input: {
    apiKeyId: string | null;
    ownerId: string | null;
    method: string;
    endpoint: string;
    statusCode: number;
    latencyMs: number;
  }) {
    try {
      await db.insert(apiUsageLogs).values(input);
    } catch (error) {
      console.error('Database query failed (apiKeys.logUsageEvent):', error);
    }
  },

  async getStats() {
    try {
      const [keyAgg] = await db
        .select({
          totalKeys: count(),
          activeKeys: sql<number>`count(*) filter (where ${apiKeys.isActive} = true)`,
          totalRequests: sql<number>`coalesce(sum(${apiKeys.requestsUsed}), 0)`,
        })
        .from(apiKeys);

      const [usageAgg] = await db
        .select({
          loggedEvents: count(),
          avgLatencyMs: sql<number>`coalesce(round(avg(${apiUsageLogs.latencyMs})), 0)`,
        })
        .from(apiUsageLogs);

      return {
        totalKeys: Number(keyAgg?.totalKeys ?? 0),
        activeKeys: Number(keyAgg?.activeKeys ?? 0),
        totalRequests: Number(keyAgg?.totalRequests ?? 0),
        loggedEvents: Number(usageAgg?.loggedEvents ?? 0),
        avgLatencyMs: Number(usageAgg?.avgLatencyMs ?? 0),
      };
    } catch (error) {
      console.error('Database query failed (apiKeys.getStats):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async getAnalytics(ownerId?: string) {
    try {
      const whereCond = ownerId ? eq(apiUsageLogs.ownerId, ownerId) : undefined;

      const [summary] = await db
        .select({
          totalCalls: count(),
          avgLatencyMs: sql<number>`coalesce(round(avg(${apiUsageLogs.latencyMs})), 0)`,
          successCalls: sql<number>`count(*) filter (where ${apiUsageLogs.statusCode} < 400)`,
          errorCalls: sql<number>`count(*) filter (where ${apiUsageLogs.statusCode} >= 400)`,
        })
        .from(apiUsageLogs)
        .where(whereCond);

      const byEndpoint = await db
        .select({
          endpoint: apiUsageLogs.endpoint,
          method: apiUsageLogs.method,
          calls: count(),
          avgLatencyMs: sql<number>`coalesce(round(avg(${apiUsageLogs.latencyMs})), 0)`,
        })
        .from(apiUsageLogs)
        .where(whereCond)
        .groupBy(apiUsageLogs.endpoint, apiUsageLogs.method)
        .orderBy(desc(count()))
        .limit(10);

      const recentLogs = await db
        .select()
        .from(apiUsageLogs)
        .where(whereCond)
        .orderBy(desc(apiUsageLogs.createdAt))
        .limit(20);

      return {
        summary: {
          totalCalls: Number(summary?.totalCalls ?? 0),
          avgLatencyMs: Number(summary?.avgLatencyMs ?? 0),
          successCalls: Number(summary?.successCalls ?? 0),
          errorCalls: Number(summary?.errorCalls ?? 0),
        },
        byEndpoint: byEndpoint.map((row) => ({
          endpoint: row.endpoint,
          method: row.method,
          calls: Number(row.calls),
          avgLatencyMs: Number(row.avgLatencyMs),
        })),
        recentLogs,
      };
    } catch (error) {
      console.error('Database query failed (apiKeys.getAnalytics):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },
};
