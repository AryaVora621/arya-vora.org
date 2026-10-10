"use client";

import { useEffect } from "react";

/*
  The headed blocks of a write-up pin their heading in the left rail while the text beside it
  scrolls (.pb-heading in projects.css). That earns its place only when the block is taller than
  the heading has room to travel: a heading pinned beside a short block, such as a six-row spec
  list, just trails off the top of the window next to empty space, and it was also the heading
  that slid under the sub-tab strip for no gain.

  So the CSS pins every heading, which is what a visitor without script gets, and this marks the
  ones whose block is too short to need it, data-fits, which projects.css turns back into a plain
  heading. A heading needs to pin when the rail it travels in is taller than itself by at least
  FRACTION of the window, that is, when its block is more than a heading's height plus a good part
  of a screen tall. The rails are measured again whenever one changes size (a picture arriving, a
  font loading, the window resizing).

  It renders nothing and lives with the blocks, not in the layout, so it measures the page that is
  on screen: a project page mounts a new copy of it.
*/
const FRACTION = 0.4;

export function StickyHeadings() {
  useEffect(() => {
    const rails = Array.from(document.querySelectorAll<HTMLElement>(".pb-rail"));
    const mark = () => {
      for (const rail of rails) {
        const heading = rail.querySelector<HTMLElement>(".pb-heading");
        if (!heading) continue;
        const room = rail.offsetHeight - heading.offsetHeight;
        heading.toggleAttribute("data-fits", room < window.innerHeight * FRACTION);
      }
    };
    mark();
    const observer = new ResizeObserver(mark);
    rails.forEach((rail) => observer.observe(rail));
    window.addEventListener("resize", mark);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", mark);
    };
  }, []);

  return null;
}
