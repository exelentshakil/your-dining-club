import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Your Dining Club — Buy 4 items, the 5th is free",
    template: "%s · Your Dining Club",
  },
  description:
    "$19.95 a month. Buy 2 drinks, 1 appetizer and 1 entrée at hundreds of restaurants and the 5th menu item is free. No contracts, unlimited use, cancel anytime.",
  openGraph: {
    title: "Your Dining Club — Save $500–$1,000+ every month dining out",
    description:
      "One membership. Buy 2 drinks, 1 appetizer, 1 entrée — get a 5th item free. $19.95/month, cancel anytime.",
    type: "website",
  },
  icons: { icon: "/brand/logo.png", apple: "/brand/logo.png" },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect first so the font handshake overlaps HTML parsing. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
