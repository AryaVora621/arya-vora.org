import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";
import "./styles/header.css";
import "./styles/intro.css";
import "./styles/robopet.css";
import "./styles/film.css";
import "./styles/projects.css";
import "./styles/pathfinding.css";
import "./styles/about.css";
import "./styles/contact.css";
import "./styles/footer.css";

// Static weights keep the type system to 400, 700 and 800; there is no 500 or 600 to reach for.
const sans = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

// Mono is reserved for measurements, part numbers, code and computed counts.
const mono = Atkinson_Hyperlegible_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

const description =
  "Arya Vora is in the class of 2028 at John P. Stevens High School in Edison, NJ. This site documents roboPet, the four-legged robot he is building, and his other projects.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.arya-vora.org"),
  title: "Arya Vora",
  description,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.arya-vora.org",
    siteName: "Arya Vora",
    title: "Arya Vora",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Arya Vora",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
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
