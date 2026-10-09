import Image from "next/image";
import {
  featuredSoftware,
  githubUrl,
  indexedSoftware,
  type SoftwareProject,
} from "@/data/portfolio";
import { github } from "@/data/github";

// Text between backticks is code.
function Inline({ text }: { text: string }) {
  return (
    <>
      {text
        .split("`")
        .map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part))}
    </>
  );
}

function lastCommit(project: SoftwareProject): string | null {
  return (
    github.repos.find(
      (repo) => repo.name === project.repo && repo.url === project.url,
    )?.lastCommit ?? null
  );
}

function Meta({ project }: { project: SoftwareProject }) {
  const date = lastCommit(project);
  return (
    <p className="work-meta">
      <span>{project.kind}</span>
      {date && (
        <span>
          Last commit <time dateTime={date}>{date}</time>
        </span>
      )}
    </p>
  );
}

function Stack({ stack }: { stack: readonly string[] }) {
  return (
    <p className="work-stack">
      <span className="sr-only">Built with </span>
      {stack.join(", ")}
    </p>
  );
}

// ---------------------------------------------------------------------------------------
// notchTerm: there is no screenshot of the running app. It needs a notched MacBook with live
// Claude and Codex sessions, and driving Terminal by script would type into real tabs. The
// figure is therefore real source: the AppleScript that locateTab sends to Terminal, from
// Sources/NotchTermApp/TerminalBridge.swift at commit a721fc2 of AryaVora621/notchTerm (lines
// 95 to 114), complete and in order, with the 8 spaces of Swift string indentation removed.
// `\(escape(keyword))` is Swift interpolation: the bridge fills it with "claude" or "codex".
// Replace this with a real capture of the overlay once Arya has one.
// ---------------------------------------------------------------------------------------

const LOCATE_TAB_SCRIPT: readonly string[] = [
  'tell application "Terminal"',
  '  set bestTTY to ""',
  "  set bestBusy to false",
  "  set haveSelected to false",
  "  repeat with wi from 1 to (count of windows)",
  "    repeat with ti from 1 to (count of tabs of window wi)",
  '      if ((processes of tab ti of window wi) as string) contains "\\(escape(keyword))" then',
  "        set thisTTY to (tty of tab ti of window wi) as string",
  "        set thisBusy to (busy of tab ti of window wi)",
  "        set thisSel to (selected of tab ti of window wi)",
  '        if bestTTY is "" or (thisSel and not haveSelected) then',
  "          set bestTTY to thisTTY",
  "          set bestBusy to thisBusy",
  "          set haveSelected to thisSel",
  "        end if",
  "      end if",
  "    end repeat",
  "  end repeat",
  '  return bestTTY & "|" & (bestBusy as string)',
  "end tell",
];

