/* eslint-disable no-console */
/**
 * One-time importer: fills the `sign_type` column of existing categories from
 * the static taxonomy file. After this has been run once, the sign of every
 * category is managed in the database (Settings → Categories) and the JSON
 * file is no longer read at runtime.
 *
 * Matching is by category name (case-insensitive, ignoring the trailing
 * "::<number>" suffix used as a unique marker). When a name appears in more
 * than one section of the taxonomy, income wins, then expense, then both —
 * the same precedence the old runtime lookup used.
 *
 * Categories that do not match any taxonomy entry keep the column default
 * ("expense") and are listed so they can be fixed from the UI.
 */
import { config } from "dotenv";

config({ path: ".env" });

import taxonomyData from "../../data/category-taxonomy.json";

type TaxonomyGroup = {
  name?: string;
  children?: { name?: string }[] | undefined;
};

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/::.*$/, "");
}

function collect(
  sign: "income" | "expense" | "both",
  group: TaxonomyGroup
): void {
  if (group.name) add(group.name, sign);
  for (const child of group.children ?? []) {
    if (child.name) add(child.name, sign);
  }
}

const signByName = new Map<string, "income" | "expense" | "both">();

function add(name: string, sign: "income" | "expense" | "both"): void {
  const key = normalize(name);
  if (!key || signByName.has(key)) return;
  signByName.set(key, sign);
}

// Precedence: income, then expense, then both (first match wins).
const raw = taxonomyData as {
  income?: TaxonomyGroup[];
  expense?: Record<string, TaxonomyGroup>;
  both?: Record<string, TaxonomyGroup>;
};

for (const group of raw.income ?? []) collect("income", group);
for (const [groupName, group] of Object.entries(raw.expense ?? {})) {
  collect("expense", { name: groupName, children: group.children });
}
for (const [groupName, group] of Object.entries(raw.both ?? {})) {
  collect("both", { name: groupName, children: group.children });
}

async function main(): Promise<void> {
  const { db } = await import("../client");
  const { categories } = await import("../schema/categories");
  const { eq } = await import("drizzle-orm");

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      signType: categories.signType,
    })
    .from(categories);

  const counts = { income: 0, expense: 0, both: 0 };
  const unmatched: string[] = [];
  let updated = 0;

  for (const row of rows) {
    const sign = signByName.get(normalize(row.name));
    if (!sign) {
      unmatched.push(row.name);
      continue;
    }
    if (row.signType !== sign) {
      await db
        .update(categories)
        .set({ signType: sign })
        .where(eq(categories.id, row.id));
      counts[sign] += 1;
      updated += 1;
    }
  }

  console.log(`Categories scanned : ${rows.length}`);
  console.log(
    `Signs updated       : ${updated} (income=${counts.income}, expense=${counts.expense}, both=${counts.both})`
  );
  console.log(
    `Unmatched (default 'expense', fix from UI): ${unmatched.length}`
  );
  for (const name of unmatched) console.log(`  - ${name}`);

  await db.$client.end();
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
