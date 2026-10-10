import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { PROJECTS } from "@/data/projects";
import type { Project } from "@/data/projects/types";
import { ProjectBlocks, type CustomBlocks } from "@/components/projects/ProjectBlocks";
import { ProjectImage, isCutout } from "@/components/projects/ProjectCard";
import { coverCrop, phoneCropStyle } from "@/components/projects/coverCrops";
import { keepNumbers } from "@/components/projects/keepNumbers";
import { ScrollChoreography } from "@/components/portfolio/ScrollChoreography";
import { projectMetadata, shareDescription } from "../project-metadata";
import { OWN_ROUTE } from "./own-routes";
import { SHARE_CONTENT_TYPE, SHARE_SIZE, shareAlt, shareCardPath } from "../_share/share";

/*
  The page of one project, shared by /projects/[slug] and by the projects that have a route of
  their own (OWN_ROUTE in ./own-routes.ts). A project gets its own route when its write-up needs a
  client component that carries a stylesheet of its own: a route only loads the stylesheets of
  the components it imports, so putting that import in the one page that renders it keeps the
  other project pages, the 404 and the index from fetching CSS they never apply (Chrome warns
  that a stylesheet it was told to fetch "was preloaded but not used"). The page passes those
  components down as `custom`; ProjectBlocks has no import of them.
*/

// The card, the description and the canonical address of a project, for generateMetadata.
// The share card is a PNG drawn per project (../[slug]/card.png/route.ts), not the cover, which
// is a WebP. The description is the card summary cut to the length a search result or a link
// preview shows.
export function projectPageMetadata(project: Project): Metadata {
  return projectMetadata({
    title: project.title,
    description: shareDescription(project),
    path: `/projects/${project.slug}`,
    image: {
      src: shareCardPath(project.slug),
      alt: shareAlt(project),
      width: SHARE_SIZE.width,
      height: SHARE_SIZE.height,
      type: SHARE_CONTENT_TYPE,
    },
  });
}

// The number of letters in the title's longest word, which projects.css uses to size the title so
// that no word is ever broken across lines.
function longestWord(title: string): number {
  return Math.max(...title.split(/\s+/).map((word) => word.length));
}

function ProjectLink({ href, label }: { href: string; label: string }) {
  if (href.startsWith("/") && !href.startsWith("//")) return <Link href={href}>{label}</Link>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  );
}

// How many labelled values the meta row has: year and status always, then role, stack and links
// where the project has them. A header with four or fewer sits beside the summary on a wide window
// (.is-split in projects.css); more would run taller there than they do under it. Reaper's five sit
// in two columns beside its model instead (Project.headerInFirstBlock, ftc.css).
function metaCount(project: Project): number {
  return (
    2 +
    (project.role ? 1 : 0) +
    (project.stack && project.stack.length > 0 ? 1 : 0) +
    (project.links && project.links.length > 0 ? 1 : 0)
  );
}

// Year, status, role, stack and links, as one row of labelled values under the title. The classes
// let a phone pair them up two to a line (projects.css): role beside stack, the links on a line of
// their own.
function Meta({ project }: { project: Project }) {
  return (
    <dl className="pdetail-meta">
      <div>
        <dt>Year</dt>
        <dd className="mono">{project.year}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>{project.status}</dd>
      </div>
      {project.role && (
        <div className="is-role">
          <dt>Role</dt>
          <dd>{project.role}</dd>
        </div>
      )}
      {project.stack && project.stack.length > 0 && (
        <div className="is-stack">
          <dt>Stack</dt>
          <dd>{project.stack.join(", ")}</dd>
        </div>
      )}
      {project.links && project.links.length > 0 && (
        <div className="is-links">
          <dt>Links</dt>
          <dd>
            <ul role="list">
              {project.links.map((link) => (
                <li key={link.href}>
                  <ProjectLink href={link.href} label={link.label} />
                </li>
              ))}
            </ul>
          </dd>
        </div>
      )}
    </dl>
  );
}

// The neighbours in the order of the sub-tabs, wrapping at both ends, so the last project
// leads back to the first.
function neighbours(project: Project) {
  const index = PROJECTS.findIndex((item) => item.slug === project.slug);
  const count = PROJECTS.length;
  return {
    previous: PROJECTS[(index - 1 + count) % count],
    next: PROJECTS[(index + 1) % count],
  };
}

