import { describe, it, expect } from "vitest";
import {
  dedupeLabelIds,
  sortedLabelIds,
  filterKnownLabelIds,
  parseLabelValue,
  serializeLabelIds,
  resolveLabelNames,
  joinLabelNames,
} from "./label-utils";
import { LabelOption } from "@/types";

const labels: LabelOption[] = [
  { id: "l-food", name: "Food" },
  { id: "l-house", name: "Household" },
  { id: "l-bills", name: "Bills" },
];

describe("dedupeLabelIds", () => {
  it("removes duplicates while preserving first-seen order", () => {
    expect(dedupeLabelIds(["l-a", "l-b", "l-a", "", "l-c"])).toEqual(["l-a", "l-b", "l-c"]);
  });

  it("handles empty input", () => {
    expect(dedupeLabelIds([])).toEqual([]);
  });
});

describe("sortedLabelIds", () => {
  it("sorts and dedupes so ordering never affects identity", () => {
    expect(sortedLabelIds(["l-c", "l-a", "l-c", "l-b"])).toEqual(["l-a", "l-b", "l-c"]);
    expect(sortedLabelIds(["l-b", "l-a"])).toEqual(["l-a", "l-b"]);
  });
});

describe("filterKnownLabelIds", () => {
  it("keeps only ids that resolve to a known label", () => {
    expect(filterKnownLabelIds(["l-food", "ghost", "l-bills"], labels)).toEqual([
      "l-food",
      "l-bills",
    ]);
  });
});

describe("parseLabelValue", () => {
  it("parses a serialized JSON id array (editor format)", () => {
    expect(parseLabelValue('["l-food","l-house"]', labels)).toEqual({
      ids: ["l-food", "l-house"],
      unknownTokens: [],
    });
  });

  it("reports unknown ids from JSON arrays as unknown tokens", () => {
    expect(parseLabelValue('["l-food","ghost"]', labels)).toEqual({
      ids: ["l-food"],
      unknownTokens: ["ghost"],
    });
  });

  it("parses comma-separated display names case-insensitively", () => {
    expect(parseLabelValue("food, HOUSEHOLD", labels)).toEqual({
      ids: ["l-food", "l-house"],
      unknownTokens: [],
    });
  });

  it("tolerates stray whitespace and trailing commas", () => {
    expect(parseLabelValue(" Food , Household , ", labels)).toEqual({
      ids: ["l-food", "l-house"],
      unknownTokens: [],
    });
  });

  it("reports unknown names so the UI can warn", () => {
    expect(parseLabelValue("Food, Lainnya", labels)).toEqual({
      ids: ["l-food"],
      unknownTokens: ["Lainnya"],
    });
  });

  it("dedupes repeated names within one cell", () => {
    expect(parseLabelValue("Food, Food, Bills", labels)).toEqual({
      ids: ["l-food", "l-bills"],
      unknownTokens: [],
    });
  });

  it("returns empty results for empty input and non-string JSON arrays", () => {
    expect(parseLabelValue("", labels)).toEqual({ ids: [], unknownTokens: [] });
    expect(parseLabelValue("   ", labels)).toEqual({ ids: [], unknownTokens: [] });
    expect(parseLabelValue("[1,2]", labels)).toEqual({ ids: [], unknownTokens: [] });
  });

  it("treats quoted plain text as an unknown label name", () => {
    expect(parseLabelValue('"not an array"', labels)).toEqual({
      ids: [],
      unknownTokens: ['"not an array"'],
    });
  });
});

describe("serializeLabelIds", () => {
  it("round-trips through parseLabelValue", () => {
    const serialized = serializeLabelIds(["l-house", "l-food", "l-house"]);
    expect(serialized).toBe('["l-house","l-food"]');
    expect(parseLabelValue(serialized, labels).ids).toEqual(["l-house", "l-food"]);
  });
});

describe("resolveLabelNames / joinLabelNames", () => {
  it("resolves ids to names in id order", () => {
    expect(resolveLabelNames(["l-food", "l-house"], labels)).toEqual(["Food", "Household"]);
  });

  it("skips ids that are not in the label list", () => {
    expect(resolveLabelNames(["l-food", "ghost"], labels)).toEqual(["Food"]);
  });

  it("joins names with comma-space", () => {
    expect(joinLabelNames(["l-food", "l-house"], labels)).toBe("Food, Household");
    expect(joinLabelNames([], labels)).toBe("");
  });
});
