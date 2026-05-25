import { SuggestionMatch, KeywordMapping, AliasMapping } from "./types";
import { findExactMatch } from "./keyword-lookup";
import { findFuzzyMatch } from "./fuzzy-matcher";
import { rankMatches } from "./ranking";

/**
 * Main entry point for category suggestions.
 * Orchestrates exact lookup, fuzzy matching, and ranking.
 */
export function suggestCategory(
  itemText: string,
  mappings: KeywordMapping[] = [],
  aliases: AliasMapping[] = []
): SuggestionMatch | null {
  if (!itemText || !itemText.trim()) return null;

  const matches: SuggestionMatch[] = [];

  const exactMatch = findExactMatch(itemText, mappings, aliases);
  if (exactMatch) matches.push(exactMatch);

  const fuzzyMatch = findFuzzyMatch(itemText, mappings);
  if (fuzzyMatch) matches.push(fuzzyMatch);

  return rankMatches(matches);
}
