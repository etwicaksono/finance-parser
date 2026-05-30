/**
 * Schema barrel export.
 *
 * Import all table schemas here so they are:
 * - accessible via the `schema` object in the Drizzle client
 * - picked up by drizzle-kit for migrations
 */

export * from "./categories";
export * from "./accounts";
export * from "./keyword-mappings";
export * from "./aliases";
export * from "./duplicate-hashes";
export * from "./sessions";
