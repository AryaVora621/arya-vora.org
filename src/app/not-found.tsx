import type { Metadata } from "next";
import Link from "next/link";
import { PortfolioNav } from "@/components/portfolio/PortfolioNav";

const description = "There is no page at this address.";

// Clears the home page's canonical and share URL, which the root layout would otherwise lend to
// every missing address. No robots field: Next adds <meta name="robots" content="noindex"> to
// any page it answers with a 404, and a second tag from here only repeated it.
export const metadata: Metadata = {
  title: "Page not found",
  description,
  alternates: { canonical: null },
  openGraph: { type: "website", siteName: "Arya Vora", title: "Page not found | Arya Vora", description },
  twitter: { card: "summary", title: "Page not found | Arya Vora", description },
};

// Renders inside the root layout, so the fonts and colors already apply.
export default function NotFound() {
  return (
    <div id="top" className="portfolio">
      <PortfolioNav />
      <main id="main-content" tabIndex={-1}>
        <div className="site-shell section-pad">
          <h1 className="text-[clamp(36px,5vw,56px)] font-extrabold leading-tight tracking-[-0.02em]">
            There is no page at this address.
          </h1>
          <p className="mt-6 text-[19px]">
            <Link href="/" className="text-link" prefetch={false}>
              Go to the home page
            </Link>{" "}
            or{" "}
            <Link href="/projects" className="text-link" prefetch={false}>
              see all projects
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
