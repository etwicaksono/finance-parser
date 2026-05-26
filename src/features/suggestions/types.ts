export interface KeywordMapping {
  keyword: string;
  categoryId: string | null;
  aiCategory?: string;
  aiParentCategory?: string;
  usageCount: number;
}

export interface AliasMapping {
  alias: string;
  canonicalText: string;
}

export interface SuggestionMatch {
  categoryId: string | null;
  aiCategory?: string;
  aiParentCategory?: string;
  confidence: number;
  source: "exact" | "alias" | "fuzzy";
}
