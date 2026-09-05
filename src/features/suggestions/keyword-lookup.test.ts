import { describe, it, expect } from "vitest";
import { findExactMatch } from "./keyword-lookup";
import { KeywordMapping, AliasMapping } from "./types";

describe("findExactMatch", () => {
  const mappings: KeywordMapping[] = [
    { keyword: "makan", categoryId: "c1", labelIds: [], usageCount: 5 }, // 0.95 + 0.05 = 1.0
    { keyword: "bensin", categoryId: "c2", labelIds: ["L1"], usageCount: 2 }, // 0.95 + 0.02 = 0.97
    { keyword: "listrik", categoryId: "c3", labelIds: [], usageCount: 0 }, // 0.95
  ];

  const aliases: AliasMapping[] = [
    { alias: "mkn", canonicalText: "makan" }, // 0.9 + 0.05 = 0.95
    { alias: "bnsn", canonicalText: "bensin" }, // 0.9 + 0.02 = 0.92
  ];

  it("returns exact match with boosted confidence based on usage count", () => {
    expect(findExactMatch("makan", mappings, aliases)).toEqual({
      categoryId: "c1",
      labelIds: [],
      confidence: 1.0,
      source: "exact",
    });

    expect(findExactMatch("Bensin", mappings, aliases)).toEqual({
      categoryId: "c2",
      labelIds: ["L1"],
      confidence: 0.97,
      source: "exact",
    });

    expect(findExactMatch(" listrik ", mappings, aliases)).toEqual({
      categoryId: "c3",
      labelIds: [],
      confidence: 0.95, // 0 usage
      source: "exact",
    });
  });

  it("returns alias match resolving to canonical keyword", () => {
    expect(findExactMatch("mkn", mappings, aliases)).toEqual({
      categoryId: "c1",
      labelIds: [],
      confidence: 0.95, // base 0.9 + 0.05
      source: "alias",
    });

    expect(findExactMatch("BNSN", mappings, aliases)).toEqual({
      categoryId: "c2",
      labelIds: ["L1"],
      confidence: 0.92, // base 0.9 + 0.02
      source: "alias",
    });
  });

  it("returns an empty label list when the mapping has no labels", () => {
    const noLabels = [
      { keyword: "roti", categoryId: "c9", labelIds: [], usageCount: 0 },
    ];
    expect(findExactMatch("roti", noLabels)?.labelIds).toEqual([]);
  });

  it("caps confidence at 1.0", () => {
    const highUsage = [{ keyword: "rokok", categoryId: "c4", labelIds: [], usageCount: 100 }];
    expect(findExactMatch("rokok", highUsage)).toEqual({
      categoryId: "c4",
      labelIds: [],
      confidence: 1.0,
      source: "exact",
    });
  });

  it("returns null if no match is found", () => {
    expect(findExactMatch("unknown", mappings, aliases)).toBeNull();
    expect(findExactMatch("", mappings, aliases)).toBeNull();
    expect(findExactMatch("   ", mappings, aliases)).toBeNull();
  });
});
