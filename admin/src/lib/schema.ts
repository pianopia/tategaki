import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
});

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
});

export const featureRequests = sqliteTable('feature_requests', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  email: text('email').notNull(),
  name: text('name'),
  message: text('message').notNull(),
  status: text('status').notNull(),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
});
