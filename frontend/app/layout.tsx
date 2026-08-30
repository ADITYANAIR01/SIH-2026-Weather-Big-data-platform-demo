import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JanMausam — The People's Weather Desk",
  description:
    "India's community-sourced weather intelligence platform. Verified, corroborated, bilingual.",
  keywords: ["weather", "India", "monsoon", "disaster", "IMD", "JanMausam"],
};

export const viewport: Viewport = {
  themeColor: "#1a232e",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" className="scroll-smooth">
      <body className="min-h-screen bg-paper">{children}</body>
    </html>
  );
}