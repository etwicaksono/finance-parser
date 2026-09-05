import { LabelOption } from "@/types";

/**
 * Pure helpers shared by the spreadsheet, column handlers and copy serializers.
 * Kept free of React/server imports so they can be unit tested.
 */

/** Remove duplicates preserving order. */
export function dedupeLabelIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Stable sort so ordering never changes group identity or copy output. */
export function sortedLabelIds(ids: string[]): string[] {
  return dedupeLabelIds(ids).sort();
}

/** Keep only ids that resolve to a known label. */
export function filterKnownLabelIds(ids: string[], labels: LabelOption[]): string[] {
  const known = new Set(labels.map((l) => l.id));
  return dedupeLabelIds(ids).filter((id) => known.has(id));
}

/**
 * Parse the value a label cell receives. Two formats are supported:
 *
 * - Serialized JSON array of ids produced by the multi-select editor, e.g.
 *   `["abc","def"]`.
 * - Display text produced by pasting, e.g. `Food, Household` (names resolved
 *   case-insensitively; unknown names are reported so the UI can warn).
 */
export function parseLabelValue(
  value: string,
  labels: LabelOption[],
): { ids: string[]; unknownTokens: string[] } {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return { ids: [], unknownTokens: [] };

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (!Array.isArray(parsed)) return { ids: [], unknownTokens: [] };
      const raw = parsed.filter((x): x is string => typeof x === "string");
      const known = new Set(labels.map((l) => l.id));
      const ids = dedupeLabelIds(raw.filter((id) => known.has(id)));
      const unknownTokens = raw.filter((id) => !known.has(id));
      return { ids, unknownTokens };
    } catch {
      return { ids: [], unknownTokens: [] };
    }
  }

  const byLower = new Map<string, string>();
  for (const label of labels) {
    byLower.set(label.name.toLowerCase(), label.id);
  }

  const ids: string[] = [];
  const unknownTokens: string[] = [];
  const seen = new Set<string>();
  for (const token of trimmed.split(",")) {
    const name = token.trim();
    if (!name) continue;
    const id = byLower.get(name.toLowerCase());
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    } else {
      unknownTokens.push(name);
    }
  }
  return { ids, unknownTokens };
}

/** Serialize ids into the JSON form the label cell editor stores. */
export function serializeLabelIds(ids: string[]): string {
  return JSON.stringify(dedupeLabelIds(ids));
}

/** Resolve label ids to display names in the original id order. */
export function resolveLabelNames(ids: string[], labels: LabelOption[]): string[] {
  const byId = new Map(labels.map((l) => [l.id, l.name]));
  const names: string[] = [];
  for (const id of ids) {
    const name = byId.get(id);
    if (name) names.push(name);
  }
  return names;
}

/** Comma-space joined names used for display and Google Sheets cells. */
export function joinLabelNames(ids: string[], labels: LabelOption[]): string {
  return resolveLabelNames(ids, labels).join(", ");
}
