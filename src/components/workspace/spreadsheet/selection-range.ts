/**
 * Pure helpers for rectangular multi-cell selections.
 *
 * A selection is a list of non-overlapping axis-aligned rectangles
 * ({minRow, maxRow, minCol, maxCol}). Removing a cell/rectangle from a
 * selection must keep the model rectangular, so a containing rectangle is
 * split into up to four sub-rectangles that exclude the removed region.
 */

export type CellRange = { minRow: number; maxRow: number; minCol: number; maxCol: number };

export type CellPosition = { rowIndex: number; colIndex: number };

/** Rectangle spanning two cells, regardless of drag direction. */
export function rangeBetween(a: CellPosition, b: CellPosition): CellRange {
  return {
    minRow: Math.min(a.rowIndex, b.rowIndex),
    maxRow: Math.max(a.rowIndex, b.rowIndex),
    minCol: Math.min(a.colIndex, b.colIndex),
    maxCol: Math.max(a.colIndex, b.colIndex),
  };
}

export function rangeContains(range: CellRange, rowIndex: number, colIndex: number): boolean {
  return (
    rowIndex >= range.minRow &&
    rowIndex <= range.maxRow &&
    colIndex >= range.minCol &&
    colIndex <= range.maxCol
  );
}

function rangeOverlaps(a: CellRange, b: CellRange): boolean {
  return (
    a.minRow <= b.maxRow &&
    a.maxRow >= b.minRow &&
    a.minCol <= b.maxCol &&
    a.maxCol >= b.minCol
  );
}

/** Rectangle that excludes `removed` but stays inside `range`. */
function differenceParts(range: CellRange, removed: CellRange): CellRange[] {
  const parts: CellRange[] = [];

  // Above the removed rows (full column span of the range).
  if (range.minRow < removed.minRow) {
    parts.push({
      minRow: range.minRow,
      maxRow: removed.minRow - 1,
      minCol: range.minCol,
      maxCol: range.maxCol,
    });
  }

  // Below the removed rows.
  if (removed.maxRow < range.maxRow) {
    parts.push({
      minRow: removed.maxRow + 1,
      maxRow: range.maxRow,
      minCol: range.minCol,
      maxCol: range.maxCol,
    });
  }

  // Rows that vertically overlap the removed region…
  const overlapMinRow = Math.max(range.minRow, removed.minRow);
  const overlapMaxRow = Math.min(range.maxRow, removed.maxRow);

  // …left of the removed columns.
  if (overlapMinRow <= overlapMaxRow && range.minCol < removed.minCol) {
    parts.push({
      minRow: overlapMinRow,
      maxRow: overlapMaxRow,
      minCol: range.minCol,
      maxCol: removed.minCol - 1,
    });
  }

  // …and right of the removed columns.
  if (overlapMinRow <= overlapMaxRow && removed.maxCol < range.maxCol) {
    parts.push({
      minRow: overlapMinRow,
      maxRow: overlapMaxRow,
      minCol: removed.maxCol + 1,
      maxCol: range.maxCol,
    });
  }

  return parts;
}

/**
 * Return the rectangles that remain after removing `removed` from `ranges`.
 * Ranges that do not intersect `removed` are kept untouched.
 */
export function subtractRangeFromRanges(ranges: CellRange[], removed: CellRange): CellRange[] {
  const result: CellRange[] = [];
  for (const range of ranges) {
    if (!rangeOverlaps(range, removed)) {
      result.push(range);
      continue;
    }
    result.push(...differenceParts(range, removed));
  }
  return result;
}
