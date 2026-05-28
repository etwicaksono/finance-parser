import { SuggestionMatch, KeywordMapping, AliasMapping } from "./types";

/**
 * Calculates a confidence score based on usage count.
 * Base score for exact match is 0.95, growing to 1.0 with usage.
 */
function calculateConfidence(baseScore: number, usageCount: number): number {
  // Every usage adds 0.01 to the confidence score
  const score = baseScore + usageCount * 0.01;
  return Math.min(1.0, Number(score.toFixed(2)));
}

/**
 * Looks up exact keywords and aliases.
 */
export function findExactMatch(
  text: string,
  mappings: KeywordMapping[] = [],
  aliases: AliasMapping[] = []
): SuggestionMatch | null {
  if (!text || !text.trim()) return null;

  const lowerText = text.trim().toLowerCase();

  // 1. Try exact alias match
  const matchedAlias = aliases.find((a) => a.alias.toLowerCase() === lowerText);
  const searchKeyword = matchedAlias ? matchedAlias.canonicalText.toLowerCase() : lowerText;

  // 2. Try exact keyword match
  const matchedMapping = mappings.find((m) => m.keyword.toLowerCase() === searchKeyword);

  if (matchedMapping) {
    const isAlias = !!matchedAlias;
    const baseScore = isAlias ? 0.9 : 0.95; // Alias gives a slightly lower base confidence
    const confidence = calculateConfidence(baseScore, matchedMapping.usageCount);

    const result: SuggestionMatch = {
      categoryId: matchedMapping.categoryId,
      confidence,
      source: isAlias ? "alias" : "exact",
    };
    return result;
  }

  return null;
}
