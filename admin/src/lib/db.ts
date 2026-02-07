import { createClient } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';

import * as schema from './schema';

let dbInstance: LibSQLDatabase<typeof schema> | null = null;

const ensureDb = () => {
  if (dbInstance) return dbInstance;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('TURSO_DATABASE_URL が設定されていません');
  }

  if (!authToken) {
    throw new Error('TURSO_AUTH_TOKEN が設定されていません');
  }

  const client = createClient({ url, authToken });
  dbInstance = drizzle(client, { schema });
  return dbInstance;
};

export const getDb = () => ensureDb();
