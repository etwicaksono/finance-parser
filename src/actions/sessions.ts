"use server";

import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq, desc, like, and, asc, count, sql } from "drizzle-orm";
import { TransactionRow, SessionImage } from "@/types";

export async function getSessions() {
  try {
    const result = await db
      .select({
        id: sessions.id,
        name: sessions.name,
        images: sessions.images,
        metadata: sessions.metadata,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
      })
      .from(sessions)
      .orderBy(desc(sessions.updatedAt))
      .limit(50);

    return result;
  } catch (error) {
    console.error("Failed to get sessions:", error);
    return [];
  }
}

export async function getSessionsPaginated(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: "name" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}) {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 10;
  const search = options?.search?.trim() ?? "";
  const sortBy = options?.sortBy ?? "updatedAt";
  const sortOrder = options?.sortOrder ?? "desc";
  const offset = (page - 1) * pageSize;

  try {
    const conditions = [];
    if (search) conditions.push(like(sessions.name, `%${search}%`));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orderCol = sortBy === "name" ? sessions.name : sortBy === "createdAt" ? sessions.createdAt : sessions.updatedAt;
    const orderClause = sortOrder === "desc" ? desc(orderCol) : asc(orderCol);

    const [data, totalResult] = await Promise.all([
      db.select({
        id: sessions.id,
        name: sessions.name,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        rowCount: sql<number>`coalesce(jsonb_array_length(${sessions.data}), 0)`,
        imageCount: sql<number>`coalesce(jsonb_array_length(${sessions.images}), 0)`,
        sources: sql<string[]>`coalesce((SELECT array_agg(DISTINCT elem->>'source') FROM jsonb_array_elements(${sessions.data}) AS elem), '{}')`,
      }).from(sessions).where(whereClause).orderBy(orderClause).limit(pageSize).offset(offset),
      db.select({ count: count() }).from(sessions).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;
    return { data, total, page, pageSize };
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return { error: "Failed to fetch sessions" };
  }
}

export async function getSessionById(id: string) {
  try {
    const result = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error(`Failed to get session ${id}:`, error);
    return null;
  }
}

export async function createSession(name: string, data: TransactionRow[] = [], images: (string | SessionImage)[] = [], metadata: Record<string, unknown> = {}) {
  try {
    const result = await db.insert(sessions).values({
      name,
      data,
      images,
      metadata,
    }).returning();
    return result[0];
  } catch (error) {
    console.error("Failed to create session:", error);
    return null;
  }
}

export async function updateSession(id: string, updates: { name?: string; data?: TransactionRow[]; images?: (string | SessionImage)[]; metadata?: Record<string, unknown> }) {
  try {
    const result = await db.update(sessions)
      .set(updates)
      .where(eq(sessions.id, id))
      .returning();
    return result[0];
  } catch (error) {
    console.error(`Failed to update session ${id}:`, error);
    return null;
  }
}

export async function updateSessionName(id: string, name: string) {
  try {
    const trimmed = name.trim();
    if (!trimmed) return { error: "Name cannot be empty" };

    const [existing] = await db.select().from(sessions).where(eq(sessions.id, id));
    if (!existing) return { error: "Session not found" };

    if (existing.name === trimmed) return { success: true };

    await db.update(sessions).set({ name: trimmed }).where(eq(sessions.id, id));
    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating session name:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function deleteSession(id: string) {
  try {
    const session = await getSessionById(id);
    if (!session) return false;

    // Delete associated images from Cloudinary
    if (session.images && Array.isArray(session.images)) {
      const { deleteImageFromCloudinary } = await import("@/actions/cloudinary");
      await Promise.all(
        (session.images as (string | SessionImage)[]).map(img => {
          const url = typeof img === 'string' ? img : img.url;
          return deleteImageFromCloudinary(url);
        })
      );
    }

    await db.delete(sessions).where(eq(sessions.id, id));
    return true;
  } catch (error) {
    console.error(`Failed to delete session ${id}:`, error);
    return false;
  }
}