export function ProjectView({ project, custom }: { project: Project; custom?: CustomBlocks }) {
  const { previous, next } = neighbours(project);
  const { cover } = project;
  const inBlock = project.headerInFirstBlock === true;
  const showCover = !project.hideCoverOnPage;
  const crop = showCover ? coverCrop(project.slug) : undefined;
  // A page whose picture is its first block (roboPet's film) has no cover in the header, so on a
  // phone the meta row would stand between the summary and that picture and push it off the first
  // screen. There the header leaves the meta out under 761px and the first block repeats it after
  // itself (projects.css, .meta-after); each copy is display: none where the other shows, so a
  // screen reader meets one. Reaper draws its header beside its model and is left as it is.
  const first = project.blocks[0];
  const metaAfterFirst =
    !inBlock &&
    project.hideCoverOnPage === true &&
    first?.kind === "custom" &&
    first.component !== "software-visual";

  // The cover is part of the header, after the meta row. On a phone the header is a grid that
  // puts the cover straight under the title, then the summary and the meta (projects.css), so the
  // first screen holds the picture, not only the words about it. A software cover is cropped there
  // to the one feature that reads at that width (coverCrops.ts); a wider window shows it whole.
  const header = (
    <header
      className={[
        "pdetail-head",
        inBlock ? null : "site-shell",
        !inBlock && metaCount(project) <= 4 ? "is-split" : null,
        showCover ? "has-cover" : null,
        metaAfterFirst ? "meta-after" : null,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <h1 id="project-title" style={{ "--title-chars": longestWord(project.title) } as CSSProperties}>
        {project.title}
      </h1>
      <p className="pdetail-summary">{keepNumbers(project.summary)}</p>
      <Meta project={project} />
      {showCover && (
        <figure
          className="pdetail-cover"
          data-cutout={isCutout(cover) || undefined}
          data-cropped={crop ? "" : undefined}
        >
          {/* The frame clips; ScrollChoreography drifts the inner layer against the page, the
              same slow parallax as the pictures on the home page. A cropped cover on a phone
              drifts as a whole instead, so the crop's edges stay where they were chosen. */}
          <div
            className="pdetail-cover-frame"
            data-parallax
            style={crop ? phoneCropStyle(crop) : undefined}
          >
            <div className="pdetail-cover-inner" data-parallax-inner>
              <ProjectImage
                image={cover}
                sizes="(max-width: 760px) 100vw, 1320px"
                className="pdetail-cover-img"
                eager
                tint="always"
              />
            </div>
          </div>
          {cover.caption && (
            <figcaption className="pb-caption">{cover.caption}</figcaption>
          )}
        </figure>
      )}
    </header>
  );

  return (
    <article className="pdetail" aria-labelledby="project-title">
      <ScrollChoreography />
      {/* A project whose first block draws the header (Reaper, beside its model) gets it there. */}
      {!inBlock && header}

      <ProjectBlocks
        blocks={project.blocks}
        slug={project.slug}
        custom={custom}
        header={inBlock ? header : undefined}
        afterFirst={
          metaAfterFirst ? (
            <div className="pdetail-meta-after site-shell">
              <Meta project={project} />
            </div>
          ) : undefined
        }
      />

      <nav className="pdetail-pager site-shell" aria-label="More projects">
        {/* A project with a stylesheet of its own is not prefetched as the link scrolls into view:
            the hint for that file would reach a page that never applies it. */}
        <Link
          href={`/projects/${previous.slug}`}
          className="pager-link is-previous"
          prefetch={OWN_ROUTE.has(previous.slug) ? false : undefined}
        >
          <span className="pager-label">Previous</span>
          <span className="pager-title">{previous.title}</span>
        </Link>
        <Link
          href={`/projects/${next.slug}`}
          className="pager-link is-next"
          prefetch={OWN_ROUTE.has(next.slug) ? false : undefined}
        >
          <span className="pager-label">Next</span>
          <span className="pager-title">{next.title}</span>
        </Link>
        <Link href="/projects" className="pager-all">
          All projects
        </Link>
      </nav>
    </article>
  );
}
