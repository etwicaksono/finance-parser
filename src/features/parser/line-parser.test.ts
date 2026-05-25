import { describe, it, expect } from "vitest";
import { parseLine } from "./line-parser";

describe("parseLine", () => {
  it("parses item and amount separated by space", () => {
    expect(parseLine("Semangka 2k")).toEqual({
      item: "Semangka",
      amount: -2000,
    });
    expect(parseLine("Nasi padang 25rb")).toEqual({
      item: "Nasi padang",
      amount: -25000,
    });
  });

  it("parses item and amount with separators", () => {
    expect(parseLine("Semangka = 2k")).toEqual({
      item: "Semangka",
      amount: -2000,
    });
    expect(parseLine("Bensin => 150.000")).toEqual({
      item: "Bensin",
      amount: -150000,
    });
    expect(parseLine("Listrik - Rp 500.000")).toEqual({
      item: "Listrik",
      amount: -500000,
    });
    expect(parseLine("Snack : 10k")).toEqual({
      item: "Snack",
      amount: -10000,
    });
  });

  it("handles numbers inside the item name", () => {
    expect(parseLine("Makan 2 porsi 50k")).toEqual({
      item: "Makan 2 porsi",
      amount: -50000,
    });
    expect(parseLine("Susu formula 123 100.000")).toEqual({
      item: "Susu formula 123",
      amount: -100000,
    });
  });

  it("handles complex item names and messy spaces", () => {
    expect(parseLine("  GoFood (McDonalds)  =>   Rp150k  ")).toEqual({
      item: "GoFood (McDonalds)",
      amount: -150000,
    });
  });

  it("returns null for invalid or empty lines", () => {
    expect(parseLine("")).toBeNull();
    expect(parseLine("   ")).toBeNull();
    expect(parseLine("Just a normal text message without amount")).toBeNull();
  });
});
