import { describe, it, expect } from "vitest";
import { findFuzzyMatch } from "./fuzzy-matcher";
import { KeywordMapping } from "./types";

describe("findFuzzyMatch", () => {
  const mappings: KeywordMapping[] = [
    { keyword: "semangka", categoryId: "c1", labelIds: ["L1"], usageCount: 10 },
    { keyword: "bensin", categoryId: "c2", labelIds: [], usageCount: 0 },
    { keyword: "listrik", categoryId: "c3", labelIds: ["L2", "L3"], usageCount: 5 },
  ];

  it("finds a fuzzy match for a typo", () => {
    const match = findFuzzyMatch("smangka", mappings);
    expect(match).not.toBeNull();
    expect(match?.categoryId).toBe("c1");
    expect(match?.source).toBe("fuzzy");
    expect(match?.labelIds).toEqual(["L1"]);
    expect(match?.confidence).toBeGreaterThan(0.5);
    // Should be capped at 0.89
    expect(match?.confidence).toBeLessThanOrEqual(0.89);
  });

  it("finds a fuzzy match for another typo", () => {
    const match = findFuzzyMatch("bensn", mappings);
    expect(match).not.toBeNull();
    expect(match?.categoryId).toBe("c2");
    expect(match?.source).toBe("fuzzy");
  });

  it("returns null if the text is too different", () => {
    const match = findFuzzyMatch("qwertyuiop", mappings);
    expect(match).toBeNull();
  });

  it("returns null for empty input or empty mappings", () => {
    expect(findFuzzyMatch("", mappings)).toBeNull();
    expect(findFuzzyMatch("  ", mappings)).toBeNull();
    expect(findFuzzyMatch("semangka", [])).toBeNull();
  });

  it("boosts confidence based on usage count but caps at 0.89", () => {
    const highUsageMappings: KeywordMapping[] = [
      { keyword: "semangka", categoryId: "c1", labelIds: [], usageCount: 1000 },
    ];
    const match = findFuzzyMatch("smangka", highUsageMappings);
    expect(match?.confidence).toBe(0.89);
  });
});
