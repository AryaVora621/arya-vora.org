import Link from "next/link";
import type { ImageRef, Project } from "@/data/projects/types";
import { coverCrop, phoneCropStyle } from "./coverCrops";
import { keepNumbers } from "./keepNumbers";

/*
  The preview of one project on the /projects index: its cover, its title, its one-line summary,
  and the year and status. (The home page has a shorter card of its own, HomeProjectCard, which
  shares ProjectImage and isCutout from here.) The whole card is one link to /projects/<slug>: the
  title carries it, and a stretched ::after over the card makes the picture clickable too, so a
  screen reader hears one link, named by the title.

  Styles are in src/app/projects.css under .pcard. The width comes from the grid the card sits
  in; `size` sets how tall a render is and how big the title is. The picture has no frame or
  panel: like the CAD renders on the home page it sits straight on the page, drawn whole, so a
  render is never cropped and a software cover's own black mat runs into the page.
*/

export type ProjectCardSize = "large" | "medium" | "small";

/**
 * True for a picture with a transparent background: the CAD renders, the roboPet stills and
 * the Reaper cutouts and model renders. A cutout is drawn whole with room around it; any other
 * picture (a photo, or a software cover with its own black mat) is drawn whole edge to edge.
 * The list follows the files in public/ (checked 2026-10-09: every file under /cad and the
 * roboPet stills are RGBA, as are these /ftc files).
 */
export function isCutout(image: ImageRef): boolean {
  const { src } = image;
  return (
    src.startsWith("/cad/") ||
    /^\/robopet\/.+-still/.test(src) ||
    /^\/ftc\/(?:reaper-model|reaper-cutout|iteration-|worldsrobo-cad)/.test(src)
  );
}

// Every CAD render in public/cad has a 900 px wide "-sm" copy beside it
// (scripts/prepare-cad-images.mjs), so the browser can take that one for a small frame.
function srcSetFor(image: ImageRef): string | undefined {
  const match = /^(\/cad\/.+?)\.webp$/.exec(image.src);
  if (!match || /-(?:sm|xl)$/.test(match[1]) || image.width <= 900) return undefined;
  return `${match[1]}-sm.webp 900w, ${image.src} ${image.width}w`;
}

// The robot stills that have a violet version of their own: the same render graded for the violet
// theme, with the eyes lit violet, as the home page shows them. These are swapped by theme
// instead of taking the duotone, which would turn the white shell lavender.
const VIOLET_TWINS: Record<string, string> = {
  "/robopet/hero-still.webp": "/robopet/hero-still-violet.webp",
  "/robopet/exploded-still.webp": "/robopet/exploded-still-violet.webp",
  "/ftc/reaper-model-mono.webp": "/ftc/reaper-model-violet.webp",
};

/**
 * One showcase picture. `tint` decides whether it takes the violet duotone (.theme-tint): pass
 * "always" for covers, which are tinted unless the data says `tint: false`; by default the
 * picture follows its own `tint` field. `decorative` drops the alt text where the words beside
 * the picture already say what it is (a card's title and summary).
 *
 * A still with a violet twin is drawn as the pair, and CSS (projects.css, .theme-twin-*) leaves
 * the one that does not match <html data-theme> at display: none. Both are lazy, so the hidden
 * one is never requested.
 */
