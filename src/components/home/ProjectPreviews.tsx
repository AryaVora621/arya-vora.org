import Link from "next/link";
import { PROJECTS } from "@/data/projects";
import { coverCrop } from "@/components/projects/coverCrops";
import { HomeProjectCard, type HomeCardSpan } from "./HomeProjectCard";
import { PreviewDrift } from "./PreviewDrift";

/*
  A preview of every project that is not featured above it on the home page, each one a card
  that opens its page under /projects. Reaper and roboPet are left out because the home page
  already gives them their own sections.

  The cards fill rows of two and three, wide and narrow in turn, so the section stays short
  (about two and a half screens for ten) and the rows do not repeat one width. Within a row each
  card sits one step lower than the one before it, and on scroll each one drifts by its own
  small amount (PreviewDrift), which reads as depth. Where a card sits is in home.css, from the data-span and
  data-pos set here.

  On a phone (600 px and under) the renders stay two to a row, and a software card (a cover that
  is cropped, data-cropped) takes a row of its own: a window of UI at half of a phone's width
  came out with its text 4 to 5 px tall, so it read as texture. At the full width its crop is
  zoomed until the text is about 10 px.
*/

const FEATURED = new Set(["reaper", "robopet"]);

// How many cards each row holds, in order; the pattern starts again after the last entry.
const ROWS = [2, 3] as const;

// How far a card drifts while it crosses the screen, in px each way, by its place in the row.
const DRIFT = [10, 18, 12] as const;

type Placed = { slug: string; span: HomeCardSpan; pos: number; drift: number };

function place(slugs: string[]): Placed[] {
  const placed: Placed[] = [];
  let row = 0;
  for (let i = 0; i < slugs.length; row += 1) {
    const count = Math.min(ROWS[row % ROWS.length], slugs.length - i);
    for (let pos = 0; pos < count; pos += 1, i += 1) {
      placed.push({
        slug: slugs[i],
        // A row of three is narrow cards; anything else, a pair or a card left on its own, is wide.
        span: count === 3 ? 4 : 6,
        pos,
        drift: DRIFT[(i + row) % DRIFT.length],
      });
    }
  }
  return placed;
}

export function ProjectPreviews() {
  const projects = PROJECTS.filter((project) => !FEATURED.has(project.slug));
  const placed = place(projects.map((project) => project.slug));

  return (
    <section
      id="projects"
      tabIndex={-1}
      className="home-projects"
      aria-labelledby="projects-title"
    >
      <div className="home-projects-shell site-shell">
        <div className="home-projects-head">
          <h2 id="projects-title">Projects</h2>
          <p>The rest of my hardware and software.</p>
        </div>
        <ul className="home-projects-grid" role="list">
          {projects.map((project, index) => (
            <li
              key={project.slug}
              className="home-projects-item"
              data-span={placed[index].span}
              data-pos={placed[index].pos}
              data-drift={placed[index].drift}
              data-cropped={coverCrop(project.slug) ? "" : undefined}
            >
              <HomeProjectCard project={project} span={placed[index].span} />
            </li>
          ))}
        </ul>
        <div className="home-projects-foot">
          <Link className="home-more" href="/projects">
            All {PROJECTS.length} projects
          </Link>
        </div>
      </div>
      <PreviewDrift />
    </section>
  );
}
