import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  uid: text('uid').unique(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('USER'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const lyrics = pgTable(
  'lyrics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    titleTranslit: text('title_translit').notNull(),
    artist: text('artist').notNull(),
    album: text('album').notNull(),
    lyrics: text('lyrics').notNull(),
    language: text('language').notNull().default('am'),
    genre: text('genre').notNull(),
    releaseYear: integer('release_year'),
    views: integer('views').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('idx_lyrics_artist').on(table.artist),
    index('idx_lyrics_genre').on(table.genre),
    index('idx_lyrics_views').on(table.views),
    index('idx_lyrics_deleted_at').on(table.deletedAt),
  ]
);

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    keyHash: text('key_hash').notNull().unique(),
    keyPrefix: text('key_prefix').notNull(),
    name: text('name').notNull(),
    ownerId: uuid('owner_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    isActive: boolean('is_active').notNull().default(true),
    requestsUsed: integer('requests_used').notNull().default(0),
    dailyQuota: integer('daily_quota').notNull().default(1000),
    lastUsedAt: timestamp('last_used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('idx_api_keys_owner').on(table.ownerId)]
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_logs_actor').on(table.actorId),
    index('idx_audit_logs_created').on(table.createdAt),
  ]
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    revokedAt: timestamp('revoked_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_refresh_tokens_user').on(table.userId)]
);

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: text('key').notNull(),
    actorScope: text('actor_scope').notNull(),
    method: text('method').notNull(),
    path: text('path').notNull(),
    requestHash: text('request_hash').notNull(),
    statusCode: integer('status_code').notNull(),
    responseBody: jsonb('response_body').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (table) => [
    uniqueIndex('uq_idempotency_key_scope').on(
      table.key,
      table.actorScope,
      table.method,
      table.path
    ),
  ]
);

export const apiUsageLogs = pgTable(
  'api_usage_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
    ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
    method: text('method').notNull(),
    endpoint: text('endpoint').notNull(),
    statusCode: integer('status_code').notNull(),
    latencyMs: integer('latency_ms').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_api_usage_owner').on(table.ownerId),
    index('idx_api_usage_created').on(table.createdAt),
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  apiKeys: many(apiKeys),
  auditLogs: many(auditLogs),
  refreshTokens: many(refreshTokens),
  usageLogs: many(apiUsageLogs),
}));

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  owner: one(users, {
    fields: [apiKeys.ownerId],
    references: [users.id],
  }),
  usageLogs: many(apiUsageLogs),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const apiUsageLogsRelations = relations(apiUsageLogs, ({ one }) => ({
  apiKey: one(apiKeys, {
    fields: [apiUsageLogs.apiKeyId],
    references: [apiKeys.id],
  }),
  owner: one(users, {
    fields: [apiUsageLogs.ownerId],
    references: [users.id],
  }),
}));
