import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const featureRequests = sqliteTable('feature_requests', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  email: text('email').notNull(),
  name: text('name'),
  message: text('message').notNull(),
  status: text('status').notNull(),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
});
