export interface KeywordMapping {
  keyword: string;
  categoryId: string;
  usageCount: number;
}

export interface AliasMapping {
  alias: string;
  canonicalText: string;
}

export interface SuggestionMatch {
  categoryId: string;
  confidence: number;
  source: "exact" | "alias" | "fuzzy";
}
