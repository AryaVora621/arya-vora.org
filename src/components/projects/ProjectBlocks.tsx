import Link from "next/link";
import { Fragment, type ComponentType, type CSSProperties, type ReactNode } from "react";
import type { Block, CustomComponent, ImageRef } from "@/data/projects/types";
import { SoftwareVisual } from "./SoftwareVisual";
import { ProjectImage, isCutout } from "./ProjectCard";
import { StickyHeadings } from "./StickyHeadings";
import { keepNumbers } from "./keepNumbers";

/*
  Renders a project's write-up (Project.blocks) as an editorial page: headed text in two
  columns, pictures at three widths, galleries laid out as justified rows, specs as a
  definition list and dated timelines with the dates in mono. Styles are in
  src/app/projects.css under .projects-route .pb.

  This is a Server Component. The custom blocks are Client Components (the roboPet film and
  exploded view, the Reaper blocks) or server-rendered figures (the build log, the software
  figure), and each client one reaches the browser only on a page whose payload renders it. Every
  block, the custom ones included, is in the prerendered HTML in full: an earlier next/dynamic
  version streamed the client blocks behind a loading placeholder, which a visitor without
  JavaScript was left looking at.

  Only the software figure is imported here. The roboPet and Reaper blocks come in through the
  `custom` prop, from the pages of those two projects (src/app/projects/reaper and robopet). Two
  of them carry a CSS module (ReaperBlocks, RoboPetBuildLog), and a route loads the stylesheet of
  every component it imports whether or not a page renders it, so importing them here put both
  files on every project page and on the 404 under /projects.
*/

// Every custom block gets the project's slug and any props its block entry sets. The blocks that
// take a heading (the Reaper blocks, the build log) read it from there. The first block of a
// project that sets headerInFirstBlock also gets the page header, rendered by the page, to place
// in its own layout (Reaper's Mechanisms block sets it beside the model).
export type CustomProps = {
  slug: string;
  heading?: string;
  header?: ReactNode;
  [prop: string]: string | number | boolean | ReactNode;
};

/** Custom blocks a page supplies itself (see above), on top of the ones below. */
export type CustomBlocks = Partial<Record<CustomComponent, ComponentType<CustomProps>>>;

const CUSTOM: CustomBlocks = {
  "software-visual": SoftwareVisual,
};

// ---------------------------------------------------------------------------------------------
// Inline text: `code` and [label](href). Nothing else is parsed, so a stray character in a
// write-up is shown as written. A range, a score or a date in the plain text (2025-26, 5-5,
// 8-servo) is kept on one line (keepNumbers), which covers paragraphs, captions, spec values and
// timeline entries alike.
// ---------------------------------------------------------------------------------------------

