import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const aliases = sqliteTable("aliases", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  alias: text("alias").notNull().unique(),
  canonicalText: text("canonical_text").notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
});
