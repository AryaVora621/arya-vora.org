import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/portfolio/ThemeToggle";
import { indexMetadata } from "./meta";
import "../games.css";

export const metadata: Metadata = {
  title: {
    default: "Games",
    template: "%s | Arya Vora Games",
  },
  ...indexMetadata,
};

// The header is the main site's nav (the portfolio-nav, nav-inner, wordmark and nav-links rules
// in portfolio.css), so the two sites read as one: the same wordmark, the same theme switch in
// the same place, and one link where the main site has its section links.
export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="games">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="portfolio-nav">
        <nav className="site-shell nav-inner" aria-label="Games navigation">
          <Link href="/games" className="wordmark">
            Arya Vora <span className="games-nav-label">Games</span>
          </Link>
          {/* The saved theme lives in localStorage, which is per origin. /games on the www site
              reads the choice made there; games.arya-vora.org is a different origin that
              rewrites to these same pages, so it starts in B&W and keeps its own choice. */}
          <ThemeToggle />
          <ul className="nav-links">
            <li>
              <a href="https://www.arya-vora.org">Back to arya-vora.org</a>
            </li>
          </ul>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1} className="site-shell games-main">
        {children}
      </main>
      <footer className="site-shell games-footer">
        Stats are regular-season figures. Scores stay in this browser only.
      </footer>
    </div>
  );
}
