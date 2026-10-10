"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type FocusEvent } from "react";
import type { ProjectCategory } from "@/data/projects/types";

export type ProjectTab = {
  slug: string;
  tab: string;
  category: ProjectCategory;
  /** The page has a stylesheet of its own (see own-routes.ts), so it is not prefetched on sight. */
  own?: boolean;
};

/*
  The sub-tabs under the site nav on every /projects page: the index, then one tab per project
  in the order of PROJECTS. A thin rule marks where one category ends and the next begins. The
  layout passes only the labels, so the project write-ups never reach the client bundle.

  On a phone the strip is part of the page, like the nav above it; from a tablet up it is pinned
  to the top of the window and steps out of the way on a scroll down (see the effect below and
  projects.css). Where the shell is wide enough every tab
  is on screen at once (projects.css closes the gaps down to a floor to get there). Narrower
  than that it scrolls sideways: by touch on a phone, and on a desktop by two small buttons at
  the edges, one on each side that has more tabs past it. The current tab is scrolled into the
  strip on each navigation, and the edges fade only on a side that has more tabs past it.
*/
// Width of the fade at a scrolled edge of the strip (the mask in projects.css), and the extra
// width the edge button takes where there is a mouse.
const EDGE_FADE = 56;
const EDGE_BUTTON = 36;
// The page must be this far down before the strip may leave; then it leaves after SCROLL_DOWN px
// of scrolling down and returns after SCROLL_UP px of scrolling up.
const HIDE_AFTER = 160;
const SCROLL_DOWN = 24;
const SCROLL_UP = 8;

