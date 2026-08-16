import { describe, it, expect } from "vitest";
import { parseAmount } from "./amount-parser";

describe("parseAmount", () => {
  describe("default expense behavior (negative amounts)", () => {
    it("parses simple numbers", () => {
      expect(parseAmount("2000")).toBe(-2000);
      expect(parseAmount("500")).toBe(-500);
    });

    it("parses amounts with K multiplier", () => {
      expect(parseAmount("2k")).toBe(-2000);
      expect(parseAmount("2.5k")).toBe(-2500);
      expect(parseAmount("2,5k")).toBe(-2500);
      expect(parseAmount("50K")).toBe(-50000);
    });

    it("keeps multi-decimal k values exact (no float drift)", () => {
      expect(parseAmount("226.44k")).toBe(-226440);
      expect(parseAmount("1.032k")).toBe(-1032);
      expect(parseAmount("8.29k")).toBe(-8290);
      expect(parseAmount("1.005k")).toBe(-1005);
    });

    it("parses amounts with RB (ribu) multiplier", () => {
      expect(parseAmount("2rb")).toBe(-2000);
      expect(parseAmount("2,5rb")).toBe(-2500);
      expect(parseAmount("10ribu")).toBe(-10000);
    });

    it("parses amounts with M/JT (juta) multiplier", () => {
      expect(parseAmount("2m")).toBe(-2000000);
      expect(parseAmount("2.5jt")).toBe(-2500000);
      expect(parseAmount("1juta")).toBe(-1000000);
    });

    it("parses Indonesian thousand separators", () => {
      expect(parseAmount("2.000")).toBe(-2000);
      expect(parseAmount("5.000.000")).toBe(-5000000);
    });

    it("parses currency prefixes", () => {
      expect(parseAmount("Rp5.000")).toBe(-5000);
      expect(parseAmount("Rp. 50.000")).toBe(-50000);
      expect(parseAmount("IDR 10000")).toBe(-10000);
      expect(parseAmount("idr. 20k")).toBe(-20000);
    });

    it("ignores whitespace", () => {
      expect(parseAmount(" 2 k ")).toBe(-2000);
      expect(parseAmount("Rp 5.000")).toBe(-5000);
    });
    
    it("always returns negative for expense regardless of input sign", () => {
      expect(parseAmount("-2000")).toBe(-2000);
      expect(parseAmount("-2k")).toBe(-2000);
      expect(parseAmount("+5000")).toBe(-5000); // Because it's parsed as expense
    });
  });

  describe("income behavior (positive amounts)", () => {
    it("returns positive values when isIncome is true", () => {
      expect(parseAmount("2000", true)).toBe(2000);
      expect(parseAmount("2k", true)).toBe(2000);
      expect(parseAmount("Rp5.000", true)).toBe(5000);
      expect(parseAmount("-5000", true)).toBe(5000);
    });
  });

  describe("invalid inputs", () => {
    it("returns null for empty string", () => {
      expect(parseAmount("")).toBeNull();
      expect(parseAmount("   ")).toBeNull();
    });

    it("returns null for completely invalid text", () => {
      expect(parseAmount("abc")).toBeNull();
      expect(parseAmount("hello world")).toBeNull();
    });
  });
});
