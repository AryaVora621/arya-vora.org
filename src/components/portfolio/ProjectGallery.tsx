"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUpRight, Search } from "lucide-react";
import { selectedWork } from "@/data/portfolio";
import { github } from "@/data/github";

type Work = (typeof selectedWork)[number];

// The two projects with real visual material get full-width rows; the rest form an index.
const FEATURED_IDS: readonly string[] = ["robopet", "notchterm"];

function FeatureMedia({ work }: { work: Work }) {
  if (work.visual === "robot")
    return (
      <>
        <div className="feature-parallax feature-photo">
          <Image
            src="/robopet/exploded-still.webp"
            alt="Exploded view of the roboPet model: shell lifted off, control boards and battery pack above the chassis, four servo legs pulled out to the sides."
            width={1169}
            height={1147}
            sizes="(max-width: 760px) 100vw, 60vw"
          />
        </div>
        <p className="feature-note">Procedural model, exploded</p>
      </>
    );
  return (
    <>
      <div className="feature-parallax feature-notch" aria-hidden="true">
        <div className="notch-windows">
          {["claude", "codex"].map((label, i) => (
            <div className="notch-window" key={label}>
              <p>
                <i />
                <i />
                <i />
                {label}
              </p>
              {[72, 48, 86, 40, 64].map((w, j) => (
                <span
                  key={j}
                  className={j === (i ? 3 : 2) ? "is-live" : undefined}
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="notch-screen">
          <div className="notch-menubar">
            <span />
            <span />
            <span />
          </div>
          <div className="notch-panel">
            <div className="notch-lens" />
            <p className="notch-label">2 sessions</p>
            <div className="notch-line">
              <i />
              Claude
              <span>implementing</span>
            </div>
            <div className="notch-line">
              <i className="is-idle" />
              Codex
              <span>reviewing</span>
            </div>
            <div className="notch-ask">
              Ask your agents<span>return</span>
            </div>
          </div>
        </div>
      </div>
      <p className="feature-note">Illustration, not a screenshot</p>
    </>
  );
}

// Small, deliberately different sketches for the index. Each says one true thing
// about the project's shape rather than pretending to be a product screenshot.
function IndexGlyph({ kind }: { kind: Work["visual"] }) {
  if (kind === "agents")
    return (
      <svg viewBox="0 0 168 96" className="glyph-svg">
        <path className="g-base" d="M6 48 H162" />
        <path className="g-branch" d="M28 48 C44 48 44 18 62 18 H112 C130 18 130 48 146 48" />
        <path className="g-branch" d="M28 48 C44 48 44 33 62 33 H112 C130 33 130 48 146 48" />
        <path className="g-branch" d="M28 48 C44 48 44 78 62 78 H112 C130 78 130 48 146 48" />
        {[18, 33, 78].map((y) => (
          <g key={y}>
            <circle className="g-node" cx="76" cy={y} r="3.5" />
            <circle className="g-node" cx="98" cy={y} r="3.5" />
          </g>
        ))}
        <circle className="g-hub" cx="28" cy="48" r="4.5" />
        <circle className="g-hub" cx="146" cy="48" r="4.5" />
      </svg>
    );
  if (kind === "scouting")
    return (
      <svg viewBox="0 0 168 96" className="glyph-svg">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} className="g-tick" d={`M${8 + i * 13.5} 20 V30`} />
        ))}
        <rect className="g-seg is-auto" x="6" y="44" width="30" height="20" rx="2" />
        <rect className="g-seg" x="40" y="44" width="88" height="20" rx="2" />
        <rect className="g-seg is-end" x="132" y="44" width="30" height="20" rx="2" />
        <path className="g-base" d="M6 80 H162" />
        <path className="g-playhead" d="M96 38 V86" />
      </svg>
    );
  if (kind === "scanner")
    return (
      <div className="glyph-checklist">
        <span className="glyph-prompt">$ shipkit</span>
        {["security", "deploy", "quality"].map((label, i) => (
          <span key={label} className={i < 2 ? "is-done" : undefined}>
            <i />
            {label}
          </span>
        ))}
      </div>
    );
  // Queen and swarm: one cell among many.
  const hex = (cx: number, cy: number) => {
    const r = 13;
    return Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    }).join(" ");
  };
  const w = 13 * Math.sqrt(3);
  const cells = [
    [84, 48, "queen"],
    [84 - w, 48, ""],
    [84 + w, 48, "busy"],
    [84 - w / 2, 28.5, ""],
    [84 + w / 2, 28.5, ""],
    [84 - w / 2, 67.5, "busy"],
    [84 + w / 2, 67.5, ""],
    [84 - w * 2, 48, "faint"],
    [84 + w * 2, 48, "faint"],
    [84 + w * 1.5, 28.5, "faint"],
    [84 - w * 1.5, 67.5, "faint"],
  ] as const;
  return (
    <svg viewBox="0 0 168 96" className="glyph-svg">
      {cells.map(([cx, cy, state]) => (
        <polygon
          key={`${cx}-${cy}`}
          className={`g-hex ${state ? `is-${state}` : ""}`}
          points={hex(cx, cy)}
        />
      ))}
    </svg>
  );
}

const glyphCaption: Partial<Record<Work["visual"], string>> = {
  agents: "Isolated worktrees, one patch",
  scouting: "Auto, teleop, endgame",
  scanner: "Checklist sketch, not a scan",
  swarm: "One queen, many workers",
};

