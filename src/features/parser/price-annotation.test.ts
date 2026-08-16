import { describe, it, expect } from "vitest";
import { formatPriceAnnotation, extractAnnotatedAmount } from "./price-annotation";

describe("formatPriceAnnotation", () => {
  it("keeps every significant decimal", () => {
    expect(formatPriceAnnotation(226440)).toBe("226.44k");
    expect(formatPriceAnnotation(-226440)).toBe("226.44k");
    expect(formatPriceAnnotation(1032)).toBe("1.032k");
    expect(formatPriceAnnotation(34934)).toBe("34.934k");
    expect(formatPriceAnnotation(1750)).toBe("1.75k");
  });

  it("formats round numbers without decimals", () => {
    expect(formatPriceAnnotation(25000)).toBe("25k");
    expect(formatPriceAnnotation(-8000)).toBe("8k");
    expect(formatPriceAnnotation(2000000)).toBe("2000k");
  });

  it("round-trips through the annotation reader", () => {
    for (const amount of [226440, 1032, 25500, 34934, 1750, 8000, 99999, 1234567]) {
      expect(extractAnnotatedAmount(`Item => ${formatPriceAnnotation(amount)}`)).toBe(amount);
    }
  });
});

describe("extractAnnotatedAmount", () => {
  it("reads k-shorthand and plain separators", () => {
    expect(extractAnnotatedAmount("Indihome kemloko => 226.44k")).toBe(226440);
    expect(extractAnnotatedAmount("Biaya Layanan => 1.032")).toBe(1032);
    expect(extractAnnotatedAmount("2 Desaku Marinasi => 1.750")).toBe(1750);
    expect(extractAnnotatedAmount("Gaji => 5jt")).toBe(5000000);
    expect(extractAnnotatedAmount("Snack => Rp 25rb")).toBe(25000);
  });

  it("uses the last annotation and ignores names containing k", () => {
    expect(extractAnnotatedAmount("1 Giv Body Wash (Disc 6k) => 25.650")).toBe(25650);
    expect(extractAnnotatedAmount("Kopi Kenangan => 18k")).toBe(18000);
  });

  it("returns null when there is no parsable annotation", () => {
    expect(extractAnnotatedAmount("Semangka")).toBeNull();
    expect(extractAnnotatedAmount("Semangka => ")).toBeNull();
    expect(extractAnnotatedAmount("Semangka => murah")).toBeNull();
  });
});
