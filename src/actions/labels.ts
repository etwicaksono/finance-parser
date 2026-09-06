"use server";

import { db } from "@/db";
import { labels } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { normalizeHexColor, type LabelColorFields } from "@/features/labels/label-colors";

type ColorPatch = { textColor: string | null; bgColor: string | null };

/**
 * Validate optional label colors. Empty strings and null both mean "no custom
 * color"; anything else must be a hex color, normalized to lowercase #rrggbb.
 */
function parseColorPatch(colors: LabelColorFields = {}): { patch: ColorPatch } | { error: string } {
  const rawText = colors.textColor === "" ? null : colors.textColor ?? null;
  const rawBg = colors.bgColor === "" ? null : colors.bgColor ?? null;
  const textColor = rawText === null ? null : normalizeHexColor(rawText);
  const bgColor = rawBg === null ? null : normalizeHexColor(rawBg);
  if (rawText !== null && textColor === null) {
    return { error: "Text color must be a hex color like #3b82f6" };
  }
  if (rawBg !== null && bgColor === null) {
    return { error: "Background color must be a hex color like #fde047" };
  }
  return { patch: { textColor, bgColor } };
}

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

export async function createLabel(name: string, colors: LabelColorFields = {}) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Label name is required" };
  }
  if (trimmed.includes(",")) {
    return { error: "Label names cannot contain commas" };
  }

  const parsed = parseColorPatch(colors);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  try {
    const existing = await findLabelByName(trimmed);
    if (existing) {
      return { error: "Label already exists" };
    }

    const inserted = await db
      .insert(labels)
      .values({
        name: trimmed,
        textColor: parsed.patch.textColor,
        bgColor: parsed.patch.bgColor,
      })
      .returning();
    revalidateCache();
    return { data: inserted[0] };
  } catch (error) {
    console.error("Failed to add label:", error);
    return { error: "Failed to add label" };
  }
}

export async function updateLabel(
  id: string,
  name: string,
  colors: LabelColorFields | undefined = undefined,
) {
  const trimmed = name.trim();
  if (!id || !trimmed) {
    return { error: "Label ID and name are required" };
  }
  if (trimmed.includes(",")) {
    return { error: "Label names cannot contain commas" };
  }

  const parsed = colors ? parseColorPatch(colors) : undefined;
  if (parsed && "error" in parsed) {
    return { error: parsed.error };
  }

  try {
    const existing = await findLabelByName(trimmed, id);
    if (existing) {
      return { error: "Label already exists" };
    }

    const updated = await db
      .update(labels)
      .set({
        name: trimmed,
        ...(parsed ? { textColor: parsed.patch.textColor, bgColor: parsed.patch.bgColor } : {}),
      })
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
