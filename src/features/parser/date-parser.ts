/**
 * Extracts a WhatsApp timestamp from the beginning of a line.
 * Formats supported:
 * - [5/16, 11:38] -> [M/D, HH:mm]
 * - [16/05/26, 11:38:00] -> [DD/MM/YY, HH:mm:ss]
 * - [16/05/2026, 11:38] -> [DD/MM/YYYY, HH:mm]
 * 
 * Returns ISO Date string (YYYY-MM-DD) or null.
 */
export function extractChatDate(line: string, defaultYear: number = new Date().getFullYear()): string | null {
  const match = line.match(/^\[(.*?)\]/);
  if (!match) return null;

  const content = match[1] || ""; // e.g. "5/16, 11:38"
  const datePart = content.split(/[, ]+/)[0];
  if (!datePart) return null;

  const parts = datePart.split(/[-/.]/).map(Number);
  const p0 = parts[0] as number;
  const p1 = parts[1] as number;
  const p2 = parts[2] as number;

  let d = 1, m = 1, y = defaultYear;

  if (parts.length === 2) {
    if (p0 > 12) {
      d = p0;
      m = p1;
    } else if (p1 > 12) {
      m = p0;
      d = p1;
    } else {
      d = p0;
      m = p1;
    }
  } else if (parts.length === 3) {
    if (p0 > 12) {
      d = p0;
      m = p1;
    } else if (p1 > 12) {
      m = p0;
      d = p1;
    } else {
      d = p0;
      m = p1;
    }
    y = p2;
    if (y < 100) y += 2000;
  } else {
    return null;
  }

  return formatIso(y, m, d);
}

/**
 * Extracts an explicit override date from the text message.
 * Matches formats like: 14/05/2026, 14-05-2026, Kamis, 14-05-2026, 14 Mei 2026
 * If found, returns ISO Date string (YYYY-MM-DD), else null.
 */
export function extractExplicitDate(text: string, defaultYear: number = new Date().getFullYear()): string | null {
  // Regex to match DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY
  const regex = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/;
  const match = text.match(regex);
  if (match) {
    let d = parseInt(match[1] || "1", 10);
    let m = parseInt(match[2] || "1", 10);
    let y = parseInt(match[3] || "2000", 10);

    if (y < 100) y += 2000;
    if (m > 12 && d <= 12) {
      const temp = d;
      d = m;
      m = temp;
    }
    return formatIso(y, m, d);
  }

  // Textual dates: 14 May 2026, 14 Mei 2026, 14 Mei
  const textRegex = /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|Mei|May|Jun|Jul|Agu|Aug|Sep|Okt|Oct|Nov|Des|Dec)[a-z]*(?:\s+(\d{2,4}))?\b/i;
  const textMatch = text.match(textRegex);
  if (textMatch) {
    const d = parseInt(textMatch[1] || "1", 10);
    const mStr = (textMatch[2] || "jan").toLowerCase();
    const months: Record<string, number> = {
      jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6,
      jul: 7, agu: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12
    };
    const m = months[mStr] || 1;
    let y = textMatch[3] ? parseInt(textMatch[3], 10) : defaultYear;
    if (y < 100) y += 2000;
    
    return formatIso(y, m, d);
  }

  return null;
}

function formatIso(y: number, m: number, d: number): string | null {
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  // Basic validation
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * Checks if the given text is solely a date declaration.
 * This prevents a line like "Kamis, 14-05-2026" from being parsed as a transaction.
 */
export function isJustDate(text: string): boolean {
  const dayNames = "(?:senin|selasa|rabu|kamis|jumat|sabtu|minggu|monday|tuesday|wednesday|thursday|friday|saturday|sunday)";
  const numericDate = "\\d{1,2}[-/\\s.]+\\d{1,2}(?:[-/\\s.]+\\d{2,4})?";
  const textDate = "\\d{1,2}\\s+(?:jan|feb|mar|apr|mei|may|jun|jul|agu|aug|sep|okt|oct|nov|des|dec)[a-z]*(?:\\s+\\d{2,4})?";
  const regex = new RegExp(`^(?:${dayNames}\\s*,?\\s*)?(?:${numericDate}|${textDate})$`, "i");
  return regex.test(text.trim());
}