function UnderTheHood({ work }: { work: Work }) {
  return (
    <details className="work-details">
      <summary>
        Under the hood <span aria-hidden="true" />
      </summary>
      <p>{work.detail}</p>
      <a
        className="text-link"
        href={work.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        Repository <ArrowUpRight size={16} aria-hidden="true" />
      </a>
    </details>
  );
}

export function ProjectGallery() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const featured = selectedWork.filter(
    (work) => category === "All" || work.category === category,
  );
  const features = featured.filter((work) => FEATURED_IDS.includes(work.id));
  const indexed = featured.filter((work) => !FEATURED_IDS.includes(work.id));
  const repos = useMemo(
    () =>
      github.repos.filter((repo) =>
        `${repo.owner} ${repo.name} ${repo.description} ${repo.language ?? ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [query],
  );
  const visibleRepos = query || showAll ? repos : repos.slice(0, 6);
  return (
    <section
      id="projects"
      tabIndex={-1}
      className="section-pad projects-section"
    >
      <div className="site-shell">
        <div className="section-heading heading-row reveal">
          <div>
            <p className="eyebrow">01 / SELECTED WORK</p>
            <h2>
              Ideas don’t build
              <br />
              <span className="muted-text">themselves.</span>
            </h2>
          </div>
          <p>
            From things that walk to tools that ship.
            <br />A few projects worth opening up.
          </p>
        </div>
        <div
          className="filter-row"
          role="group"
          aria-label="Filter selected work"
        >
          {["All", "Robotics", "AI", "Systems"].map((item) => (
            <button
              key={item}
              aria-pressed={item === category}
              onClick={() => setCategory(item)}
            >
              {item}
              <span>
                {item === "All"
                  ? selectedWork.length
                  : selectedWork.filter((p) => p.category === item).length}
              </span>
            </button>
          ))}
        </div>
        <p className="sr-only" role="status">
          {featured.length} selected projects shown
        </p>

        {features.length > 0 && (
          <div className="work-features">
            {features.map((work) => (
              <article
                className={`project-card work-feature work-feature-${work.id}`}
                key={work.id}
              >
                <div className="project-visual work-feature-media">
                  <FeatureMedia work={work} />
                </div>
                <div className="work-feature-copy">
                  <p className="work-kicker">
                    <span>{work.number}</span>
                    {work.category}
                    <span aria-hidden="true">/</span>
                    {work.status}
                  </p>
                  <h3>
                    <a href={work.url} target="_blank" rel="noopener noreferrer">
                      {work.name}
                      <ArrowUpRight size={26} aria-hidden="true" />
                    </a>
                  </h3>
                  <p className="work-headline">{work.headline}</p>
                  <p className="work-description">{work.description}</p>
                  <p className="work-stack">
                    <span className="sr-only">Built with </span>
                    {work.stack.join("  ·  ")}
                  </p>
                  <UnderTheHood work={work} />
                </div>
              </article>
            ))}
          </div>
        )}

        {indexed.length > 0 && (
          <div className="work-index">
            <div className="work-index-head" aria-hidden="true">
              <span>No.</span>
              <span>Also on the bench</span>
              <span>Field</span>
            </div>
            <ol>
              {indexed.map((work) => (
                <li
                  className={`project-card work-row work-row-${work.visual}`}
                  key={work.id}
                >
                  <span className="work-row-number">{work.number}</span>
                  <div className="work-row-main">
                    <h3>
                      <a
                        href={work.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {work.name}
                        <ArrowUpRight size={20} aria-hidden="true" />
                      </a>
                    </h3>
                    <p className="work-row-headline">{work.headline}</p>
                    <p className="work-row-description">{work.description}</p>
                  </div>
                  <p className="work-row-meta">
                    <span>{work.category}</span>
                    <span>{work.status}</span>
                    <span className="work-row-stack">
                      {work.stack.join(" · ")}
                    </span>
                  </p>
                  <figure className="work-glyph" aria-hidden="true">
                    <IndexGlyph kind={work.visual} />
                    <figcaption>{glyphCaption[work.visual]}</figcaption>
                  </figure>
                  <UnderTheHood work={work} />
                </li>
              ))}
            </ol>
          </div>
        )}

        <div id="open-source" className="repository-shelf reveal">
          <div className="shelf-header">
            <div>
              <p className="eyebrow">THE REST OF THE WORKBENCH</p>
              <h3>Always something in progress.</h3>
            </div>
            <a
              className="text-link"
              href={github.profile.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
          <p className="shelf-caption">
            {github.repos.length} non-fork repositories in this owned /
            collaborator snapshot · {github.fetchedAt}. Not a live feed.
          </p>
          <label className="repo-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search repositories</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a repo, language, or idea…"
            />
          </label>
          <div className="repo-results" aria-live="polite">
            Showing {visibleRepos.length} of {repos.length} matching
            repositories
          </div>
          <div className="repo-list">
            {visibleRepos.map((repo) => (
              <a
                key={`${repo.owner}/${repo.name}`}
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="repo-name">
                  {repo.owner === github.profile.login
                    ? repo.name
                    : `${repo.owner}/${repo.name}`}
                  <small>
                    {repo.description ||
                      (repo.empty
                        ? "Empty repository"
                        : "Open repository for source and documentation")}
                  </small>
                </span>
                <span className="repo-language">{repo.language ?? "—"}</span>
                <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            ))}
          </div>
          {!repos.length && (
            <p className="empty-results">
              No matches for “{query}”. Try Python, Swift, or a project name.
            </p>
          )}
          {!query && repos.length > 6 && (
            <button
              className="secondary-button shelf-toggle"
              aria-expanded={showAll}
              onClick={() => setShowAll(!showAll)}
            >
              {showAll
                ? "Show fewer repositories"
                : `Explore all ${repos.length} repositories`}
              <ArrowDown size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
