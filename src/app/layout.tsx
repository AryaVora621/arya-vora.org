import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";
import "./portfolio.css";
import "./robopet.css";
import "./projects.css";
import "./ftc.css";
import "./cad.css";

const metadataBase = new URL("https://www.arya-vora.org");

// One family for text and display. The variable axis runs 200 to 800, so headlines
// can sit at 800 while body copy stays at 400.
// Next has no fallback metrics for either Atkinson face, so the size-matched
// "Atkinson Fallback" faces in globals.css stand in while the files load.
const sans = Atkinson_Hyperlegible_Next({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Atkinson Fallback", "system-ui", "sans-serif"],
});

// Mono is kept for measurements, part numbers, dates and code.
const mono = Atkinson_Hyperlegible_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Atkinson Mono Fallback", "ui-monospace", "monospace"],
});

const description =
  "Arya Vora is in the class of 2028 at John P. Stevens High School in Edison, NJ. He captains FTC team 23786 MakEMinds and is building roboPet, a four-legged robot.";

export const metadata: Metadata = {
  title: {
    default: "Arya Vora",
    template: "%s | Arya Vora",
  },
  metadataBase,
  description,
  authors: [{ name: "Arya Vora", url: "https://github.com/AryaVora621" }],
  // One address for the page, so the www and bare-domain variants do not split link previews
  // and search results. "/" resolves against metadataBase.
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.arya-vora.org",
    siteName: "Arya Vora",
    title: "Arya Vora",
    description,
    images: [
      {
        url: "/portfolio-og.png",
        width: 1200,
        height: 630,
        alt: "Arya Vora, captain of FTC team 23786, MakEMinds, next to a photo of Reaper, the team's 2025-26 robot.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arya Vora",
    description,
    images: ["/portfolio-og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
