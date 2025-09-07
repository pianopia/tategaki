import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const countdowns = sqliteTable('countdowns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  targetValue: integer('target_value').notNull(),
  currentValue: integer('current_value').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