export function ProjectImage({
  image,
  sizes,
  className,
  eager = false,
  decorative = false,
  tint = "field",
}: {
  image: ImageRef;
  sizes: string;
  className?: string;
  eager?: boolean;
  decorative?: boolean;
  tint?: "always" | "field";
}) {
  const alt = decorative ? "" : image.alt;
  const violet = VIOLET_TWINS[image.src];
  if (violet) {
    const twin = (theme: "mono" | "violet", src: string) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={[className, `theme-twin-${theme}`].filter(Boolean).join(" ")}
        src={src}
        width={image.width}
        height={image.height}
        alt={alt}
        loading="lazy"
        decoding="async"
      />
    );
    return (
      <>
        {twin("mono", image.src)}
        {twin("violet", violet)}
      </>
    );
  }

  const tinted = tint === "always" ? image.tint !== false : image.tint === true;
  const classes = [className, tinted ? "theme-tint" : null].filter(Boolean).join(" ");
  const srcSet = srcSetFor(image);
  const img = (
    // Plain img, as elsewhere on the site: the files are already sized WebP, and the CAD
    // renders carry a prepared small copy.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={classes || undefined}
      src={image.src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      width={image.width}
      height={image.height}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      decoding="async"
    />
  );
  if (!eager) return img;
  // React turns every <img> that is not lazy into a preload hint, and puts that hint in the
  // payload a server component sends to the browser, including the payload of a page the
  // browser only prefetches. A visitor on /projects/drone would then fetch the cover of the
  // CoreXY page next to it, and Chrome would warn that the preload was never used. React skips
  // an <img> inside <picture> (it cannot tell which source the browser will take), so the
  // eager cover is wrapped in one: its own page still finds the tag in the HTML, as the
  // preload scanner reads it, with fetchpriority="high" intact, and no other page hears of it.
  // projects.css gives <picture> display: contents, so the wrapper takes no part in layout.
  return <picture>{img}</picture>;
}

// A software cover is a window on a black mat, 1.6 times as wide as it is tall; the mat is 2.5% of
// the width on each side (80 of 3200 px). The /projects grid gives covers of that one shape equal
// cells, two to a row (slotsFor in src/app/projects/page.tsx), and from 761 px up the frame is the
// cell's width plus the mat (100% / 0.95), pulled left by the mat, so the window itself runs from
// the cell's left edge to its right: the window lines up with the title under it and with the
// grid on both sides, and the mat runs into the page. A 6-column cell is at most 644 px (the
// shell stops at 1320 px), so a 3200 px cover is never drawn larger than it is. The frame's shape
// and the pull are .pcard-media.is-shot in projects.css. Under 761 px the grid is one column and
// the cover is cropped to the one feature of the app that reads at that width (its phone box in
// coverCrops.ts), in a frame of that box's shape lined up with the title.
const SOFTWARE_FRAME_WIDTH = "w-full min-[761px]:w-[calc(100%/0.95)]";

const SIZES: Record<ProjectCardSize, string> = {
  large: "(max-width: 760px) 100vw, 60vw",
  medium: "(max-width: 760px) 100vw, 40vw",
  small: "(max-width: 760px) 100vw, 30vw",
};

export function ProjectCard({
  project,
  size = "medium",
  headingLevel = 3,
}: {
  project: Project;
  size?: ProjectCardSize;
  /** 3 under a section heading (the default); 2 where the card list has no heading above it. */
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const href = `/projects/${project.slug}`;
  const cutout = isCutout(project.cover);
  const crop = cutout ? undefined : coverCrop(project.slug);
  return (
    <article
      className={`pcard is-${size}`}
      data-cutout={cutout || undefined}
      data-cropped={crop ? "" : undefined}
    >
      {/* ScrollChoreography drifts the inner layer of a frame that clips against the page. */}
      <div
        className={cutout ? "pcard-media" : `pcard-media is-shot ${SOFTWARE_FRAME_WIDTH}`}
        style={crop ? phoneCropStyle(crop) : undefined}
        data-parallax
      >
        <div className="pcard-media-inner" data-parallax-inner>
          <ProjectImage
            image={project.cover}
            sizes={SIZES[size]}
            className="pcard-img"
            decorative
            tint="always"
          />
        </div>
      </div>
      <div className="pcard-body">
        <Heading className="pcard-title">
          {/* Not prefetched as it scrolls into view: twelve write-ups would be fetched, and their
              stylesheets announced to a page that never applies them, before the visitor has
              chosen one. The pointer or a touch fetches the one they are about to open. */}
          <Link href={href} className="pcard-link" prefetch={false}>
            {project.title}
          </Link>
        </Heading>
        <p className="pcard-summary">{keepNumbers(project.summary)}</p>
        <p className="pcard-meta">
          <span className="mono">{project.year}</span>
          <span>{project.status}</span>
        </p>
      </div>
    </article>
  );
}
