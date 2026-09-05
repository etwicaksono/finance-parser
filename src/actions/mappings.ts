"use server";

import { db } from "@/db";
import { keywordMappings, keywordMappingLabels, labels } from "@/db/schema";
import { eq, like, count, inArray, and, asc, desc, sql } from "drizzle-orm";
import { cleanKeyword } from "@/lib/keyword-utils";
import { getKeywordCleaningRules } from "@/actions/keyword-cleaning-rules";
import { revalidatePath } from "next/cache";

const PAGE_SIZE = 100;

type MappingRow = typeof keywordMappings.$inferSelect;

/** Mapping row decorated with the ids of its attached labels. */
export type MappingWithLabels = MappingRow & { labelIds: string[] };

// ---------------------------------------------------------------------------
// Internal helpers (not exported: Next.js server actions must be async fns)
// ---------------------------------------------------------------------------

/** Keep only label ids that actually exist in the labels table. */
async function resolveExistingLabelIds(labelIds?: string[]): Promise<string[]> {
  const unique = [...new Set((labelIds ?? []).filter((id) => Boolean(id)))];
  if (unique.length === 0) return [];

  const found = await db
    .select({ id: labels.id })
    .from(labels)
    .where(inArray(labels.id, unique));

  const existing = new Set(found.map((row) => row.id));
  return unique.filter((id) => existing.has(id));
}

/** Replace the full label set of a mapping (delete + insert is transactional per mapping). */
async function replaceMappingLabels(mappingId: string, labelIds: string[]): Promise<void> {
  const valid = await resolveExistingLabelIds(labelIds);
  await db
    .delete(keywordMappingLabels)
    .where(eq(keywordMappingLabels.keywordMappingId, mappingId));

  if (valid.length === 0) return;

  await db.insert(keywordMappingLabels).values(
    valid.map((labelId) => ({ keywordMappingId: mappingId, labelId }))
  );
}

/** Decorate mapping rows with their label ids in a single extra query. */
async function attachLabelIds(rows: MappingRow[]): Promise<MappingWithLabels[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const relations = await db
    .select({
      keywordMappingId: keywordMappingLabels.keywordMappingId,
      labelId: keywordMappingLabels.labelId,
    })
    .from(keywordMappingLabels)
    .where(inArray(keywordMappingLabels.keywordMappingId, ids));

  const grouped = new Map<string, string[]>();
  for (const relation of relations) {
    const list = grouped.get(relation.keywordMappingId) ?? [];
    if (!list.includes(relation.labelId)) list.push(relation.labelId);
    grouped.set(relation.keywordMappingId, list);
  }

  return rows.map((row) => ({ ...row, labelIds: grouped.get(row.id) ?? [] }));
}

/** Best-effort cache invalidation; no-ops when invoked outside the Next runtime. */
function revalidateCache() {
  try {
    revalidatePath("/");
    revalidatePath("/settings");
  } catch {
    // Out-of-band execution (scripts, tests) has no static generation store.
  }
}

async function findMappingByKeyword(keyword: string): Promise<MappingRow | null> {
  const result = await db
    .select()
    .from(keywordMappings)
    .where(eq(keywordMappings.keyword, keyword))
    .limit(1);
  return result[0] ?? null;
}

async function findMappingById(id: string): Promise<MappingRow | null> {
  const result = await db
    .select()
    .from(keywordMappings)
    .where(eq(keywordMappings.id, id))
    .limit(1);
  return result[0] ?? null;
}

// ---------------------------------------------------------------------------
// Read queries
// ---------------------------------------------------------------------------

