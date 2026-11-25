import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { auditLogs, users } from '../../db/schema.ts';

export const auditLogsRepository = {
  async create(input: {
    actorId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }) {
    try {
      const rows = await db
        .insert(auditLogs)
        .values({
          actorId: input.actorId,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          metadata: input.metadata ?? {},
        })
        .returning();
      return rows[0];
    } catch (error) {
      console.error('Database query failed (auditLogs.create):', error);
      return null;
    }
  },

  async list(params: {
    page: number;
    limit: number;
    entityType?: string;
    action?: string;
  }) {
    try {
      const conditions = [];
      if (params.entityType) conditions.push(eq(auditLogs.entityType, params.entityType));
      if (params.action) conditions.push(eq(auditLogs.action, params.action));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (params.page - 1) * params.limit;

      const [items, totalRows] = await Promise.all([
        db
          .select({
            id: auditLogs.id,
            actorId: auditLogs.actorId,
            actorEmail: users.email,
            actorName: users.name,
            action: auditLogs.action,
            entityType: auditLogs.entityType,
            entityId: auditLogs.entityId,
            metadata: auditLogs.metadata,
            createdAt: auditLogs.createdAt,
          })
          .from(auditLogs)
          .leftJoin(users, eq(auditLogs.actorId, users.id))
          .where(whereClause)
          .orderBy(desc(auditLogs.createdAt))
          .limit(params.limit)
          .offset(offset),
        db.select({ total: count() }).from(auditLogs).where(whereClause),
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
      console.error('Database query failed (auditLogs.list):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },
};
