import { pgTable, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { categories } from "./categories";

export const keywordMappings = pgTable("keyword_mappings", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  keyword: text("keyword").notNull().unique(),
  categoryId: varchar("category_id", { length: 36 })
    .references(() => categories.id, { onDelete: "cascade" }),
  usageCount: integer("usage_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
