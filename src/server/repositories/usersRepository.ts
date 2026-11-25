import { count, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { users } from '../../db/schema.ts';

export type UserRecord = typeof users.$inferSelect;

export const usersRepository = {
  async findById(id: string): Promise<UserRecord | null> {
    try {
      const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return rows[0] ?? null;
    } catch (error) {
      console.error('Database query failed (users.findById):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async findByEmail(email: string): Promise<UserRecord | null> {
    try {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);
      return rows[0] ?? null;
    } catch (error) {
      console.error('Database query failed (users.findByEmail):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async findByUid(uid: string): Promise<UserRecord | null> {
    try {
      const rows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
      return rows[0] ?? null;
    } catch (error) {
      console.error('Database query failed (users.findByUid):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async countAdmins(): Promise<number> {
    try {
      const rows = await db
        .select({ total: count() })
        .from(users)
        .where(eq(users.role, 'ADMIN'));
      return Number(rows[0]?.total ?? 0);
    } catch (error) {
      console.error('Database query failed (users.countAdmins):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async createUser(input: {
    name: string;
    email: string;
    passwordHash?: string | null;
    uid?: string | null;
    role?: 'USER' | 'ADMIN';
  }): Promise<UserRecord> {
    try {
      const rows = await db
        .insert(users)
        .values({
          name: input.name,
          email: input.email.toLowerCase(),
          passwordHash: input.passwordHash ?? null,
          uid: input.uid ?? null,
          role: input.role ?? 'USER',
        })
        .returning();
      return rows[0];
    } catch (error) {
      console.error('Database query failed (users.createUser):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async claimFirstAdmin(input: {
    name: string;
    email: string;
    passwordHash: string;
  }) {
    try {
      return await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(1480416845, 1)`);

        const admins = await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.role, 'ADMIN'))
          .limit(1);
        if (admins.length > 0) return { status: 'already-claimed' as const };

        const existingUsers = await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, input.email.toLowerCase()))
          .limit(1);
        if (existingUsers.length > 0) return { status: 'email-exists' as const };

        const rows = await tx
          .insert(users)
          .values({
            name: input.name,
            email: input.email.toLowerCase(),
            passwordHash: input.passwordHash,
            role: 'ADMIN',
          })
          .returning();
        const user = rows[0];
        if (!user) throw new Error('Admin account insert returned no row');
        return { status: 'created' as const, user };
      });
    } catch (error) {
      console.error('Database query failed (users.claimFirstAdmin):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async upsertExternalUser(input: {
    uid: string;
    email: string;
    name: string;
    forceAdmin?: boolean;
  }): Promise<UserRecord> {
    try {
      const existingByEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .limit(1);

      if (existingByEmail[0]) {
        const nextRole = input.forceAdmin ? 'ADMIN' : existingByEmail[0].role;
        const updated = await db
          .update(users)
          .set({
            uid: input.uid,
            name: existingByEmail[0].name || input.name,
            role: nextRole,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingByEmail[0].id))
          .returning();
        return updated[0];
      }

      const rows = await db
        .insert(users)
        .values({
          uid: input.uid,
          email: input.email.toLowerCase(),
          name: input.name,
          role: input.forceAdmin ? 'ADMIN' : 'USER',
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email: input.email.toLowerCase(),
            updatedAt: new Date(),
          },
        })
        .returning();
      return rows[0];
    } catch (error) {
      console.error('Database query failed (users.upsertExternalUser):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },

  async updateProfile(id: string, name: string): Promise<UserRecord | null> {
    try {
      const rows = await db
        .update(users)
        .set({ name, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return rows[0] ?? null;
    } catch (error) {
      console.error('Database query failed (users.updateProfile):', error);
      throw new Error('Database query failed. Please try again later.', { cause: error });
    }
  },
};
