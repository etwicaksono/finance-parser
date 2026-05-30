"use server";

import { AiClassificationResult } from "@/features/categorization/taxonomy";
import { getAiProvider } from "@/lib/ai/factory";

/**
 * Classifies a single transaction item using the configured AI provider.
 *
 * @throws Error if provider configuration is missing.
 */
export async function classifyTransaction(
  item: string, 
  aiConfig?: { provider: string; activeModel: string }
): Promise<AiClassificationResult> {
  const provider = await getAiProvider(aiConfig);
  return provider.classifyTransaction(item);
}

/**
 * Batch classify multiple transaction items.
 * Deduplicates by item name before calling AI — avoids redundant API calls.
 *
 * @throws Error if GEMINI_API_KEY is not configured (on first call).
 */
export async function batchClassifyTransactions(
  items: string[],
  aiConfig?: { provider: string; activeModel: string }
): Promise<Map<string, AiClassificationResult>> {
  const uniqueItems = [...new Set(items.map((i) => i.toLowerCase().trim()))];
  const results = new Map<string, AiClassificationResult>();

  // Call in parallel (up to 5 at a time to avoid rate limits)
  const BATCH_SIZE = 5;
  for (let i = 0; i < uniqueItems.length; i += BATCH_SIZE) {
    const batch = uniqueItems.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map((item) => classifyTransaction(item, aiConfig))
    );
    for (let j = 0; j < batch.length; j++) {
      const item = batch[j]!;
      const result = settled[j]!;
      if (result.status === "fulfilled") {
        results.set(item, result.value);
      }
      // If rejected, the item simply won't be in the map → no category assigned
    }
  }

  return results;
}
