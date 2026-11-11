import Database from '@tauri-apps/plugin-sql';
import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';

/**
 * Connection URL — must match `migrations::DB_URL` on the Rust side. The Rust
 * `tauri-plugin-sql` builder owns the migrations, so simply loading this URL
 * runs the CREATE TABLE statements on first launch.
 */
export const DB_URL = 'sqlite:sandhour.db';

let sqlitePromise: Promise<Database> | null = null;
let drizzleDb: SqliteRemoteDatabase<typeof schema> | null = null;

/** Lazily open (and cache) the underlying tauri-plugin-sql connection. */
export function getSqlite(): Promise<Database> {
  if (!sqlitePromise) {
    sqlitePromise = Database.load(DB_URL);
  }
  return sqlitePromise;
}

/**
 * Drizzle ORM instance backed by tauri-plugin-sql through the sqlite-proxy
 * driver. tauri-plugin-sql returns rows as objects keyed by column name; the
 * proxy driver expects arrays of values in column order, so we map with
 * `Object.values` — sqlx preserves the SELECT column order Drizzle generates.
 */
export function getDb(): SqliteRemoteDatabase<typeof schema> {
  if (drizzleDb) return drizzleDb;

  drizzleDb = drizzle(
    async (sqlStr, params, method) => {
      const conn = await getSqlite();

      // Mutations (INSERT/UPDATE/DELETE/CREATE) come through as method 'run'.
      if (method === 'run') {
        await conn.execute(sqlStr, params);
        return { rows: [] };
      }

      const rows = await conn.select<Record<string, unknown>[]>(sqlStr, params);
      const values = rows.map((row) => Object.values(row));

      // 'get' expects a single row (array of values); 'all'/'values' expect many.
      return { rows: method === 'get' ? (values[0] ?? []) : values };
    },
    { schema, logger: import.meta.env.DEV }
  );

  return drizzleDb;
}

/**
 * Ensure the database is open and migrations have run. Call once at startup.
 * Returns the row count of the `user_settings` table as a cheap connectivity check.
 */
export async function initDatabase(): Promise<void> {
  const conn = await getSqlite();
  // A trivial query forces the connection (and Rust-side migrations) to complete.
  await conn.select('SELECT 1');
}

export { schema };