const INLINE = /(`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function Inline({ text }: { text: string }) {
  const parts = text.split(INLINE);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part ? <Fragment key={i}>{keepNumbers(part)}</Fragment> : null;
        if (part.startsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
        const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
        if (!link) return part;
        const [, label, href] = link;
        if (href.startsWith("/") && !href.startsWith("//")) {
          return (
            <Link key={i} href={href}>
              {label}
            </Link>
          );
        }
        const external = /^https?:/.test(href);
        return (
          <a
            key={i}
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {label}
          </a>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------------------------

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="pb-heading">{children}</h2>;
}

function TextBlock({ block }: { block: Extract<Block, { kind: "text" }> }) {
  return (
    <section className="pb pb-text site-shell">
      <div className="pb-rail">{block.heading && <Heading>{block.heading}</Heading>}</div>
      <div className="pb-prose pb-reveal">
        {block.body.map((paragraph, i) => (
          <p key={i}>
            <Inline text={paragraph} />
          </p>
        ))}
      </div>
    </section>
  );
}

function Caption({ image }: { image: ImageRef }) {
  return image.caption ? (
    <figcaption className="pb-caption">
      <Inline text={image.caption} />
    </figcaption>
  ) : null;
}

const IMAGE_SIZES = {
  full: "100vw",
  wide: "(max-width: 760px) 100vw, 1320px",
  inset: "(max-width: 760px) 100vw, 60vw",
} as const;

function ImageBlock({ block }: { block: Extract<Block, { kind: "image" }> }) {
  const size = block.size ?? "wide";
  const { image } = block;
  const picture = (
    <ProjectImage image={image} sizes={IMAGE_SIZES[size]} className="pb-img" />
  );
  if (size === "full") {
    // Edge to edge, with the same slow drift as the cover. The caption stays in the shell.
    return (
      <figure
        className="pb pb-image is-full pb-reveal"
        data-cutout={isCutout(image) || undefined}
      >
        <div className="pb-bleed" data-parallax>
          <div data-parallax-inner>{picture}</div>
        </div>
        <div className="site-shell">
          <Caption image={image} />
        </div>
      </figure>
    );
  }
  return (
    <div className={`pb pb-image is-${size} site-shell`}>
      <figure className="pb-figure pb-reveal" data-cutout={isCutout(image) || undefined}>
        {picture}
        <Caption image={image} />
      </figure>
    </div>
  );
}

// A gallery is a run of justified rows: every picture in a row is the same height, and its width
// follows its own shape, so a wide render gets more of the row than a tall photo beside it. Rows
// hold two pictures, and an odd count ends on a row of three. On a phone the rows stack.
function galleryRows(items: ImageRef[]): ImageRef[][] {
  if (items.length <= 2) return [items];
  const rows: ImageRef[][] = [];
  const pairs = items.length % 2 === 0 ? items.length : items.length - 3;
  for (let i = 0; i < pairs; i += 2) rows.push(items.slice(i, i + 2));
  if (pairs < items.length) rows.push(items.slice(pairs));
  return rows;
}

function GalleryBlock({ block }: { block: Extract<Block, { kind: "gallery" }> }) {
  // A gallery of one picture is laid out like a headed text block: the heading in the rail and
  // the picture from column 5, no taller than the window, so it is drawn near its own size and
  // never stretched across the whole page.
  if (block.items.length === 1) {
    const [item] = block.items;
    return (
      <section className="pb pb-gallery is-single site-shell">
        <div className="pb-rail">{block.heading && <Heading>{block.heading}</Heading>}</div>
        <figure className="pb-figure pb-reveal" data-cutout={isCutout(item) || undefined}>
          <ProjectImage image={item} sizes={IMAGE_SIZES.inset} className="pb-img" />
          <Caption image={item} />
        </figure>
      </section>
    );
  }
  const rows = galleryRows(block.items);
  return (
    <section className="pb pb-gallery site-shell">
      {block.heading && (
        <div className="pb-gallery-head">
          <Heading>{block.heading}</Heading>
        </div>
      )}
      {rows.map((row, r) => (
        <div
          className="pb-row"
          key={r}
          style={
            {
              "--cols": row
                .map((item) => `minmax(0, ${(item.width / item.height).toFixed(4)}fr)`)
                .join(" "),
            } as CSSProperties
          }
        >
          {row.map((item) => (
            <figure
              className="pb-figure pb-reveal"
              data-cutout={isCutout(item) || undefined}
              key={item.src}
            >
              <ProjectImage
                image={item}
                sizes={`(max-width: 760px) 100vw, ${Math.round(100 / row.length)}vw`}
                className="pb-img"
              />
              <Caption image={item} />
            </figure>
          ))}
        </div>
      ))}
    </section>
  );
}

function SpecsBlock({ block }: { block: Extract<Block, { kind: "specs" }> }) {
  return (
    <section className="pb pb-specs site-shell">
      <div className="pb-rail">{block.heading && <Heading>{block.heading}</Heading>}</div>
      <dl className="pb-spec-list">
        {block.rows.map((row) => (
          <div className="pb-spec pb-reveal" key={row.label}>
            <dt>{row.label}</dt>
            <dd>
              <Inline text={row.value} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// A date that is a real calendar value (2026, 2026-04, 2026-04-18) goes in a <time>; anything
// looser ("Spring 2026") is shown as written.
const MACHINE_DATE = /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/;

function TimelineBlock({ block }: { block: Extract<Block, { kind: "timeline" }> }) {
  return (
    <section className="pb pb-timeline site-shell">
      <div className="pb-rail">{block.heading && <Heading>{block.heading}</Heading>}</div>
      <ol className="pb-timeline-list">
        {block.items.map((item, i) => (
          <li className="pb-reveal" key={`${item.date}-${i}`}>
            {MACHINE_DATE.test(item.date) ? (
              <time className="mono" dateTime={item.date}>
                {item.date}
              </time>
            ) : (
              <span className="mono">{item.date}</span>
            )}
            <p>
              <Inline text={item.text} />
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CustomBlock({
  block,
  slug,
  custom,
  header,
  after,
}: {
  block: Extract<Block, { kind: "custom" }>;
  slug: string;
  custom?: CustomBlocks;
  header?: ReactNode;
  /** Shown straight after the block, inside its wrapper (see ProjectBlocks' `afterFirst`). */
  after?: ReactNode;
}) {
  const Component = custom?.[block.component] ?? CUSTOM[block.component];
  if (!Component) return null;
  const element = (
    <Component slug={slug} {...block.props} {...(header ? { header } : {})} />
  );
  // The software figure is a bare <figure>, so it takes the page measure here and lines up with
  // the text column, as an inset picture does.
  if (block.component === "software-visual") {
    return (
      <div className="pb pb-custom pb-visual site-shell" data-component={block.component}>
        <div className="pb-visual-inner pb-reveal">{element}</div>
      </div>
    );
  }
  // Every other custom block is a whole section with its own shell (the film and the exploded
  // view run edge to edge), so the wrapper adds only the spacing between blocks.
  return (
    <div className="pb pb-custom pb-section" data-component={block.component}>
      {element}
      {after}
    </div>
  );
}

export function ProjectBlocks({
  blocks,
  slug,
  custom,
  header,
  afterFirst,
}: {
  blocks: readonly Block[];
  slug: string;
  custom?: CustomBlocks;
  /** The page header, for a first block that draws it (Project.headerInFirstBlock). */
  header?: ReactNode;
  /**
   * Shown straight after the first block when that block is a custom section, inside the block's
   * own wrapper so the count and the spacing of the blocks stay as they are: roboPet's meta row,
   * which a phone shows under the film instead of above it (project-view.tsx).
   */
  afterFirst?: ReactNode;
}) {
  return (
    // data-head: the first block opens with the page header, so the flow adds no space above it.
    <div className="pb-flow" data-head={header ? "" : undefined}>
      <StickyHeadings />
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "text":
            return <TextBlock block={block} key={i} />;
          case "image":
            return <ImageBlock block={block} key={i} />;
          case "gallery":
            return <GalleryBlock block={block} key={i} />;
          case "specs":
            return <SpecsBlock block={block} key={i} />;
          case "timeline":
            return <TimelineBlock block={block} key={i} />;
          case "custom":
            return (
              <CustomBlock
                block={block}
                slug={slug}
                custom={custom}
                header={i === 0 ? header : undefined}
                after={i === 0 ? afterFirst : undefined}
                key={i}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
