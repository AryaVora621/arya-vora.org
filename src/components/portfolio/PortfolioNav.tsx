"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { MotionExperience } from "./MotionExperience";
import { ThemeToggle } from "./ThemeToggle";

/*
  The site navigation, on the home page and on every /projects page.

  Routes (Home, Projects, roboPet) go through next/link. About and Contact are sections of the
  home page, so they stay plain links: on the home page an in-page "#about", which
  MotionExperience follows past the pinned film and exploded view; anywhere else "/#about", a
  full load of the home page, where MotionExperience holds the fragment target in place while
  the film and the exploded view grow to their scroll-driven heights. A client-side navigation
  to "/#about" would scroll before that growth and leave the section far below the window.

  Games is a separate site. Its pages carry their own header and a canonical address on
  games.arya-vora.org, so the link goes to that host instead of to /games on this one, and a
  visitor who follows it sees by the address bar that they have left the portfolio.
*/

type NavItem = {
  label: string;
  href: string;
  /** A section of the home page rather than a route of its own. */
  section?: boolean;
  /** A page on another host, which next/link would treat as a route of this site. */
  external?: boolean;
};

const NAV: readonly NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "roboPet", href: "/projects/robopet" },
  { label: "About", href: "/#about", section: true },
  { label: "Contact", href: "/#contact", section: true },
  { label: "Games", href: "https://games.arya-vora.org", external: true },
];

type Current = "page" | "true" | undefined;

// "page" for the route itself, "true" for the section a deeper route sits in (Projects, on a
// project's own page). Home sections are never current: they are places on a page, not pages.
function currentFor(item: NavItem, pathname: string): Current {
  if (item.section || item.external) return undefined;
  if (pathname === item.href) return "page";
  if (item.href !== "/" && pathname.startsWith(`${item.href}/`)) return "true";
  return undefined;
}

// Every page carries links to Home and to roboPet, and Link prefetches what it links to as it
// enters the window. What a prefetched page needs comes along as preload hints: the home page's
// own stylesheet, the stylesheet of a project's write-up. A page that does not use them never
// applies them, and Chrome warns on it that the file "was preloaded but not used". These two are
// fetched when the pointer reaches the link or a finger touches it instead, which is still ahead
// of the click. Projects, which every page shares, keeps the default.
const prefetchOnIntent = (href: string) => (href === "/" || href.startsWith("/projects/") ? false : undefined);

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const onHome = pathname === "/";
  if (item.external) {
    // Same tab, as for any link out of the nav. The title names the host: it is the link's
    // description for a screen reader and a tooltip for a pointer, and the name stays "Games".
    return (
      <a href={item.href} rel="noopener" title={`A separate site, ${new URL(item.href).host}`}>
        {item.label}
      </a>
    );
  }
  if (item.section) {
    return <a href={onHome ? item.href.slice(1) : item.href}>{item.label}</a>;
  }
  // On the home page, Home is the top of this page.
  if (item.href === "/" && onHome) {
    return (
      <a href="#top" aria-current="page">
        {item.label}
      </a>
    );
  }
  return (
    <Link href={item.href} aria-current={currentFor(item, pathname)} prefetch={prefetchOnIntent(item.href)}>
      {item.label}
    </Link>
  );
}

// ---------------------------------------------------------------------------------------------
// Smooth scrolling for in-page links only
// ---------------------------------------------------------------------------------------------

// globals.css sets scroll-behavior: smooth on <html>. Chromium applies that property to its own
// scroll restoration too, so a Back or Forward to a scrolled page, which the browser restores
// once the page is tall enough, glided there from the top in view of the visitor (up to about
// 6000px down the home page). projects.css, which loads after it, puts <html> back to instant
// scrolling, and a click on a link to a place on the same page switches smooth scrolling on
// with this class until the scroll has stopped. Next's route changes and the browser's history
// restoration never see it.
const ANCHOR_SCROLL = "is-anchor-scrolling";
const TAKEOVER = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
// How long the page may stay still before the scroll counts as over, and the longest it may take.
const SETTLE_MS = 200;
const FIRST_MOVE_MS = 400;
const LIMIT_MS = 8000;

function AnchorSmoothScroll() {
  useEffect(() => {
    const root = document.documentElement;
    let quiet = 0;
    let limit = 0;

    const end = () => {
      window.clearTimeout(quiet);
      window.clearTimeout(limit);
      window.removeEventListener("scroll", settle);
      for (const type of TAKEOVER) window.removeEventListener(type, end);
      root.classList.remove(ANCHOR_SCROLL);
    };
    function settle() {
      window.clearTimeout(quiet);
      quiet = window.setTimeout(end, SETTLE_MS);
    }
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || !link.hash) return;
      if (link.target && link.target !== "_self") return;
      if (link.origin !== window.location.origin || link.pathname !== window.location.pathname) {
        return;
      }
      end();
      // Set before the browser follows the link: this handler runs in the capture phase.
      root.classList.add(ANCHOR_SCROLL);
      quiet = window.setTimeout(end, FIRST_MOVE_MS);
      limit = window.setTimeout(end, LIMIT_MS);
      window.addEventListener("scroll", settle, { passive: true });
      for (const type of TAKEOVER) window.addEventListener(type, end, { passive: true });
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      end();
    };
  }, []);
  return null;
}

export function PortfolioNav() {
  const pathname = usePathname() ?? "/";
  const onHome = pathname === "/";
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="portfolio-nav">
        <nav className="site-shell nav-inner" aria-label="Main navigation">
          {onHome ? (
            <a href="#top" className="wordmark">
              Arya Vora
            </a>
          ) : (
            <Link href="/" className="wordmark" prefetch={false}>
              Arya Vora
            </Link>
          )}
          {/* The switch comes before the links so Tab follows what is on screen: on a narrow
              phone it sits beside the wordmark and the links wrap underneath, and on a wide
              screen it leads the right-hand group. */}
          <ThemeToggle />
          <div className="nav-links">
            {NAV.map((item) => (
              <NavLink item={item} pathname={pathname} key={item.href} />
            ))}
          </div>
        </nav>
      </header>
      <MotionExperience />
      <AnchorSmoothScroll />
    </>
  );
}

// The header links again, a way back to the top, and a second theme switch. The header is part
// of the page rather than pinned over it, so at the end of a long page (the home page's film and
// exploded view, a project's write-up) this is the way on without a long scroll. The switch
// sits beside the navigation landmark rather than inside it, since it is a control, not a link.
// On the home page, Home and Top would be the same place, so Home is left out there.
export function FooterNav() {
  const pathname = usePathname() ?? "/";
  const items = pathname === "/" ? NAV.filter((item) => item.href !== "/") : NAV;
  return (
    <div className="footer-end">
      <nav className="footer-nav" aria-label="Footer navigation">
        <ul role="list">
          {items.map((item) => (
            <li key={item.href}>
              <NavLink item={item} pathname={pathname} />
            </li>
          ))}
          <li>
            <a href="#top" className="footer-top">
              Top
            </a>
          </li>
        </ul>
      </nav>
      <ThemeToggle />
    </div>
  );
}
