import type { Metadata, Viewport } from "next";
import { Fragment_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/effects/SmoothScroll";
import { CustomCursor } from "@/components/effects/CustomCursor";
import { MouseGlow } from "@/components/effects/MouseGlow";
import { ConsoleBanner } from "@/components/effects/ConsoleBanner";
import { KonamiTerminal } from "@/components/effects/KonamiTerminal";

export const metadataBase = new URL("https://aryavora.com");

const display = Fragment_Mono({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = Fragment_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Arya Vora | Robotics Engineer · FTC 23786 Captain · FRC 2554 Board",
    template: "%s | Arya Vora",
  },
  description: "Junior at John P. Stevens High School (Edison, NJ) leading award-winning robotics teams, building autonomous systems, and pushing the boundaries of human-robot interaction.",
  keywords: [
    "Arya Vora",
    "Robotics",
    "FTC 23786",
    "FRC 2554",
    "MakEMinds Robotics",
    "The Warhawks",
    "John P. Stevens High School",
    "Edison NJ",
    "AI Engineer",
    "Autonomous Systems",
    "Computer Vision",
    "Machine Learning",
  ],
  authors: [{ name: "Arya Vora", url: "https://github.com/aryavora621" }],
  creator: "Arya Vora",
  publisher: "Arya Vora",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://aryavora.com",
    siteName: "Arya Vora",
    title: "Arya Vora | Robotics Engineer · FTC 23786 Captain · FRC 2554 Board",
  description: "Arya Vora — FTC 23786 captain, FRC 2554 board member. Robots, autonomous systems, and software built in public from Edison, NJ.",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Arya Vora - Robotics Engineer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arya Vora | Robotics Engineer",
    description: "FTC 23786 captain, FRC 2554 board member. Robots and software built in public.",
    images: ["/og-image.svg"],
    creator: "@aryavora621",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
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
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://github.com" />
        <link rel="dns-prefetch" href="https://linkedin.com" />
      </head>
      <body className="min-h-full flex flex-col bg-ink-950 text-paper-200">
        <SmoothScroll />
        <CustomCursor />
        <MouseGlow />
        <ConsoleBanner />
        <KonamiTerminal />
        {children}
      </body>
    </html>
  );
}