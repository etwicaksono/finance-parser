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
    expect(result.transactions[0].item).toBe("Semangka");
  });

  it("handles empty or invalid inputs", () => {
    expect(parseChat("").transactions).toHaveLength(0);
    expect(parseChat("   ").transactions).toHaveLength(0);
  });
});
