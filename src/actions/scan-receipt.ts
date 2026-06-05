"use server";

import { TransactionRow } from "@/types";
import { getAiProvider } from "@/lib/ai/factory";

export type ScanReceiptResponse = 
  | { success: true; data: TransactionRow[]; parsedIds: string[] }
  | { success: false; error: string };

/**
 * Scans one or more receipt images and extracts transaction rows using the configured AI provider.
 * @param images Array of { base64, mimeType } objects
 * @param translateNames If true, translates abbreviated names to readable product names
 * @returns Object indicating success/failure and data/error
 */
export async function scanReceiptImages(
  images: { id?: string; name?: string; base64: string; mimeType: string }[],
  translateNames: boolean = false,
  aiConfig?: { provider: string; activeModel: string }
): Promise<ScanReceiptResponse> {
  if (images.length === 0) return { success: true, data: [], parsedIds: [] };

  const provider = await getAiProvider(aiConfig);

  // Process all images in parallel
  const resultsPerImage = await Promise.allSettled(
    images.map(async ({ base64, mimeType }) => {
      return provider.scanReceiptImage(base64, mimeType, translateNames);
    })
  );

  // Flatten and convert to TransactionRow
  const today = new Date().toISOString().slice(0, 10);
  const allRows: TransactionRow[] = [];
  const errors: string[] = [];
  const parsedIds: string[] = [];

  for (let i = 0; i < resultsPerImage.length; i++) {
    const settled = resultsPerImage[i];
    const sourceImage = images[i];

    if (!settled || !sourceImage) continue;

    if (settled.status === "rejected") {
      console.error(`Failed to scan receipt image ${sourceImage.name || i}:`, settled.reason);
      errors.push(settled.reason?.message || String(settled.reason));
      continue;
    }
    
    if (sourceImage.id) {
      parsedIds.push(sourceImage.id);
    }

    const items = settled.value;
    for (const item of items) {
      const row: TransactionRow = {
        id: crypto.randomUUID(),
        date: item.date ?? today,
        item: item.item,
        amount: item.amount,
        categoryId: null,
        accountId: null,
        notes: "",
        source: "scan",
      };
      
      if (sourceImage.name) {
        row.receiptName = sourceImage.name;
      }
      
      allRows.push(row);
    }
  }

  if (allRows.length === 0 && errors.length > 0) {
    return { success: false, error: `Gagal membaca nota: ${errors[0]}` };
  }

  return { success: true, data: allRows, parsedIds };
}
