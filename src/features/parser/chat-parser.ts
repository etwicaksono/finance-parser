import { ParseResult, ParsedTransaction } from "./types";
import { extractChatDate, extractExplicitDate, isJustDate } from "./date-parser";
import { parseLine } from "./line-parser";

/**
 * Parses a full multiline WhatsApp chat.
 * Splits messages, tracks sender, tracks active dates, etc.
 */
export function parseChat(chat: string, defaultYear: number = new Date().getFullYear()): ParseResult {
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  if (!chat || !chat.trim()) {
    return { transactions, errors };
  }

  const lines = chat.split(/\r?\n/);
  
  let activeDate: string | undefined = undefined;
  let activeDateAmbiguous: boolean = false;
  let activeSender: string | undefined = undefined;

  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i]!;
    const trimmedLine = originalLine.trim();

    if (!trimmedLine) continue;

    let contentToParse = trimmedLine;

    // 1. Check for chat timestamp and sender
    const chatDateExtract = extractChatDate(trimmedLine, defaultYear);
    if (chatDateExtract) {
      // When a new chat message starts, reset the date to the chat timestamp
      activeDate = chatDateExtract.date;
      activeDateAmbiguous = chatDateExtract.isAmbiguous;
      
      // Extract sender and actual content
      // Pattern: [Date] Sender: Content
      // Example: [5/16, 11:38] Budi: Semangka 20k
      const senderMatch = trimmedLine.match(/^\[.*?\]\s*([^:]+):\s*(.*)/);
      if (senderMatch) {
        activeSender = senderMatch[1]?.trim();
        contentToParse = senderMatch[2]?.trim() || "";
      } else {
        // No sender found (e.g. system message or manually typed without sender)
        const contentMatch = trimmedLine.match(/^\[.*?\]\s*(.*)/);
        if (contentMatch) {
          contentToParse = contentMatch[1]?.trim() || "";
        }
      }
    }

    if (!contentToParse) continue;

    // 2. Check for explicit date override in the content
    const explicitDateExtract = extractExplicitDate(contentToParse, defaultYear);
    if (explicitDateExtract) {
      activeDate = explicitDateExtract.date;
      activeDateAmbiguous = explicitDateExtract.isAmbiguous;
      // If the line is exclusively a date declaration, do not treat it as a transaction
      if (isJustDate(contentToParse)) {
        continue;
      }
    }

    // 3. Try to parse as a transaction line
    const parsedLine = parseLine(contentToParse);
    if (parsedLine) {
      transactions.push({
        item: parsedLine.item,
        amount: parsedLine.amount,
        date: activeDate,
        sender: activeSender,
        isDateAmbiguous: activeDateAmbiguous,
      });
    }
  }

  return { transactions, errors };
}
