/**
 * Database client singleton using Drizzle ORM + node-postgres.
 *
 * Uses a connection pool via the `pg` Pool class.
 * The singleton pattern prevents multiple pool instances
 * from being created during Next.js hot-reloads in development.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index";

// Validate required env var at module load time
const databaseUrl = process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL environment variable is not set. " +
      "Please create a .env.local file based on .env.example."
  );
}

/**
 * Global pool reference to prevent multiple connections
 * during Next.js development hot-reloads.
 */
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  return new Pool({
    connectionString: databaseUrl,
    max: 10, // max pool connections
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

// Reuse pool in development to avoid exhausting connections
const pool =
  process.env["NODE_ENV"] === "production"
    ? createPool()
    : (globalThis.__pgPool ??= createPool());

/**
 * Drizzle ORM database instance.
 * Use this for all database operations throughout the app.
 *
 * @example
 * import { db } from "@/db/client";
 * const results = await db.select().from(schema.categories);
 */
export const db = drizzle(pool, {
  schema,
  casing: "snake_case",
  logger: process.env["NODE_ENV"] === "development",
});

export type Database = typeof db;
