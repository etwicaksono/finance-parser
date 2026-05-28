import { describe, it, expect } from "vitest";
import { parseChat } from "./chat-parser";

describe("parseChat", () => {
  it("parses multiline WhatsApp chat correctly", () => {
    const chat = `
[16/05/2026, 11:38] Budi: Semangka 20k
[16/05/2026, 11:39] Budi: Makan siang 50rb
[16/05/2026, 12:00] Andi: Kopi 15k
    `.trim();

    const result = parseChat(chat, 2026);
    expect(result.transactions).toHaveLength(3);
    
    expect(result.transactions[0]).toEqual({
      item: "Semangka",
      amount: -20000,
      date: "2026-05-16",
      sender: "Budi",
    });

    expect(result.transactions[1]).toEqual({
      item: "Makan siang",
      amount: -50000,
      date: "2026-05-16",
      sender: "Budi",
    });

    expect(result.transactions[2]).toEqual({
      item: "Kopi",
      amount: -15000,
      date: "2026-05-16",
      sender: "Andi",
    });
  });

  it("maintains sender and date for multiline messages without timestamps", () => {
    const chat = `
[16/05/2026, 11:38] Siti: Belanja pasar:
Ayam 30k
Sayur 10.000
Bawang 5k
    `.trim();

    const result = parseChat(chat, 2026);
    expect(result.transactions).toHaveLength(3);

    expect(result.transactions[0]).toEqual({
      item: "Ayam",
      amount: -30000,
      date: "2026-05-16",
      sender: "Siti",
    });

    expect(result.transactions[1]).toEqual({
      item: "Sayur",
      amount: -10000,
      date: "2026-05-16",
      sender: "Siti",
    });

    expect(result.transactions[2]).toEqual({
      item: "Bawang",
      amount: -5000,
      date: "2026-05-16",
      sender: "Siti",
    });
  });

  it("handles explicit date overrides", () => {
    const chat = `
[16/05/2026, 11:38] Budi: Pengeluaran kemarin 15/05/2026
Semangka 20k
Parkir 2k
    `.trim();

    const result = parseChat(chat, 2026);
    expect(result.transactions).toHaveLength(2);

    expect(result.transactions[0]).toEqual({
      item: "Semangka",
      amount: -20000,
      date: "2026-05-15", // Overridden date
      sender: "Budi",
    });

    expect(result.transactions[1]).toEqual({
      item: "Parkir",
      amount: -2000,
      date: "2026-05-15", // Overridden date persists
      sender: "Budi",
    });
  });

  it("ignores non-transaction lines", () => {
    const chat = `
[16/05/2026, 11:38] Budi: Halo semua
Ini rekap pengeluaran ya
Semangka 20k
Makasih
    `.trim();

    const result = parseChat(chat, 2026);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]?.item).toBe("Semangka");
  });

  it("handles empty or invalid inputs", () => {
    expect(parseChat("").transactions).toHaveLength(0);
    expect(parseChat("   ").transactions).toHaveLength(0);
  });

  describe("Bug Fixes", () => {
    it("should skip parsing a line as transaction if it is exclusively an explicit date", () => {
      const input = `[5/16, 11:38] Eko: Kamis, 14-05-2026
Semangka -> 2k`;
      const result = parseChat(input, 2026);
      
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]).toEqual({
        date: "2026-05-14",
        item: "Semangka",
        amount: -2000,
        sender: "Eko",
      });
    });
  });

  describe("Comprehensive Scenarios", () => {
    it("handles iOS style exports", () => {
      const chat = `
[16/05/2026 11:38:00] Budi: Makan siang 50rb
[17/05/2026 12:00:15] Andi: Kopi 15k
      `.trim();
      const result = parseChat(chat, 2026);
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0]?.date).toBe("2026-05-16");
      expect(result.transactions[1]?.date).toBe("2026-05-17");
    });

    it("handles positive values (income/transfers)", () => {
      const chat = `
[16/05/2026, 11:38] Bos: Gaji bulanan +5000k
[16/05/2026, 11:39] Bos: Uang lembur +500.000
      `.trim();
      const result = parseChat(chat, 2026);
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0]?.amount).toBe(5000000);
      expect(result.transactions[1]?.amount).toBe(500000);
    });

    it("handles decimals and different number formats", () => {
      const chat = `
[16/05/2026, 11:38] Eko: Bensin 20.5k
[16/05/2026, 11:39] Eko: Parkir 2,5rb
      `.trim();
      const result = parseChat(chat, 2026);
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0]?.amount).toBe(-20500);
      expect(result.transactions[1]?.amount).toBe(-2500);
    });

    it("handles chat with mixed conversational text and transactions", () => {
      const chat = `
[16/05/2026, 11:38] Eko: Halo semua
[16/05/2026, 11:38] Eko: Ini laporan hari ini
[16/05/2026, 11:39] Eko: Beli Galon 20k
[16/05/2026, 11:39] Eko: Token listrik 50.000
[16/05/2026, 11:40] Eko: Udah ya makasih!
      `.trim();
      const result = parseChat(chat, 2026);
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0]?.item).toBe("Beli Galon");
      expect(result.transactions[1]?.item).toBe("Token listrik");
    });
  });
});

