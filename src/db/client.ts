/**
 * Database client singleton using Drizzle ORM + better-sqlite3.
 *
 * This module automatically applies any pending SQLite migrations on startup,
 * so no manual `npm run db:push` or `npm run db:migrate` is needed.
 */

import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import * as schema from "./schema/index";

// Ensure the .data directory exists
const dbDir = path.resolve(process.cwd(), ".data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

/**
 * Global database reference to prevent multiple connections
 * during Next.js development hot-reloads.
 */
declare global {
  var __sqliteDb: Database.Database | undefined;
}

function createDatabase(): Database.Database {
  const sqlite = new Database(path.join(dbDir, "sqlite.db"));
  sqlite.pragma("journal_mode = WAL");
  return sqlite;
}

const sqlite = globalThis.__sqliteDb ??= createDatabase();

export const db = drizzle(sqlite, {
  schema,
  casing: "snake_case",
  logger: process.env["NODE_ENV"] === "development",
});

// Auto-apply migrations so the app works out of the box on any machine.
// Uses the pre-generated SQL files in src/db/migrations/.
migrate(db, {
  migrationsFolder: path.resolve(process.cwd(), "src/db/migrations"),
});

export type DatabaseType = typeof db;
