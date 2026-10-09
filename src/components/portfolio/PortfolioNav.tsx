"use client";

import { MotionExperience } from "./MotionExperience";
import { ThemeToggle } from "./ThemeToggle";
import "./interaction.css";

const links = [
  ["ftc", "FTC"],
  ["robopet", "roboPet"],
  ["cad", "CAD"],
  ["projects", "Software"],
  ["about", "About"],
  ["contact", "Contact"],
] as const;

export function PortfolioNav() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="portfolio-nav">
        <nav className="site-shell nav-inner" aria-label="Main navigation">
          <a href="#top" className="wordmark">
            Arya Vora
          </a>
          {/* The switch comes before the links so Tab follows what is on screen: on a narrow
              phone it sits beside the wordmark and the links wrap underneath, and on a wide
              screen it leads the right-hand group. */}
          <ThemeToggle />
          <div className="nav-links">
            {links.map(([id, label]) => (
              <a href={`#${id}`} key={id}>
                {label}
              </a>
            ))}
            <a href="/games">Games</a>
          </div>
        </nav>
      </header>
      <MotionExperience />
    </>
  );
}

// The same six sections as the header, plus the top, and a second theme switch. The header is
// part of the page rather than pinned over it, so past the film and the exploded view this is
// the way back to a section, or to the other theme, without a long scroll. The switch sits
// beside the navigation landmark rather than inside it, since it is a control, not a link.
export function FooterNav() {
  return (
    <div className="footer-end">
      <nav className="footer-nav" aria-label="Footer navigation">
        <ul role="list">
          {links.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`}>{label}</a>
            </li>
          ))}
          <li>
            <a href="#top">Top</a>
          </li>
        </ul>
      </nav>
      <ThemeToggle />
    </div>
  );
}
