import Fuse from "fuse.js";
import { SuggestionMatch, KeywordMapping } from "./types";

/**
 * Calculates a confidence score based on Fuse's distance score and keyword usage count.
 * Fuse score: 0 is exact match, 1 is total mismatch.
 */
function calculateFuzzyConfidence(fuseScore: number, usageCount: number): number {
  // Base confidence starts from 0.85 and decreases as the fuse score (error) increases.
  const baseScore = Math.max(0.1, 0.85 - fuseScore);
  
  // Usage count slightly boosts the confidence (0.005 per usage)
  const usageBoost = usageCount * 0.005;
  
  // Cap at 0.89 so it never overrides an exact or alias match (which starts at 0.90)
  return Math.min(0.89, Number((baseScore + usageBoost).toFixed(2)));
}

/**
 * Uses fuse.js to find fuzzy matches for typos.
 */
export function findFuzzyMatch(
  text: string,
  mappings: KeywordMapping[] = []
): SuggestionMatch | null {
  if (!text || !text.trim() || mappings.length === 0) return null;

  const fuse = new Fuse(mappings, {
    keys: ["keyword"],
    includeScore: true,
    threshold: 0.4, // Threshold for typo matching (0.0 is perfect, 1.0 is mismatch)
    distance: 100, // Maximum distance to search for a match
  });

  const results = fuse.search(text.trim());
  if (results.length === 0) return null;

  const bestMatch = results[0];
  if (!bestMatch) return null;

  const fuseScore = bestMatch.score ?? 1;
  const confidence = calculateFuzzyConfidence(fuseScore, bestMatch.item.usageCount);

  return {
    categoryId: bestMatch.item.categoryId,
    confidence,
    source: "fuzzy",
  };
}
