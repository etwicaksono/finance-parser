import { describe, it, expect } from "vitest";
import { extractChatDate, extractExplicitDate } from "./date-parser";

describe("extractChatDate", () => {
  const currentYear = new Date().getFullYear();

  it("parses WhatsApp M/D format", () => {
    // English US format
    expect(extractChatDate("[5/16, 11:38] Name: ...", 2026)).toBe("2026-05-16");
    expect(extractChatDate("[12/31, 23:59] Name: ...", 2026)).toBe("2026-12-31");
  });

  it("parses WhatsApp D/M format", () => {
    // Indonesian format
    expect(extractChatDate("[16/5, 11:38] Name: ...", 2026)).toBe("2026-05-16");
    expect(extractChatDate("[31/12, 23:59] Name: ...", 2026)).toBe("2026-12-31");
  });

  it("defaults to D/M for ambiguous dates", () => {
    // 5 June
    expect(extractChatDate("[5/6, 11:38] Name: ...", 2026)).toBe("2026-06-05");
  });

  it("parses full date formats DD/MM/YYYY and DD/MM/YY", () => {
    expect(extractChatDate("[16/05/2026, 11:38] Name: ...")).toBe("2026-05-16");
    expect(extractChatDate("[16/05/26, 11:38:00] Name: ...")).toBe("2026-05-16");
    expect(extractChatDate("[05/16/2026, 11:38] Name: ...")).toBe("2026-05-16"); // M/D/YYYY
  });

  it("returns null for lines without chat timestamps", () => {
    expect(extractChatDate("Semangka 20k")).toBeNull();
    expect(extractChatDate("Just a normal text message")).toBeNull();
  });
});

describe("extractExplicitDate", () => {
  it("extracts explicit numeric dates", () => {
    expect(extractExplicitDate("Pengeluaran kemarin 14/05/2026 Semangka 20k")).toBe("2026-05-14");
    expect(extractExplicitDate("Bayar hutang 14-05-2026")).toBe("2026-05-14");
    expect(extractExplicitDate("Tgl 14.05.2026 ya")).toBe("2026-05-14");
    expect(extractExplicitDate("Tgl 14/05/26 ya")).toBe("2026-05-14");
  });

  it("extracts textual dates", () => {
    expect(extractExplicitDate("Kamis, 14 Mei 2026")).toBe("2026-05-14");
    expect(extractExplicitDate("Kamis, 14 May 2026")).toBe("2026-05-14");
    expect(extractExplicitDate("Beli buah tgl 5 Jun 2026")).toBe("2026-06-05");
    expect(extractExplicitDate("1 Agustus 2026")).toBe("2026-08-01");
  });

  it("defaults to current year if year is omitted in textual dates", () => {
    expect(extractExplicitDate("Kamis, 14 Mei", 2026)).toBe("2026-05-14");
  });

  it("returns null if no explicit date is found", () => {
    expect(extractExplicitDate("Semangka 20k")).toBeNull();
    expect(extractExplicitDate("Just a message without date")).toBeNull();
  });
});
