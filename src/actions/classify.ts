"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { AiClassificationResult, CATEGORIZATION_SYSTEM_PROMPT } from "@/features/categorization/taxonomy";

/**
 * Classifies a single transaction item using Gemini AI.
 *
 * @throws Error if GEMINI_API_KEY is not configured.
 */
export async function classifyTransaction(item: string): Promise<AiClassificationResult> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please add it to your .env file.\n" +
      "Get a free key from: https://aistudio.google.com/app/apikey"
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: CATEGORIZATION_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const result = await model.generateContent(item);
  const text = result.response.text();

  try {
    const parsed = JSON.parse(text) as AiClassificationResult;
    return parsed;
  } catch {
    throw new Error(`AI returned invalid JSON for item "${item}": ${text}`);
  }
}

/**
 * Batch classify multiple transaction items.
 * Deduplicates by item name before calling AI — avoids redundant API calls.
 *
 * @throws Error if GEMINI_API_KEY is not configured (on first call).
 */
export async function batchClassifyTransactions(
  items: string[]
): Promise<Map<string, AiClassificationResult>> {
  const uniqueItems = [...new Set(items.map((i) => i.toLowerCase().trim()))];
  const results = new Map<string, AiClassificationResult>();

  // Call in parallel (up to 5 at a time to avoid rate limits)
  const BATCH_SIZE = 5;
  for (let i = 0; i < uniqueItems.length; i += BATCH_SIZE) {
    const batch = uniqueItems.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map((item) => classifyTransaction(item))
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
