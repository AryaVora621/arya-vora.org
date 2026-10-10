import type { ReactNode } from "react";

/*
  A line may not break inside a digit range, a score, a date or a number-word compound: "the
  2025-" at the end of one line and "26 game" on the next reads as a typo, and both WebKit and
  Blink break after a plain hyphen between digits. keepNumbers wraps each such run (2025-26, 5-0,
  5-5, 2026-07-18, 8-servo) in a span that does not wrap, and leaves the text itself as written,
  so the element's textContent is unchanged. Ordinary compounds ("full-width", "two-servo") still
  break as usual. A server-safe helper: no state, no effects. The Reaper write-up does the same
  with its own copy (src/components/ftc/reaperContent.tsx).
*/

const NUMBER_RUN = /(\d+(?:-\d+)+|\d+-[A-Za-z]+)/;

/** `text` with every range, score, date or number-word compound kept on one line. */
export function keepNumbers(text: string): ReactNode {
  const parts = text.split(NUMBER_RUN);
  if (parts.length === 1) return text;
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <span key={index} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
