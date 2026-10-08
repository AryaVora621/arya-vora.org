"use client";

import { useEffect } from "react";

const BANNER = `
   ___
  / _ \\  Arya Vora
 / /_\\ \\ FTC 23786 Captain · FRC 2554 Board
/  _  \\ Edison, NJ
\\_/ \\_/

──────────────────────────────────────────
looking around? cool. try ↑ ↑ ↓ ↓ ← → ← → B A
source: github.com/AryaVora621
──────────────────────────────────────────
`;

/** Prints a banner + easter-egg hint once, in dev or prod. */
export function ConsoleBanner() {
  useEffect(() => {
    const w = window as unknown as { __av_banner__?: boolean };
    if (w.__av_banner__) return;
    w.__av_banner__ = true;
    console.log(
      "%c" + BANNER,
      "color: #a78bfa; font-family: ui-monospace, monospace; line-height: 1.35;"
    );
  }, []);
  return null;
}
