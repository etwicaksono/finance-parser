/**
 * Database client singleton using Drizzle ORM + better-sqlite3.
 */

import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import * as schema from "./schema/index";

// Ensure the .data directory exists
const dbPath = path.resolve(process.cwd(), ".data");
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

/**
 * Global database reference to prevent multiple connections
 * during Next.js development hot-reloads.
 */
declare global {
  var __sqliteDb: Database.Database | undefined;
}

function createDatabase(): Database.Database {
  const sqlite = new Database(path.join(dbPath, "sqlite.db"));
  sqlite.pragma("journal_mode = WAL");
  return sqlite;
}

const sqlite = globalThis.__sqliteDb ??= createDatabase();

export const db = drizzle(sqlite, {
  schema,
  casing: "snake_case",
  logger: process.env["NODE_ENV"] === "development",
});

export type DatabaseType = typeof db;
