"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUpRight, Check, Search, Terminal } from "lucide-react";
import { selectedWork } from "@/data/portfolio";
import { github } from "@/data/github";
import { RobotSchematic } from "./RobotSchematic";

function ProjectVisual({
  kind,
}: {
  kind: (typeof selectedWork)[number]["visual"];
}) {
  if (kind === "robot") return <RobotSchematic />;
  if (kind === "notch")
    return (
      <div className="notch-preview" aria-hidden="true">
        <div className="notch-desktop">
          <div className="notch-island">
            <div className="notch-camera" />
            <span>2 SESSIONS</span>
            <div className="notch-session">
              <i />
              Claude<span>implementing…</span>
            </div>
            <div className="notch-session">
              <i />
              Codex<span>reviewing…</span>
            </div>
            <div className="notch-prompt">
              Ask your agents <span>↵</span>
            </div>
          </div>
          <span className="preview-note">macOS / SwiftUI</span>
        </div>
      </div>
    );
  if (kind === "scouting")
    return (
      <div className="scout-preview" aria-hidden="true">
        <div className="preview-toolbar">
          23786 / MATCH INTELLIGENCE<span>ILLUSTRATIVE DATA</span>
        </div>
        <div className="scout-chart">
          {[45, 70, 55, 84, 68, 93, 76, 100].map((height, i) => (
            <div key={i}>
              <span style={{ height: `${height}%` }} />
              <small>{i + 1}</small>
            </div>
          ))}
        </div>
        <div className="scout-footer">
          <span>AUTO</span>
          <span>TELEOP</span>
          <span>ENDGAME</span>
        </div>
      </div>
    );
  if (kind === "scanner")
    return (
      <div className="scanner-preview" aria-hidden="true">
        <div className="preview-toolbar">
          <Terminal size={17} />
          shipkit / readiness report
        </div>
        {["Security", "Deployment", "Code quality"].map((label, i) => (
          <div className="scan-row" key={label}>
            <Check size={18} />
            <span>{label}</span>
            <div>
              <i style={{ width: `${88 - i * 12}%` }} />
            </div>
          </div>
        ))}
        <span className="preview-note">
          ILLUSTRATIVE REPORT / NOT A LIVE SCAN
        </span>
      </div>
    );
  return (
    <div
      className={`agents-preview ${kind === "swarm" ? "swarm-preview" : ""}`}
      aria-hidden="true"
    >
      <div className="agent-orbit orbit-a" />
      <div className="agent-orbit orbit-b" />
      <div className="agent-hub">{kind === "swarm" ? "QUEEN" : "ouc"}</div>
      {["PLAN", "BUILD", "REVIEW", "VERIFY"].map((label, i) => (
        <div className={`satellite satellite-${i}`} key={label}>
          <span>0{i + 1}</span>
          {label}
        </div>
      ))}
      <span className="preview-note">
        {kind === "swarm"
          ? "LOCAL-FIRST / AGENT SWARM"
          : "ISOLATED WORK / SHARED GOAL"}
      </span>
    </div>
  );
}

export function ProjectGallery() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const featured = selectedWork.filter(
    (work) => category === "All" || work.category === category,
  );
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
        <div className="project-grid">
          {featured.map((work) => (
            <article
              className={`project-card project-${work.visual}`}
              key={work.id}
            >
              <div className="project-visual">
                <ProjectVisual kind={work.visual} />
              </div>
              <div className="project-copy">
                <div className="project-meta micro">
                  <span>
                    {work.number} / {work.category}
                  </span>
                  <span>{work.status}</span>
                </div>
                <h3>
                  <a href={work.url} target="_blank" rel="noopener noreferrer">
                    {work.name}
                    <ArrowUpRight size={22} aria-hidden="true" />
                  </a>
                </h3>
                <p className="project-headline">{work.headline}</p>
                <p className="project-description">{work.description}</p>
                <div className="tech-tags">
                  {work.stack.map((tech) => (
                    <span key={tech}>{tech}</span>
                  ))}
                </div>
                <details>
                  <summary>
                    Under the hood <span aria-hidden="true">+</span>
                  </summary>
                  <p>{work.detail}</p>
                  <a
                    className="text-link"
                    href={work.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Explore repository{" "}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </a>
                </details>
              </div>
            </article>
          ))}
        </div>
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
