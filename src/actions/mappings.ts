"use server";

import { db } from "@/db";
import { keywordMappings } from "@/db/schema";
import { eq, like, sql, count, inArray, and, asc, desc } from "drizzle-orm";
import { cleanKeyword } from "@/lib/keyword-utils";
import { getKeywordCleaningRules } from "@/actions/keyword-cleaning-rules";
import { revalidatePath } from "next/cache";

const PAGE_SIZE = 100;

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
      case "usageCount": orderCol = keywordMappings.usageCount; break;
      case "updatedAt": orderCol = keywordMappings.updatedAt; break;
      default: orderCol = keywordMappings.keyword;
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
    return { data, total, page, pageSize: PAGE_SIZE };
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
    return { data };
  } catch (error) {
    console.error("Failed to fetch all mappings:", error);
    return { error: "Failed to fetch mappings" };
  }
}

export async function addMapping(keyword: string, categoryId: string, createdBy: string = "user") {
  if (!keyword || keyword.trim() === "") {
    return { error: "Keyword is required" };
  }
  if (!categoryId) {
    return { error: "Category ID is required" };
  }

  try {
    const inserted = await db
      .insert(keywordMappings)
      .values({ 
        keyword: keyword.trim().toLowerCase(), 
        categoryId,
        usageCount: 1, 
        createdBy,
        updatedBy: createdBy,
      })
      .onConflictDoUpdate({
        target: keywordMappings.keyword,
        set: { 
          categoryId,
          usageCount: sql`CASE WHEN ${keywordMappings.categoryId} = ${categoryId} THEN ${keywordMappings.usageCount} + 1 ELSE 1 END`, 
          updatedBy: sql`CASE WHEN ${keywordMappings.categoryId} = ${categoryId} THEN ${keywordMappings.updatedBy} ELSE ${createdBy} END`,
          updatedAt: new Date() 
        }
      })
      .returning();
      
    revalidatePath("/");
    return { data: inserted[0] };
  } catch (error: unknown) {
    console.error("Failed to add mapping:", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("UNIQUE constraint failed") || msg.includes("duplicate key")) {
      return { error: "This keyword already exists" };
    }
    return { error: "Failed to add mapping" };
  }
}

export async function batchAddMappings(mappings: { keyword: string; categoryId: string }[], createdBy: string = "user") {
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

    revalidatePath("/");
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
    revalidatePath("/");
    return { data: deleted[0] };
  } catch (error) {
    console.error("Failed to delete mapping:", error);
    return { error: "Failed to delete mapping." };
  }
}

export async function updateMapping(id: string, newKeyword: string, newCategoryId: string) {
  if (!id) return { error: "Mapping ID is required" };
  if (!newKeyword || newKeyword.trim() === "") return { error: "Keyword is required" };
  if (!newCategoryId) return { error: "Category ID is required" };

  try {
    const updated = await db
      .update(keywordMappings)
      .set({
        keyword: newKeyword.trim().toLowerCase(),
        categoryId: newCategoryId,
        updatedBy: "user",
        updatedAt: new Date(),
      })
      .where(eq(keywordMappings.id, id))
      .returning();
      
    revalidatePath("/");
    revalidatePath("/settings");
    return { data: updated[0] };
  } catch (error: unknown) {
    console.error("Failed to update mapping:", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("UNIQUE constraint failed") || msg.includes("duplicate key")) {
      return { error: "This keyword already exists" };
    }
    return { error: "Failed to update mapping." };
  }
}

export async function cleanupMappings() {
  try {
    const allMappings = await db.select().from(keywordMappings);
    if (!allMappings || allMappings.length === 0) return { count: 0 };

    // Group mappings by their cleaned keyword
    const { data: cleaningRules } = await getKeywordCleaningRules();
    const groups: Record<string, typeof allMappings> = {};
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
      // SQLite has a limit on parameters, so we chunk it if it's large (though pg doesn't, drizzle is safe with chunking)
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


    revalidatePath("/");
    revalidatePath("/settings");
    return { success: true, count: processedCount, deleted: idsToDelete.length };
  } catch (error) {
    console.error("Failed to cleanup mappings:", error);
    return { error: "Failed to cleanup mappings." };
  }
}

