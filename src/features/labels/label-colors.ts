/**
 * Pure label-color helpers shared by the labels settings UI, the spreadsheet
 * label chips and the label dropdown editors. Kept free of React/server
 * imports so they can be unit tested.
 *
 * Colors are stored as lowercase "#rrggbb" or NULL. NULL keeps the original
 * neutral chip styling.
 */

export interface LabelColorFields {
  textColor?: string | null;
  bgColor?: string | null;
}

const WHITE = "#ffffff";
const BLACK = "#000000";

/** Accepts "#rgb", "#rrggbb" or the same without the leading "#". */
export function normalizeHexColor(input: string | null | undefined): string | null {
  if (!input) return null;
  let hex = input.trim();
  if (hex.startsWith("#")) hex = hex.slice(1);
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    hex = hex
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
  return `#${hex.toLowerCase()}`;
}

export function isValidLabelColor(input: string | null | undefined): boolean {
  return normalizeHexColor(input) !== null;
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of a hex color (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return 0;
  const [r, g, b] = hexToRgb(normalized);
  const lr = channelLuminance(r);
  const lg = channelLuminance(g);
  const lb = channelLuminance(b);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** WCAG contrast ratio between two hex colors (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Best readable text color (black or white) for the given background.
 * Picks the candidate with the higher WCAG contrast ratio.
 */
export function suggestTextColorFor(backgroundHex: string): string {
  const bg = normalizeHexColor(backgroundHex);
  if (!bg) return WHITE;
  const onWhite = contrastRatio(bg, WHITE);
  const onBlack = contrastRatio(bg, BLACK);
  return onBlack > onWhite ? BLACK : WHITE;
}

/**
 * Best readable background color (black or white) for the given text color.
 * Contrast is symmetric, but the name keeps the intent explicit at call sites.
 */
export function suggestBackgroundColorFor(textHex: string): string {
  return suggestTextColorFor(textHex);
}

/**
 * Resolve a label's (possibly partial) colors into concrete chip colors.
 *
 * - Both colors set: used as-is.
 * - Only background set: text falls back to the contrasting suggestion.
 * - Only text set: background falls back to the contrasting suggestion.
 * - Neither set: no inline style (original neutral chip styling).
 */
export function resolveLabelChipColors(label: LabelColorFields): {
  backgroundColor?: string;
  color?: string;
} {
  const text = normalizeHexColor(label.textColor);
  const bg = normalizeHexColor(label.bgColor);
  if (text && bg) return { backgroundColor: bg, color: text };
  if (bg) return { backgroundColor: bg, color: suggestTextColorFor(bg) };
  if (text) return { backgroundColor: suggestBackgroundColorFor(text), color: text };
  return {};
}

export function hasCustomLabelColors(label: LabelColorFields): boolean {
  return normalizeHexColor(label.textColor) !== null || normalizeHexColor(label.bgColor) !== null;
}
