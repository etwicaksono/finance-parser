import { describe, it, expect } from "vitest";
import { suggestCategory } from "./category-suggester";
import { KeywordMapping, AliasMapping } from "./types";

describe("suggestCategory", () => {
  const mappings: KeywordMapping[] = [
    { keyword: "makan", categoryId: "c1", labelIds: ["L1", "L2"], usageCount: 5 }, // exact: 1.0, fuzzy: 0.85+
    { keyword: "bensin", categoryId: "c2", labelIds: ["L1"], usageCount: 2 }, // exact: 0.97
  ];

  const aliases: AliasMapping[] = [
    { alias: "mkn", canonicalText: "makan" }, // alias: 0.95
  ];

  it("prioritizes exact match over fuzzy match", () => {
    // "makan" will trigger exact match (confidence 1.0) and fuzzy match (confidence 0.87)
    // The ranking should pick exact.
    const result = suggestCategory("makan", mappings, aliases);
    expect(result).not.toBeNull();
    expect(result?.source).toBe("exact");
    expect(result?.categoryId).toBe("c1");
    expect(result?.labelIds).toEqual(["L1", "L2"]);
  });

  it("uses alias match if available", () => {
    // "mkn" will trigger alias match (0.95). 
    // Fuzzy might not trigger on "mkn" against "makan" depending on score, but alias wins anyway.
    const result = suggestCategory("mkn", mappings, aliases);
    expect(result).not.toBeNull();
    expect(result?.source).toBe("alias");
    expect(result?.categoryId).toBe("c1");
  });

  it("falls back to fuzzy match if exact and alias fail", () => {
    // "bensn" fails exact and alias, triggers fuzzy for "bensin"
    const result = suggestCategory("bensn", mappings, aliases);
    expect(result).not.toBeNull();
    expect(result?.source).toBe("fuzzy");
    expect(result?.categoryId).toBe("c2");
  });

  it("returns null if no matches at all", () => {
    const result = suggestCategory("qwertyuiop", mappings, aliases);
    expect(result).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(suggestCategory("   ", mappings, aliases)).toBeNull();
  });
});
