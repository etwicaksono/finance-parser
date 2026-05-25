import { pgTable, uuid, varchar, integer } from "drizzle-orm/pg-core";

export const aliases = pgTable("aliases", {
  id: uuid("id").primaryKey().defaultRandom(),
  alias: varchar("alias", { length: 255 }).notNull().unique(),
  canonicalText: varchar("canonical_text", { length: 255 }).notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
});
