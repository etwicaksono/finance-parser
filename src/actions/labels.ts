"use server";

import { db } from "@/db";
import { labels } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function findLabelByName(name: string, excludeId?: string) {
  const query = db
    .select()
    .from(labels)
    .where(sql`lower(${labels.name}) = ${name.toLowerCase()}`)
    .limit(1);
  // excludeId is applied in JS afterwards; simpler and safe for single-user scale.
  const rows = await query;
  if (excludeId && rows[0]?.id === excludeId) return null;
  return rows[0] ?? null;
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

export async function getLabels() {
  try {
    const allLabels = await db.select().from(labels).orderBy(labels.name);
    return { data: allLabels };
  } catch (error) {
    console.error("Failed to fetch labels:", error);
    return { error: "Failed to fetch labels" };
  }
}

export async function createLabel(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Label name is required" };
  }
  if (trimmed.includes(",")) {
    return { error: "Label names cannot contain commas" };
  }

  try {
    const existing = await findLabelByName(trimmed);
    if (existing) {
      return { error: "Label already exists" };
    }

    const inserted = await db.insert(labels).values({ name: trimmed }).returning();
    revalidateCache();
    return { data: inserted[0] };
  } catch (error) {
    console.error("Failed to add label:", error);
    return { error: "Failed to add label" };
  }
}

export async function updateLabel(id: string, name: string) {
  const trimmed = name.trim();
  if (!id || !trimmed) {
    return { error: "Label ID and name are required" };
  }
  if (trimmed.includes(",")) {
    return { error: "Label names cannot contain commas" };
  }

  try {
    const existing = await findLabelByName(trimmed, id);
    if (existing) {
      return { error: "Label already exists" };
    }

    const updated = await db
      .update(labels)
      .set({ name: trimmed })
      .where(eq(labels.id, id))
      .returning();

    revalidateCache();
    return { data: updated[0] };
  } catch (error) {
    console.error("Failed to update label:", error);
    return { error: "Failed to update label" };
  }
}

export async function deleteLabel(id: string) {
  if (!id) {
    return { error: "Label ID is required" };
  }

  try {
    const deleted = await db.delete(labels).where(eq(labels.id, id)).returning();
    revalidateCache();
    return { data: deleted[0] };
  } catch (error) {
    console.error("Failed to delete label:", error);
    return { error: "Failed to delete label" };
  }
}
