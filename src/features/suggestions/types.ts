export interface KeywordMapping {
  keyword: string;
  categoryId: string | null;
  labelIds: string[];
  usageCount: number;
}

export interface AliasMapping {
  alias: string;
  canonicalText: string;
}

export interface SuggestionMatch {
  categoryId: string | null;
  labelIds: string[];
  confidence: number;
  source: "exact" | "alias" | "fuzzy";
}
