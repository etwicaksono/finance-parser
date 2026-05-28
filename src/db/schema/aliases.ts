import { pgTable, varchar, text, integer } from "drizzle-orm/pg-core";

export const aliases = pgTable("aliases", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  alias: text("alias").notNull().unique(),
  canonicalText: text("canonical_text").notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
});
