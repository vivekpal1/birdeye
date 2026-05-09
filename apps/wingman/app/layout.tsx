import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wingman — your onchain DD co-pilot",
  description:
    "Paste any Solana token, get an AI-powered DD card in seconds. Powered by Birdeye Data + Claude.",
  metadataBase: new URL("https://wingman.app"),
  openGraph: {
    title: "Wingman — your onchain DD co-pilot",
    description: "Paste any Solana token, get an AI-powered DD card in seconds.",
    images: ["/api/og/landing"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wingman — your onchain DD co-pilot",
    description: "Paste any Solana token, get an AI-powered DD card in seconds.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="grain min-h-screen antialiased">{children}</body>
    </html>
  );
}
