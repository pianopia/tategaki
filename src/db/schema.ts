import { randomUUID } from 'crypto';

import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  passwordHash: text('password_hash').notNull().default(''),
  createdAt: integer('created_at', { mode: 'number' })
    .notNull()
    .default(sql`(unixepoch('now') * 1000)`),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'number' }).notNull(),
  createdAt: integer('created_at', { mode: 'number' })
    .notNull()
    .default(sql`(unixepoch('now') * 1000)`),
});

export const documents = sqliteTable(
  'documents',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content').notNull(),
    pagesJson: text('pages_json'),
    updatedAt: integer('updated_at', { mode: 'number' })
      .notNull()
      .default(sql`(unixepoch('now') * 1000)`),
    createdAt: integer('created_at', { mode: 'number' })
      .notNull()
      .default(sql`(unixepoch('now') * 1000)`),
  },
  (table) => ({
    userIdx: index('idx_documents_user').on(table.userId),
  })
);

export const documentRevisions = sqliteTable(
  'document_revisions',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    documentId: text('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content').notNull(),
    pagesJson: text('pages_json'),
    createdAt: integer('created_at', { mode: 'number' })
      .notNull()
      .default(sql`(unixepoch('now') * 1000)`),
  },
  (table) => ({
    documentIdx: index('idx_document_revisions_document').on(table.documentId),
    userIdx: index('idx_document_revisions_user').on(table.userId),
  })
);

export const userPreferences = sqliteTable(
  'user_preferences',
  {
    id: text('id').primaryKey().$defaultFn(() => randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    preferences: text('preferences'),
    updatedAt: integer('updated_at', { mode: 'number' })
      .notNull()
      .default(sql`(unixepoch('now') * 1000)`),
    createdAt: integer('created_at', { mode: 'number' })
      .notNull()
      .default(sql`(unixepoch('now') * 1000)`),
  },
  (table) => ({
    userIdx: index('idx_user_preferences_user').on(table.userId),
  })
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type DocumentRevision = typeof documentRevisions.$inferSelect;
export type UserPreference = typeof userPreferences.$inferSelect;
export type UserPreferenceInsert = typeof userPreferences.$inferInsert;
