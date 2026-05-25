import { SuggestionMatch } from "./types";

/**
 * Ranks multiple matches and selects the best one.
 */
export function rankMatches(matches: SuggestionMatch[]): SuggestionMatch | null {
  if (matches.length === 0) return null;
  
  // Sort by confidence descending
  return matches.sort((a, b) => b.confidence - a.confidence)[0] || null;
}
