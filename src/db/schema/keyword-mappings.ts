import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { categories } from "./categories";

export const keywordMappings = sqliteTable("keyword_mappings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  keyword: text("keyword").notNull().unique(),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  usageCount: integer("usage_count").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now'))`)
    .notNull()
    .$onUpdate(() => new Date()),
});
