import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { categories } from "./categories";

export const keywordMappings = sqliteTable("keyword_mappings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  keyword: text("keyword").notNull().unique(),
  // For DB-backed categories (user-defined). Nullable to support AI-only mappings.
  categoryId: text("category_id")
    .references(() => categories.id, { onDelete: "cascade" }),
  // For AI taxonomy categories (e.g. "Groceries, main meal"). Takes priority over categoryId for display.
  aiCategory: text("ai_category"),
  aiParentCategory: text("ai_parent_category"),
  usageCount: integer("usage_count").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now'))`)
    .notNull()
    .$onUpdate(() => new Date()),
});
