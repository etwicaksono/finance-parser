export interface SuggestionMatch {
  categoryId: string;
  confidence: number;
  source: "exact" | "alias" | "fuzzy";
}
