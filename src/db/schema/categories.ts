import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  /** Sign type used when adjusting amounts: "income" | "expense" | "both". */
  signType: varchar("sign_type", { length: 16 }).notNull().default("expense"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
