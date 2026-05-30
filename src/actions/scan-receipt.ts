"use server";

import { TransactionRow } from "@/types";
import { getAiProvider } from "@/lib/ai/factory";

export type ScanReceiptResponse = 
  | { success: true; data: TransactionRow[] }
  | { success: false; error: string };

/**
 * Scans one or more receipt images and extracts transaction rows using the configured AI provider.
 * @param images Array of { base64, mimeType } objects
 * @param translateNames If true, translates abbreviated names to readable product names
 * @returns Object indicating success/failure and data/error
 */
export async function scanReceiptImages(
  images: { base64: string; mimeType: string }[],
  translateNames: boolean = false,
  aiConfig?: { provider: string; activeModel: string }
): Promise<ScanReceiptResponse> {
  if (images.length === 0) return { success: true, data: [] };

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

  for (const settled of resultsPerImage) {
    if (settled.status === "rejected") {
      console.error("Failed to scan a receipt image:", settled.reason);
      errors.push(settled.reason?.message || String(settled.reason));
      continue;
    }
    const items = settled.value;
    for (const item of items) {
      allRows.push({
        id: crypto.randomUUID(),
        date: item.date ?? today,
        item: item.item,
        amount: item.amount,
        categoryId: null,
        accountId: null,
        notes: "",
      });
    }
  }

  if (allRows.length === 0 && errors.length > 0) {
    return { success: false, error: `Gagal membaca nota: ${errors[0]}` };
  }

  return { success: true, data: allRows };
}
