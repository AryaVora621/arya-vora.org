import type { Metadata, Viewport } from "next";
import { Fragment_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";
import "./portfolio.css";

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
    default: "Arya Vora | Robots, Software & Experiments",
    template: "%s | Arya Vora",
  },
  metadataBase,
  description: "Arya Vora (aryavora621 / frinklyy) builds robots, developer tools, and local-agent experiments. Explore the projects and interactive playground.",
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
    title: "Arya Vora | Robots, Software & Experiments",
    description: "Robots, developer tools, and local-agent experiments. Explore the work and interactive playground.",
    images: [
      {
        url: "/portfolio-og.png",
        width: 1200,
        height: 630,
        alt: "Arya Vora - Robotics Engineer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arya Vora | Robots, Software & Experiments",
    description: "Robots, developer tools, and ideas you can play with. Built in public by Arya Vora.",
    images: ["/portfolio-og.png"],
    creator: "@aryavora621",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#101210",
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
        {children}
      </body>
    </html>
  );
}