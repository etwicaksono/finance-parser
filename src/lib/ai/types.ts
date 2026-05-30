import { AiClassificationResult } from "@/features/categorization/taxonomy";

export interface ReceiptItem {
  date: string | null;
  item: string;
  amount: number;
}

export interface AiProvider {
  /**
   * Classifies a single transaction item.
   */
  classifyTransaction(item: string): Promise<AiClassificationResult>;

  /**
   * Scans a receipt image and extracts items.
   * @param translateNames If true, AI will try to expand abbreviations into readable names.
   */
  scanReceiptImage(base64: string, mimeType: string, translateNames?: boolean): Promise<ReceiptItem[]>;

  /**
   * Tests the connection and API key validity.
   * Throws an error if it fails.
   */
  ping(): Promise<void>;
}