export async function getMappings(options?: {
  page?: number;
  search?: string;
  categoryId?: string;
  sortBy?: "keyword" | "usageCount" | "updatedAt";
  sortOrder?: "asc" | "desc";
}) {
  const page = options?.page ?? 1;
  const search = options?.search?.trim() ?? "";
  const offset = (page - 1) * PAGE_SIZE;

  try {
    const conditions = [];
    if (search) conditions.push(like(keywordMappings.keyword, `%${search}%`));
    if (options?.categoryId && options.categoryId !== "all") conditions.push(eq(keywordMappings.categoryId, options.categoryId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let orderCol;
    switch (options?.sortBy) {
      case "usageCount":
        orderCol = keywordMappings.usageCount;
        break;
      case "updatedAt":
        orderCol = keywordMappings.updatedAt;
        break;
      default:
        orderCol = keywordMappings.keyword;
    }
    const orderClause = options?.sortOrder === "desc" ? desc(orderCol) : asc(orderCol);

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(keywordMappings)
        .where(whereClause)
        .orderBy(orderClause)
        .limit(PAGE_SIZE)
        .offset(offset),
      db
        .select({ count: count() })
        .from(keywordMappings)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;
    const decorated = await attachLabelIds(data);
    return { data: decorated, total, page, pageSize: PAGE_SIZE };
  } catch (error) {
    console.error("Failed to fetch mappings:", error);
    return { error: "Failed to fetch mappings" };
  }
}

/** Fetch all mappings without pagination — used for the local suggestion engine on the home page. */
export async function getAllMappings() {
  try {
    const data = await db
      .select()
      .from(keywordMappings)
      .orderBy(keywordMappings.keyword);

    const decorated = await attachLabelIds(data);
    return { data: decorated };
  } catch (error) {
    console.error("Failed to fetch all mappings:", error);
    return { error: "Failed to fetch mappings" };
  }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Insert or update a keyword mapping.
 *
 * Backward compatible with callers that pass `createdBy` positionally as a
 * string. Label-aware callers can pass `{ labelIds, createdBy }` as the third
 * argument. `categoryId` is optional: a label-only mapping is valid.
 */
export async function addMapping(
  keyword: string,
  categoryId?: string | null,
  options?: string | { labelIds?: string[]; createdBy?: string }
) {
  if (!keyword || keyword.trim() === "") {
    return { error: "Keyword is required" };
  }

  let labelIds: string[] = [];
  let createdBy = "user";
  let hasLabelOptions = false;
  if (typeof options === "string") {
    createdBy = options;
  } else if (options) {
    hasLabelOptions = "labelIds" in options;
    labelIds = options.labelIds ?? [];
    createdBy = options.createdBy ?? "user";
  }

  const normalizedKeyword = keyword.trim().toLowerCase();

  try {
    const existing = await findMappingByKeyword(normalizedKeyword);

    if (existing) {
      const nextCategoryId = categoryId ?? existing.categoryId;
      const sameCategory = existing.categoryId === nextCategoryId;
      const nextUsage = sameCategory ? existing.usageCount + 1 : 1;
      const nextUpdatedBy = sameCategory ? existing.updatedBy : createdBy;

      await db
        .update(keywordMappings)
        .set({
          categoryId: nextCategoryId,
          usageCount: nextUsage,
          updatedBy: nextUpdatedBy,
          updatedAt: new Date(),
        })
        .where(eq(keywordMappings.id, existing.id));

      // Only replace labels when the caller explicitly passed labelIds so
      // category-only updates (e.g. manual/AI mapping) never wipe stored labels.
      if (hasLabelOptions) {
        await replaceMappingLabels(existing.id, labelIds);
      }

      const updated = await findMappingById(existing.id);
      const decorated = await attachLabelIds(updated ? [updated] : []);

      revalidateCache();
      return { data: decorated[0] };
    }

    const inserted = await db
      .insert(keywordMappings)
      .values({
        keyword: normalizedKeyword,
        categoryId: categoryId ?? null,
        usageCount: 1,
        createdBy,
        updatedBy: createdBy,
      })
      .returning();

    await replaceMappingLabels(inserted[0]!.id, labelIds);
    const row = inserted[0]!;
    const decorated = await attachLabelIds([row]);

    revalidateCache();
    return { data: decorated[0] };
  } catch (error: unknown) {
    console.error("Failed to add mapping:", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("UNIQUE constraint failed") || msg.includes("duplicate key")) {
      return { error: "This keyword already exists" };
    }
    return { error: "Failed to add mapping" };
  }
}

export async function batchAddMappings(
  mappings: { keyword: string; categoryId: string }[],
  createdBy: string = "user"
) {
  const validMappings = mappings.filter((m) => m.keyword && m.keyword.trim() !== "" && m.categoryId);
  if (validMappings.length === 0) return { error: "No valid mappings provided" };

  try {
    const values = validMappings.map((m) => ({
      keyword: m.keyword.trim().toLowerCase(),
      categoryId: m.categoryId,
      usageCount: 1,
      createdBy,
      updatedBy: createdBy,
    }));

    await db
      .insert(keywordMappings)
      .values(values)
      .onConflictDoUpdate({
        target: keywordMappings.keyword,
        set: {
          categoryId: sql`EXCLUDED.category_id`,
          usageCount: sql`CASE WHEN ${keywordMappings.categoryId} = EXCLUDED.category_id THEN ${keywordMappings.usageCount} + 1 ELSE 1 END`,
          updatedBy: sql`CASE WHEN ${keywordMappings.categoryId} = EXCLUDED.category_id THEN ${keywordMappings.updatedBy} ELSE ${createdBy} END`,
          updatedAt: new Date(),
        },
      });

    revalidateCache();
    return { success: true };
  } catch (error) {
    console.error("Failed to batch add mappings:", error);
    return { error: "Failed to batch add mappings" };
  }
}

export async function deleteMapping(id: string) {
  if (!id) {
    return { error: "Mapping ID is required" };
  }

  try {
    const deleted = await db.delete(keywordMappings).where(eq(keywordMappings.id, id)).returning();
    revalidateCache();
    return { data: deleted[0] };
  } catch (error) {
    console.error("Failed to delete mapping:", error);
    return { error: "Failed to delete mapping." };
  }
}

/**
 * Update keyword/category of a mapping. When `labelIds` is provided the label
 * set is replaced; otherwise existing labels are preserved.
 */
export async function updateMapping(
  id: string,
  newKeyword: string,
  newCategoryId?: string | null,
  labelIds?: string[]
) {
  if (!id) return { error: "Mapping ID is required" };
  if (!newKeyword || newKeyword.trim() === "") return { error: "Keyword is required" };

  try {
    const existing = await findMappingById(id);
    if (!existing) return { error: "Mapping not found" };

    const keywordChanged = existing.keyword !== newKeyword.trim().toLowerCase();
    const categoryChanged = newCategoryId !== undefined && existing.categoryId !== newCategoryId;

    await db
      .update(keywordMappings)
      .set({
        ...(keywordChanged && { keyword: newKeyword.trim().toLowerCase() }),
        ...(categoryChanged && { categoryId: newCategoryId ?? null }),
        ...((keywordChanged || categoryChanged) && {
          updatedBy: "user",
          updatedAt: new Date(),
        }),
      })
      .where(eq(keywordMappings.id, id));

    if (labelIds) {
      await replaceMappingLabels(id, labelIds);
      await db
        .update(keywordMappings)
        .set({ updatedBy: "user", updatedAt: new Date() })
        .where(eq(keywordMappings.id, id));
    }

    const updated = await findMappingById(id);
    const decorated = await attachLabelIds(updated ? [updated] : []);

    revalidateCache();
    return { data: decorated[0] };
  } catch (error: unknown) {
    console.error("Failed to update mapping:", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("UNIQUE constraint failed") || msg.includes("duplicate key")) {
      return { error: "This keyword already exists" };
    }
    return { error: "Failed to update mapping." };
  }
}

/** Replace the label set of an existing mapping without touching keyword/category. */
export async function updateMappingLabels(
  id: string,
  labelIds: string[],
  updatedBy: string = "user"
) {
  if (!id) return { error: "Mapping ID is required" };

  try {
    await replaceMappingLabels(id, labelIds);
    await db
      .update(keywordMappings)
      .set({ updatedBy, updatedAt: new Date() })
      .where(eq(keywordMappings.id, id));

    const updated = await findMappingById(id);
    const decorated = await attachLabelIds(updated ? [updated] : []);

    revalidateCache();
    return { data: decorated[0] };
  } catch (error) {
    console.error("Failed to update mapping labels:", error);
    return { error: "Failed to update mapping labels." };
  }
}

/**
 * Persist a label set for the keyword of an edited row. Creates the mapping
 * (with a null category) when the keyword is not mapped yet; otherwise only
 * the label relation is replaced so existing categories are preserved.
 */
export async function upsertMappingLabelsByKeyword(
  keyword: string,
  labelIds: string[],
  createdBy: string = "user"
) {
  if (!keyword || keyword.trim() === "") {
    return { error: "Keyword is required" };
  }

  const normalizedKeyword = keyword.trim().toLowerCase();

  try {
    const existing = await findMappingByKeyword(normalizedKeyword);

    if (existing) {
      await replaceMappingLabels(existing.id, labelIds);
      await db
        .update(keywordMappings)
        .set({ updatedBy: createdBy, updatedAt: new Date() })
        .where(eq(keywordMappings.id, existing.id));

      const updated = await findMappingById(existing.id);
      const decorated = await attachLabelIds(updated ? [updated] : []);
      revalidateCache();
      return { data: decorated[0] };
    }

    const inserted = await db
      .insert(keywordMappings)
      .values({
        keyword: normalizedKeyword,
        categoryId: null,
        usageCount: 1,
        createdBy,
        updatedBy: createdBy,
      })
      .returning();

    await replaceMappingLabels(inserted[0]!.id, labelIds);
    const row = inserted[0]!;
    const decorated = await attachLabelIds([row]);

    revalidateCache();
    return { data: decorated[0] };
  } catch (error: unknown) {
    console.error("Failed to upsert mapping labels:", error);
    return { error: "Failed to save labels" };
  }
}

export async function cleanupMappings() {
  try {
    const allMappings = await db.select().from(keywordMappings);
    if (!allMappings || allMappings.length === 0) return { count: 0 };

    // Group mappings by their cleaned keyword
    const { data: cleaningRules } = await getKeywordCleaningRules();
    const groups: Record<string, MappingRow[]> = {};
    for (const m of allMappings) {
      const cleaned = cleanKeyword(m.keyword, cleaningRules).toLowerCase();
      if (!groups[cleaned]) groups[cleaned] = [];
      groups[cleaned].push(m);
    }

    let processedCount = 0;
    const idsToDelete: string[] = [];
    const updates: { id: string; cleaned: string }[] = [];

    // Process each group
    for (const [cleaned, members] of Object.entries(groups)) {
      if (!cleaned) continue; // Skip empty keywords

      // If a group has only 1 member, and its keyword is already clean, do nothing.
      if (members.length === 1 && members[0]?.keyword === cleaned) {
        continue;
      }

      // Sort members by usageCount (desc), then by updatedAt (desc)
      members.sort((a, b) => {
        if (b.usageCount !== a.usageCount) {
          return b.usageCount - a.usageCount; // Highest usage first
        }
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA; // Newest first
      });

      const primary = members[0];
      if (!primary) continue;
      const duplicates = members.slice(1);

      // Collect duplicates for deletion
      for (const dup of duplicates) {
        idsToDelete.push(dup.id);
      }

      // If the primary's keyword is not clean, record it for update
      if (primary.keyword !== cleaned) {
        updates.push({ id: primary.id, cleaned });
      }

      processedCount += members.length;
    }

    // 1. Delete duplicates first to avoid unique constraint violations
    if (idsToDelete.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < idsToDelete.length; i += chunkSize) {
        const chunk = idsToDelete.slice(i, i + chunkSize);
        await db.delete(keywordMappings).where(inArray(keywordMappings.id, chunk));
      }
    }

    // 2. Update primaries afterwards
    for (const update of updates) {
      await db
        .update(keywordMappings)
        .set({ keyword: update.cleaned, updatedAt: new Date() })
        .where(eq(keywordMappings.id, update.id));
    }

    revalidateCache();
    return { success: true, count: processedCount, deleted: idsToDelete.length };
  } catch (error) {
    console.error("Failed to cleanup mappings:", error);
    return { error: "Failed to cleanup mappings." };
  }
}
