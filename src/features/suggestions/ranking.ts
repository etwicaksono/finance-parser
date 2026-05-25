import { SuggestionMatch } from "./types";

/**
 * Ranks multiple matches and selects the best one.
 * If there's a tie, the first one in the sorted list is returned.
 */
export function rankMatches(matches: SuggestionMatch[]): SuggestionMatch | null {
  if (!matches || matches.length === 0) return null;
  
  // Create a new array and sort by confidence descending
  const sorted = [...matches].sort((a, b) => b.confidence - a.confidence);
  
  return sorted[0] || null;
}
