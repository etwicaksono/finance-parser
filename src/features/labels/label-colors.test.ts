import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  hasCustomLabelColors,
  isValidLabelColor,
  normalizeHexColor,
  relativeLuminance,
  resolveLabelChipColors,
  suggestBackgroundColorFor,
  suggestTextColorFor,
} from "./label-colors";

describe("normalizeHexColor", () => {
  it("normalizes #rrggbb to lowercase", () => {
    expect(normalizeHexColor("#AABBCC")).toBe("#aabbcc");
    expect(normalizeHexColor("AABBCC")).toBe("#aabbcc");
  });

  it("expands 3-digit hex", () => {
    expect(normalizeHexColor("#AbC")).toBe("#aabbcc");
    expect(normalizeHexColor("abc")).toBe("#aabbcc");
  });

  it("rejects invalid values and empties", () => {
    expect(normalizeHexColor("red")).toBeNull();
    expect(normalizeHexColor("#12345")).toBeNull();
    expect(normalizeHexColor("")).toBeNull();
    expect(normalizeHexColor("  ")).toBeNull();
    expect(normalizeHexColor(null)).toBeNull();
    expect(normalizeHexColor(undefined)).toBeNull();
  });

  it("reports validity", () => {
    expect(isValidLabelColor("#fff")).toBe(true);
    expect(isValidLabelColor("")).toBe(false);
  });
});

describe("contrast math", () => {
  it("computes WCAG relative luminance", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 6);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 6);
    expect(relativeLuminance("#808080")).toBeCloseTo(0.21586, 3);
  });

  it("computes contrast ratios", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 6);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 6);
  });
});

describe("contrast suggestions", () => {
  it("suggests white text on dark backgrounds and black text on light ones", () => {
    expect(suggestTextColorFor("#000000")).toBe("#ffffff");
    expect(suggestTextColorFor("#ffffff")).toBe("#000000");
    // Blue #3b82f6: black reaches a higher ratio than white.
    expect(suggestTextColorFor("#3b82f6")).toBe("#000000");
    // Yellow #fde047 is very light: black text.
    expect(suggestTextColorFor("#fde047")).toBe("#000000");
  });

  it("suggests a background that contrasts with the chosen text", () => {
    expect(suggestBackgroundColorFor("#ffffff")).toBe("#000000");
    expect(suggestBackgroundColorFor("#000000")).toBe("#ffffff");
  });
});

describe("resolveLabelChipColors", () => {
  it("uses both colors when provided", () => {
    expect(resolveLabelChipColors({ textColor: "#111111", bgColor: "#fde047" })).toEqual({
      backgroundColor: "#fde047",
      color: "#111111",
    });
  });

  it("fills the text suggestion when only background is set", () => {
    const style = resolveLabelChipColors({ textColor: null, bgColor: "#000000" });
    expect(style).toEqual({ backgroundColor: "#000000", color: "#ffffff" });
  });

  it("fills the background suggestion when only text is set", () => {
    const style = resolveLabelChipColors({ textColor: "#ffffff", bgColor: null });
    expect(style).toEqual({ backgroundColor: "#000000", color: "#ffffff" });
  });

  it("returns no inline style when no color is set", () => {
    expect(resolveLabelChipColors({ textColor: null })).toEqual({});
  });

  it("normalizes partial input before resolving", () => {
    const style = resolveLabelChipColors({ textColor: "#FFF", bgColor: "" });
    expect(style).toEqual({ backgroundColor: "#000000", color: "#ffffff" });
  });
});

describe("hasCustomLabelColors", () => {
  it("is false only when no valid color is set", () => {
    expect(hasCustomLabelColors({})).toBe(false);
    expect(hasCustomLabelColors({ textColor: null })).toBe(false);
    expect(hasCustomLabelColors({ textColor: "invalid" })).toBe(false);
    expect(hasCustomLabelColors({ bgColor: "#fff" })).toBe(true);
    expect(hasCustomLabelColors({ textColor: "#000000" })).toBe(true);
  });
});
