import { describe, it, expect } from "vitest";
import { rangeBetween, rangeContains, subtractRangeFromRanges, CellRange } from "./selection-range";

describe("rangeBetween", () => {
  it("spans two cells regardless of drag direction", () => {
    expect(rangeBetween({ rowIndex: 3, colIndex: 5 }, { rowIndex: 1, colIndex: 2 })).toEqual({
      minRow: 1,
      maxRow: 3,
      minCol: 2,
      maxCol: 5,
    });
    expect(rangeBetween({ rowIndex: 1, colIndex: 2 }, { rowIndex: 1, colIndex: 2 })).toEqual({
      minRow: 1,
      maxRow: 1,
      minCol: 2,
      maxCol: 2,
    });
  });
});

describe("rangeContains", () => {
  const range: CellRange = { minRow: 1, maxRow: 3, minCol: 2, maxCol: 5 };

  it("returns true inside the range and false outside", () => {
    expect(rangeContains(range, 2, 3)).toBe(true);
    expect(rangeContains(range, 1, 5)).toBe(true);
    expect(rangeContains(range, 0, 3)).toBe(false);
    expect(rangeContains(range, 2, 6)).toBe(false);
  });
});

describe("subtractRangeFromRanges", () => {
  const totalArea = (ranges: CellRange[]) =>
    ranges.reduce((sum, r) => sum + (r.maxRow - r.minRow + 1) * (r.maxCol - r.minCol + 1), 0);

  it("removes a single cell from the middle of a rectangle", () => {
    const base: CellRange[] = [{ minRow: 0, maxRow: 2, minCol: 0, maxCol: 2 }];
    const remaining = subtractRangeFromRanges(base, { minRow: 1, maxRow: 1, minCol: 1, maxCol: 1 });

    expect(totalArea(remaining)).toBe(8);
    // All remaining pieces must be rectangles that exclude the removed cell.
    for (const r of remaining) {
      expect(rangeContains(r, 1, 1)).toBe(false);
    }
    expect(remaining).toHaveLength(4);
  });

  it("removes a corner cell from a rectangle", () => {
    const base: CellRange[] = [{ minRow: 0, maxRow: 1, minCol: 0, maxCol: 1 }];
    const remaining = subtractRangeFromRanges(base, { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 });

    expect(totalArea(remaining)).toBe(3);
    expect(remaining).toHaveLength(2);
  });

  it("drops a rectangle entirely when it is fully covered", () => {
    const remaining = subtractRangeFromRanges(
      [{ minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 }],
      { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 },
    );
    expect(remaining).toEqual([]);
  });

  it("removes a sub-rectangle from a larger one", () => {
    const base: CellRange[] = [{ minRow: 0, maxRow: 3, minCol: 0, maxCol: 3 }];
    const removed = { minRow: 1, maxRow: 2, minCol: 1, maxCol: 2 };
    const remaining = subtractRangeFromRanges(base, removed);

    expect(totalArea(remaining)).toBe(16 - 4);
    for (const r of remaining) {
      for (let row = removed.minRow; row <= removed.maxRow; row++) {
        for (let col = removed.minCol; col <= removed.maxCol; col++) {
          expect(rangeContains(r, row, col)).toBe(false);
        }
      }
    }
  });

  it("keeps disjoint ranges untouched", () => {
    const disjoint: CellRange[] = [{ minRow: 10, maxRow: 10, minCol: 10, maxCol: 10 }];
    expect(subtractRangeFromRanges(disjoint, { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 })).toEqual(
      disjoint,
    );
  });

  it("does not mutate the input ranges", () => {
    const base: CellRange[] = [{ minRow: 0, maxRow: 2, minCol: 0, maxCol: 2 }];
    const snapshot = JSON.stringify(base);
    subtractRangeFromRanges(base, { minRow: 1, maxRow: 1, minCol: 1, maxCol: 1 });
    expect(JSON.stringify(base)).toBe(snapshot);
  });
});
