import type { ImgHTMLAttributes } from "react";
import type { Theme } from "@/lib/theme";

// A one-pixel transparent GIF, for the source that stands in when scripting is off (see below).
const BLANK =
  "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "className" | "alt"> & {
  /** The theme this picture is made for. CSS shows the one that matches <html data-theme>. */
  theme: Theme;
  /** Which picture this is, so themeStills.ts can pair the mono and violet versions. */
  kind: "hero" | "exploded" | "poster";
  className: string;
  alt: string;
};

/**
 * One still of the robot for one theme. The page carries a pair of these (mono and violet), and
 * CSS leaves the one that does not match <html data-theme> at display: none. A hidden image with
 * loading="lazy" is never requested, so a visit downloads one picture of the pair. Browsers
 * ignore loading="lazy" when scripting is off, though, and would fetch both. Nothing sets
 * data-theme without script, so the violet one can never show there; its picture wrapper says
 * so with a source that only applies when scripting is off and that points at nothing. The
 * wrapper is display: contents (robopet.css), so it takes no part in the layout. The data
 * attributes pair the stills for themeStills.ts.
 */
export function ThemeStill({ theme, kind, className, alt, ...image }: Props) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- static stand-in for a 3D model or film
    <img className={className} alt={alt} data-still-theme={theme} data-still-kind={kind} {...image} />
  );
  if (theme === "mono") return img;
  return (
    <picture>
      <source media="(scripting: none)" srcSet={BLANK} />
      {img}
    </picture>
  );
}
