/**
 * Database module public API.
 *
 * Import the `db` client from here in application code:
 *
 * @example
 * import { db } from "@/db";
 */
export { db } from "./client";
export type { DatabaseType as Database } from "./client";
export * from "./schema/index";
