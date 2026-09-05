import { describe, it, expect } from "vitest";
import { rankMatches } from "./ranking";
import { SuggestionMatch } from "./types";

describe("rankMatches", () => {
  it("returns the match with the highest confidence", () => {
    const matches: SuggestionMatch[] = [
      { categoryId: "c1", labelIds: [], confidence: 0.8, source: "fuzzy" },
      { categoryId: "c2", labelIds: ["L1"], confidence: 0.95, source: "exact" },
      { categoryId: "c3", labelIds: [], confidence: 0.9, source: "alias" },
    ];
    const best = rankMatches(matches);
    expect(best?.categoryId).toBe("c2");
    expect(best?.labelIds).toEqual(["L1"]);
  });

  it("returns null if matches array is empty", () => {
    expect(rankMatches([])).toBeNull();
  });
});