function ScriptCapture() {
  return (
    <div className="terminal">
      <p className="terminal-bar">AppleScript</p>
      <pre
        className="terminal-body"
        tabIndex={0}
        role="region"
        aria-label="The AppleScript in notchTerm that finds the Terminal tab running claude or codex"
      >
        <code>
          {LOCATE_TAB_SCRIPT.map((line, i) => {
            // A wrapped line hangs at its own indent, so the structure stays readable on a phone.
            const indent = line.length - line.trimStart().length;
            return (
              <span
                className="t-line"
                key={i}
                style={
                  indent
                    ? { paddingLeft: `${indent}ch`, textIndent: `-${indent}ch` }
                    : undefined
                }
              >
                {line}
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// OpenUltraCode: output of the real CLI (ouc 0.1.0, commit 6b81862 of
// openultracode/openultracode), captured 2026-10-08 by running the commands below in a
// clone. `ouc plan` and `--backend fake` call no model. The second line that `ouc plan` and
// `ouc run` print is the path of the artifact, and it is left out here.
// ---------------------------------------------------------------------------------------

type Piece = readonly [text: string, strong?: true];
type TermLine =
  | { kind: "cmd"; text: string }
  | { kind: "out"; pieces: readonly Piece[] }
  | { kind: "gap" };

const TRANSCRIPT: readonly TermLine[] = [
  { kind: "cmd", text: 'ouc plan "audit this repo for TODOs"' },
  { kind: "out", pieces: [["Created dry-run plan run_20261008164539_iepy40"]] },
  { kind: "cmd", text: "ouc report run_20261008164539_iepy40 | grep task_" },
  {
    kind: "out",
    pieces: [
      ["- task_1: audit this repo for TODOs (research, "],
      ["free", true],
      [", openrouter:qwen/qwen3-coder:free)"],
    ],
  },
  { kind: "gap" },
  { kind: "cmd", text: 'ouc plan "add a --version flag and test it"' },
  { kind: "out", pieces: [["Created dry-run plan run_20261008164539_l29vkm"]] },
  { kind: "cmd", text: "ouc report run_20261008164539_l29vkm | grep task_" },
  {
    kind: "out",
    pieces: [
      ["- task_1: Implement: add a --version flag and test it (edit, "],
      ["strong", true],
      [", codex-cli:gpt-5.3-codex)"],
    ],
  },
  {
    kind: "out",
    pieces: [
      ["- task_2: Verify: add a --version flag and test it (test, "],
      ["strong", true],
      [", codex-cli:gpt-5.3-codex)"],
    ],
  },
  { kind: "gap" },
  {
    kind: "cmd",
    text: 'ouc run "add a --version flag and test it" --backend fake',
  },
  { kind: "out", pieces: [["Run run_20261008164539_jcj9pk succeeded"]] },
];

function TerminalCapture() {
  return (
    <div className="terminal">
      <p className="terminal-bar">openultracode</p>
      <pre className="terminal-body">
        <code>
          {TRANSCRIPT.map((line, i) => {
            if (line.kind === "gap")
              return <span className="t-gap" key={i} aria-hidden="true" />;
            if (line.kind === "cmd")
              return (
                <span className="t-line t-cmd" key={i}>
                  <span className="t-prompt" aria-hidden="true">
                    ${" "}
                  </span>
                  {line.text}
                </span>
              );
            return (
              <span className="t-line t-out" key={i}>
                {line.pieces.map(([text, strong], j) =>
                  strong ? <b key={j}>{text}</b> : text,
                )}
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------------------

function FeatureFigure({ project }: { project: SoftwareProject }) {
  if (project.visual === "script")
    return (
      <figure className="work-figure">
        <div className="work-media is-terminal">
          <ScriptCapture />
        </div>
        <figcaption className="work-note">
          <span className="mono">locateTab</span>, from{" "}
          <span className="mono">TerminalBridge.swift</span>. The keyword is{" "}
          <span className="mono">claude</span> or <span className="mono">codex</span>.
        </figcaption>
      </figure>
    );
  return (
    <figure className="work-figure">
      <div className="work-media is-terminal">
        <TerminalCapture />
      </div>
      <figcaption className="work-note">
        <span className="mono">ouc 0.1.0</span>, fake backend
      </figcaption>
    </figure>
  );
}

// The title is the one link to the repository. A second "Repository on GitHub" link under it
// would give two links with the same name and different destinations across the two features.
function FeatureRow({ project }: { project: SoftwareProject }) {
  return (
    <article className="project-card work-feature" id={project.id}>
      <FeatureFigure project={project} />
      <div className="work-copy">
        <Meta project={project} />
        <h3>
          <a href={project.url} target="_blank" rel="noopener noreferrer">
            {project.name}
          </a>
        </h3>
        {project.body.map((paragraph, i) => (
          <p className={i === 0 ? "work-lede" : "work-body"} key={i}>
            <Inline text={paragraph} />
          </p>
        ))}
        <Stack stack={project.stack} />
      </div>
    </article>
  );
}

// The repository screenshots are whole desktop windows, which are unreadable at the width of an
// index row. These are crops of one region each, made by scripts/prepare-project-shots.mjs. Each
// crop is cut at the edge of its content, so the mat around it is the same on all four sides.
// Sizes are the crop sizes.
type ShotCrop = {
  src: string;
  width: number;
  height: number;
  alt: string;
  /** The color of the app behind the crop, so the mat around it can match. */
  tone: "light" | "dark";
};

const SHOT_CROPS: Readonly<Record<string, ShotCrop>> = {
  smartinvest: {
    src: "/projects/smartinvest.webp",
    width: 573,
    height: 291,
    alt: "The SmartInvest Emerging Markets screener, in grayscale: Swing, Long-term and Ranked tabs above four rows, each with a ticker, a company name and sector, market-cap and risk tags.",
    tone: "light",
  },
  tally: {
    src: "/projects/tally.webp",
    width: 801,
    height: 463,
    alt: "A Tally sprint question, in grayscale: a math question about the vertex of a parabola, four answer choices and Hint and Check Answer buttons.",
    tone: "dark",
  },
};

function IndexRow({ project }: { project: SoftwareProject }) {
  const shot = project.screenshot;
  const crop = SHOT_CROPS[project.id];
  return (
    <li
      className={crop || shot ? "project-card work-row" : "project-card work-row is-text"}
      id={project.id}
    >
      <div className="work-row-name">
        <h3>
          <a href={project.url} target="_blank" rel="noopener noreferrer">
            {project.name}
          </a>
        </h3>
        <Meta project={project} />
      </div>
      <div className="work-row-text">
        {project.body.map((paragraph, i) => (
          <p className="work-body" key={i}>
            <Inline text={paragraph} />
          </p>
        ))}
        <Stack stack={project.stack} />
      </div>
      {crop ? (
        <figure className="work-row-shot">
          <div className="work-media is-shot is-crop" data-tone={crop.tone}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="theme-tint"
              src={crop.src}
              width={crop.width}
              height={crop.height}
              alt={crop.alt}
              loading="lazy"
              decoding="async"
            />
          </div>
        </figure>
      ) : (
        shot && (
          <figure className="work-row-shot">
            <div className="work-media is-shot">
              <Image
                className="theme-tint"
                src={shot.src}
                alt={shot.alt}
                width={shot.width}
                height={shot.height}
                sizes="(max-width: 760px) 100vw, 360px"
                unoptimized
              />
            </div>
            {shot.note && <figcaption className="work-note">{shot.note}</figcaption>}
          </figure>
        )
      )}
    </li>
  );
}

// OpenUltraCode leads: its figure is captured output from the real tool. notchTerm follows with
// the AppleScript at the center of its Terminal bridge.
const FEATURE_ORDER = ["openultracode", "notchterm"];
const features = [...featuredSoftware].sort(
  (a, b) => FEATURE_ORDER.indexOf(a.id) - FEATURE_ORDER.indexOf(b.id),
);

export function ProjectGallery() {
  return (
    <section
      id="projects"
      tabIndex={-1}
      className="section-pad projects-section"
    >
      <div className="site-shell">
        <div className="section-heading heading-row">
          <div>
            <h2>Software</h2>
          </div>
        </div>

        <div className="work-features">
          {features.map((project) => (
            <FeatureRow project={project} key={project.id} />
          ))}
        </div>

        <ol className="work-index" aria-label="More software">
          {indexedSoftware.map((project) => (
            <IndexRow project={project} key={project.id} />
          ))}
        </ol>

        <p className="work-all">
          <a href={githubUrl} target="_blank" rel="noopener noreferrer">
            More repositories on GitHub
          </a>
        </p>
      </div>
    </section>
  );
}
