"use server";

import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
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

export async function getSessionById(id: string) {
  try {
    const result = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error(`Failed to get session ${id}:`, error);
    return null;
  }
}

export async function createSession(name: string, data: TransactionRow[] = [], images: (string | SessionImage)[] = [], metadata: any = {}) {
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

export async function updateSession(id: string, updates: { name?: string; data?: TransactionRow[]; images?: (string | SessionImage)[]; metadata?: any }) {
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
