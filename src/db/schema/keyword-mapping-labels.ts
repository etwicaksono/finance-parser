import { pgTable, varchar, primaryKey } from "drizzle-orm/pg-core";
import { keywordMappings } from "./keyword-mappings";
import { labels } from "./labels";

/**
 * Join table connecting keyword mappings to labels (many-to-many).
 *
 * Deleting either side cascades so orphan relations never linger.
 */
export const keywordMappingLabels = pgTable(
  "keyword_mapping_labels",
  {
    keywordMappingId: varchar("keyword_mapping_id", { length: 36 })
      .notNull()
      .references(() => keywordMappings.id, { onDelete: "cascade" }),
    labelId: varchar("label_id", { length: 36 })
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.keywordMappingId, table.labelId] }),
  ]
);