export function ProjectTabs({ tabs }: { tabs: readonly ProjectTab[] }) {
  const pathname = usePathname() ?? "";
  const navRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const placed = useRef(false);

  // Fades: a side fades only when there is more strip past it.
  useEffect(() => {
    const nav = navRef.current;
    const scroller = scrollerRef.current;
    if (!nav || !scroller) return;
    const update = () => {
      const max = scroller.scrollWidth - scroller.clientWidth;
      nav.toggleAttribute("data-more-start", scroller.scrollLeft > 2);
      nav.toggleAttribute("data-more-end", max - scroller.scrollLeft > 2);
    };
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    return () => {
      scroller.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  // From a tablet up the strip is pinned to the top of the window (projects.css). It steps out of
  // the way while the page scrolls down, so it never covers a pinned scene or costs a reader
  // height, and comes back on the first scroll up or when the page is near its top. data-away is
  // only a mark; the CSS does the moving, and a focus inside the strip always keeps it in view.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const wide = window.matchMedia("(min-width: 761px)");
    let last = window.scrollY;
    let travelled = 0;
    let frame = 0;
    const reset = () => {
      travelled = 0;
      last = window.scrollY;
      if (!wide.matches) nav.removeAttribute("data-away");
    };
    const measure = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - last;
      last = y;
      if (!wide.matches || y < HIDE_AFTER) {
        travelled = 0;
        nav.removeAttribute("data-away");
        return;
      }
      // A change of direction starts the count again, so a small wobble never flips the strip.
      travelled = Math.sign(delta) === Math.sign(travelled) ? travelled + delta : delta;
      if (travelled > SCROLL_DOWN) nav.setAttribute("data-away", "");
      else if (travelled < -SCROLL_UP) nav.removeAttribute("data-away");
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    wide.addEventListener("change", reset);
    return () => {
      window.removeEventListener("scroll", onScroll);
      wide.removeEventListener("change", reset);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  // A new page starts at the top with the strip in view.
  useEffect(() => {
    navRef.current?.removeAttribute("data-away");
  }, [pathname]);

  // Brings a tab clear of the edge fades and the chevron buttons by centering it in the strip. The
  // strip's own scroll moves, never the page's. Inside the faded edges counts as out of view: the
  // tab would be half hidden, or under a chevron.
  const bringIntoView = (tab: HTMLElement, calm: boolean) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    // Every tab already fits: nothing to bring into view.
    if (scroller.scrollWidth <= scroller.clientWidth + 2) return;
    const strip = scroller.getBoundingClientRect();
    const rect = tab.getBoundingClientRect();
    const edge =
      EDGE_FADE + (window.matchMedia("(hover: hover) and (pointer: fine)").matches ? EDGE_BUTTON : 0);
    if (rect.left >= strip.left + edge && rect.right <= strip.right - edge) return;
    scroller.scrollTo({
      left: scroller.scrollLeft + (rect.left - strip.left) - (strip.width - rect.width) / 2,
      behavior: calm ? "instant" : "smooth",
    });
  };

  // Keep the current tab inside the strip on each navigation.
  useEffect(() => {
    const current = scrollerRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!current) return;
    const first = !placed.current;
    placed.current = true;
    bringIntoView(current, first || window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, [pathname]);

  // A tab that takes keyboard focus (Tab, Shift+Tab) is brought clear of the fades and the
  // buttons the same way. The browser scrolls a focused link into view itself, but only as far as
  // the strip's scroll-padding (projects.css, which is as wide as the fade and the button), and
  // not at all when the link is already inside the strip but under a fade. Waiting a frame lets
  // the browser's own scroll settle first, so this measures where the tab really is. It moves
  // instantly, as the browser's does: a glide started for one tab was overtaken by the next Tab
  // press, and a key held down left the focused tab under the fade.
  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    const tab = (event.target as HTMLElement).closest<HTMLElement>("a");
    if (!tab) return;
    window.requestAnimationFrame(() => bringIntoView(tab, true));
  };

  // The buttons are for a mouse. A keyboard moves along the strip by tabbing through the links,
  // which the browser scrolls into view, and a screen reader reads the same links, so the
  // buttons stay out of both.
  const step = (direction: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollBy({
      left: direction * Math.round(scroller.clientWidth * 0.7),
      behavior: calm ? "instant" : "smooth",
    });
  };

  // Every tab is on screen at once, and a Link prefetches its page as it enters the window, so
  // thirteen tabs would fetch thirteen pages (about 300 KB) before the visitor has read one
  // line. Only the tab on either side of the current one is prefetched on sight; the rest wait
  // for a hover or a press, which is still ahead of the click. On the index there is no current
  // project, so nothing is prefetched: the first tab's page announces a stylesheet that the index
  // never applies, and Chrome warns that it "was preloaded but not used". The same goes for a
  // neighbour with a stylesheet of its own (Reaper, roboPet): the page beside it would be sent a
  // hint for a file it never applies, so those two wait for a hover or a press as well.
  const currentIndex = tabs.findIndex((tab) => pathname === `/projects/${tab.slug}`);

  return (
    <nav ref={navRef} className="ptabs" aria-label="Projects">
      <div className="site-shell ptabs-shell">
        <button
          type="button"
          className="ptabs-step is-previous"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => step(-1)}
        />
        <button
          type="button"
          className="ptabs-step is-next"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => step(1)}
        />
        <div ref={scrollerRef} className="ptabs-scroll" onFocus={onFocus}>
          <ul className="ptabs-list" role="list">
            <li>
              <Link
                href="/projects"
                className="ptab"
                aria-current={pathname === "/projects" ? "page" : undefined}
                prefetch={pathname === "/projects" ? false : undefined}
              >
                All projects
              </Link>
            </li>
            {tabs.map((tab, index) => {
              const href = `/projects/${tab.slug}`;
              const startsGroup = index === 0 || tab.category !== tabs[index - 1].category;
              return (
                <li key={tab.slug} className={startsGroup ? "is-group-start" : undefined}>
                  <Link
                    href={href}
                    className="ptab"
                    aria-current={pathname === href ? "page" : undefined}
                    prefetch={currentIndex >= 0 && Math.abs(index - currentIndex) <= 1 && !tab.own ? undefined : false}
                  >
                    {tab.tab}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
