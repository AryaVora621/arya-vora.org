import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";
import "./portfolio.css";
import "./robopet.css";
import "./projects.css";
import "./ftc.css";
import "./cad.css";
import { DEFAULT_THEME, THEME_INIT_SCRIPT } from "@/lib/theme";

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
  // The inline script puts the saved theme on <html> before the first paint, so the server's
  // default attribute is expected to differ from the DOM React hydrates against.
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      className={`${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <DuotoneFilter />
        {children}
      </body>
    </html>
  );
}

// The violet theme tints showcase images (.theme-tint in portfolio.css) through this filter.
// Each pixel is reduced to its luminance and read off a five-stop ramp, so the render keeps
// its own light and dark and takes only a cast. Blacks sit on the violet surface (#07070c, so
// a render's black edge melts into the page), mids take a cool lavender tint of about 20 in
// blue over grey, and whites stop at #ece8fb instead of turning the whole part violet. The
// stops are 0, 25, 50, 75 and 100 percent luminance, written as 0 to 1 sRGB channels, and
// each keeps about the luminance it started with, so the tinted render is as bright as the
// mono one. Alpha passes through untouched, so transparent PNG and WebP renders keep their
// cutout. The SVG takes no space and is hidden from assistive tech; display: none would
// disable the filter in some browsers. The top stop is also --tint-highlight in
// portfolio.css, for the mat behind a light screenshot.
function DuotoneFilter() {
  return (
    <svg className="svg-defs" aria-hidden="true" focusable="false" width="0" height="0">
      <filter id="av-duotone-violet" colorInterpolationFilters="sRGB" x="0" y="0" width="1" height="1">
        <feColorMatrix
          type="matrix"
          values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0"
        />
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0.0275 0.2431 0.5098 0.7529 0.9255" />
          <feFuncG type="table" tableValues="0.0275 0.2353 0.4863 0.7373 0.9098" />
          <feFuncB type="table" tableValues="0.0471 0.3059 0.5961 0.8314 0.9843" />
        </feComponentTransfer>
      </filter>
    </svg>
  );
}
