import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/**
 * Primary sans-serif font for UI text and headings.
 * Inter is optimized for screen readability and data-dense UIs.
 */
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Monospace font for numeric values, amounts, and code-like content.
 * JetBrains Mono provides excellent legibility for financial figures.
 */
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Smart Financial Inbox",
    template: "%s | Smart Financial Inbox",
  },
  description:
    "Smart preprocessing layer untuk mempercepat workflow pencatatan keuangan pribadi. Parse transaksi WhatsApp, review di spreadsheet, sync ke Google Sheet.",
  keywords: [
    "finance",
    "transaction",
    "parser",
    "google sheet",
    "whatsapp",
    "keuangan",
  ],
  authors: [{ name: "Smart Financial Inbox" }],
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
