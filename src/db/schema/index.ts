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
export * from "./labels";
export * from "./keyword-mapping-labels";
export * from "./aliases";
export * from "./duplicate-hashes";
export * from "./contra-keywords";
export * from "./keyword-cleaning-rules";
export * from "./sessions";
