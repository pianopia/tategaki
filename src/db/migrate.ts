import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { sql } from 'drizzle-orm';
import { countdowns } from './schema';

const client = createClient({
  url: 'libsql://countdown-pianopia.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NDM2ODM2NDEsImlkIjoiNTViNDdjNTItNjAzNy00YmFkLTkwZmMtOGZhOGJlMDI0NjRjIn0.BzNssln4iq1Fo-JKHOzI6qusJDhQoyRU_LWov0tbWW2lYs7kcqBc3A3TPteh_COshj9StqudJrq7ndOrahTYAw',
});
const db = drizzle(client);

async function main() {
  console.log('Dropping existing table if any...');
  try {
    await db.run(sql`DROP TABLE IF EXISTS countdowns`);
    console.log('Table dropped successfully');
  } catch (err) {
    console.error('Error dropping table:', err);
  }

  console.log('Creating table...');
  
  await db.run(sql`
    CREATE TABLE countdowns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_value INTEGER NOT NULL,
      current_value INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 初期データを挿入
  console.log('Inserting initial data...');
  const existingData = await db.select().from(countdowns);
  if (existingData.length === 0) {
    await db.insert(countdowns).values({
      name: 'サンプルカウンター',
      targetValue: 100,
      currentValue: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  console.log('Table created and initial data inserted successfully');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to create table');
  console.error(err);
  process.exit(1);
}); 