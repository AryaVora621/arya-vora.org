import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/portfolio/ThemeToggle";
import "../games.css";

export const metadata: Metadata = {
  title: {
    default: "Games",
    template: "%s | Arya Vora Games",
  },
  description:
    "Small browser games by Arya Vora: NBA stat trivia, career-points higher/lower, and a free-throw timing arcade.",
  alternates: { canonical: "https://games.arya-vora.org" },
  openGraph: {
    url: "https://games.arya-vora.org",
    title: "Games | Arya Vora",
    description: "NBA stat trivia and arcade mini-games you can play in the browser.",
  },
};

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="games">
      <header className="games-nav">
        <div className="games-shell games-nav-inner">
          <Link href="/games" className="wordmark">
            av<span aria-hidden="true">*</span>
            <span className="games-nav-label">games</span>
          </Link>
          {/* The saved theme lives in localStorage, which is per origin. /games on the www site
              reads the choice made there; games.arya-vora.org is a different origin that
              rewrites to these same pages, so it starts in B&W and keeps its own choice. */}
          <ThemeToggle />
          <a className="text-link games-home" href="https://www.arya-vora.org">
            arya-vora.org ↗
          </a>
        </div>
      </header>
      <main id="main-content" className="games-shell games-main">
        {children}
      </main>
      <footer className="games-shell games-footer micro">
        Stats are regular-season figures. Scores stay in this browser only.
      </footer>
    </div>
  );
}
