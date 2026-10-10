import type { ReactNode } from "react";

// The figure on each software project page, chosen by the block's `slug` prop. A software page
// can hold more than one, each under its own key (notchterm-notch, notchterm-bridge, teamstat,
// teamstat-bracket, smartinvest-company). The terminal figures are HTML so the text can be
// selected; the screenshots are WebP files that carry their own window frame (public/projects),
// so the covers on the preview cards and the figures on the pages read as one set. The classes (.work-figure,
// .work-media, .terminal, .t-line and the rest) are the ones projects.css already defines.
//
// What each figure rests on (checked 2026-10-09):
// - notchterm-bridge: real source, the AppleScript that locateTab sends to Terminal, from
//   Sources/NotchTermApp/TerminalBridge.swift at commit a721fc2 of AryaVora621/notchTerm (lines
//   95 to 114), complete and in order, with the 8 spaces of Swift string indentation removed.
//   `\(escape(keyword))` is Swift interpolation: the bridge fills it with "claude" or "codex".
// - notchterm-notch: the collapsed bar, drawn offscreen at 8 pixels per point from the
//   repository's own NotchRootView.swift (a stand-in store supplies the sessions) on a desktop
//   with the 179 x 32 pt notch of the author's MacBook Air. The session text in it is sample
//   text. The cover shows the same views open, drawn at 4 pixels per point. Both captions say
//   they are renders (this one here, the cover's in notchterm.ts). Replace both with real
//   captures when Arya has them.
// - openultracode: output of the real CLI (ouc 0.1.0, commit 6b81862 of openultracode/
//   openultracode), captured 2026-10-08 by running the commands below in a clone. `ouc plan` and
//   `--backend fake` call no model. The second line that `ouc plan` and `ouc run` print is the
//   path of the artifact, and it is left out here. The cover is different output of the same
//   build: two `ouc plan` runs in a scratch repository (see openultracode.ts).
// - shipkit: the 18 rules registered in src/lib/scanner/registry.ts at commit e0bc381 of
//   AryaVora621/shipkit, in registry order. Each severity is the one the rule object declares; a
//   rule can report findings of another severity (SEC-008 reports per package). The cover is not
//   this figure: it is ShipKit's own FindingsList on a real scan of another of Arya's
//   repositories, cropped to the issue summary and the first two findings so no repository name
//   is on it (see shipkit.ts).
// - teamstat, teamstat-bracket: captures of the deployed app at team-stat-insights.vercel.app,
//   taken 2026-10-09 after running a match and a full competition (the numbers are random per
//   run), converted to grayscale. The cover is another capture of the same app: the dashboard's
//   chart card, taken at 4x.
// - smartinvest-company: the Company Data card with its Quick Ratio Table for Apple, captured
//   2026-10-09 at 4x from a clone of AryaVora621/SmartInvest at commit 7e6f04a, run locally with no
//   keys or .env (so the numbers are Yahoo Finance's for that day), dark theme, 900 px wide window.
//   The crop is the card's header and table, framed in the same window as the other figures,
//   rendered at 2x (1708 px for 854 css px) and converted to grayscale. It is drawn no wider than
//   854 px, so a 2x screen gets at least 2 image pixels per css pixel. It replaces two crops of the
//   light-theme research-full.png (an empty AI Research form and this card), which were 1600 px
//   files drawn 869 px wide. The cover is the Emerging Markets card from another local run (see
//   smartai.ts). Tally has no figure here: its cover leads its page (see tally.ts).

type Piece = readonly [text: string, strong?: true];
type TermLine =
  | { kind: "cmd"; text: string }
  | { kind: "out"; pieces: readonly Piece[] }
  | { kind: "gap" };

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

// id, the severity the rule declares, title. null starts a new group (security, deployment,
// quality), which is how registry.ts orders them.
type Rule = readonly [id: string, severity: string, title: string];
const RULES: readonly (Rule | null)[] = [
  ["SEC-001", "critical", "Exposed Supabase Service Role Key"],
  ["SEC-002", "critical", "Hardcoded Credentials or API Keys"],
  ["SEC-003", "critical", "Missing Supabase Row Level Security (RLS)"],
  ["SEC-004", "critical", "Auth Routes Missing Server-Side Verification"],
  ["SEC-005", "warning", "Missing or Overly Permissive CORS Configuration"],
  ["SEC-006", "warning", "Unvalidated User Inputs in API Routes"],
  ["SEC-007", "warning", "Missing Rate Limiting on Auth Endpoints"],
  ["SEC-008", "critical", "Vulnerable Dependencies Detected"],
  null,
  ["DEP-001", "critical", "Missing Build Script in package.json"],
  ["DEP-002", "warning", "Missing Deployment Configuration File"],
  ["DEP-003", "critical", "Missing SPA Redirect Rules"],
  ["DEP-004", "critical", "Required Environment Variables Not Documented"],
  ["DEP-005", "critical", "Localhost Database Connection String"],
  null,
  ["QUA-001", "warning", "Missing Error Boundary Components"],
  ["QUA-002", "info", "Missing Loading States"],
  ["QUA-003", "info", "Missing Custom 404 Page"],
  ["QUA-004", "info", "Missing SEO Meta Tags"],
  ["QUA-005", "info", "console.log Statements in Production Code"],
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
            // On a phone most lines wrap. Each line hangs 4ch deeper than its own indent, twice
            // the script's 2-space step, so a wrapped row starts past its statement and also past
            // the statement nested under it, and reads as neither. On a desktop no line wraps,
            // and the hang changes nothing.
            const hang = line.length - line.trimStart().length + 4;
            return (
              <span
                className="t-line"
                key={i}
                style={{ paddingLeft: `${hang}ch`, textIndent: `-${hang}ch` }}
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

function RuleList() {
  return (
    <div className="terminal">
      <p className="terminal-bar">src/lib/scanner/registry.ts</p>
      <pre
        className="terminal-body"
        tabIndex={0}
        role="region"
        aria-label="The 18 scan rules in ShipKit, in the order they run, with each rule's severity"
      >
        <code>
          {RULES.map((rule, i) => {
            if (!rule) return <span className="t-gap" key={i} aria-hidden="true" />;
            const [id, severity, title] = rule;
            return (
              <span className="t-line t-out" key={i}>
                <b>{id}</b>
                {`  ${severity.padEnd(8)}  ${title}`}
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}

type Shot = {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: ReactNode;
  /** Cap the drawn width (css px) so the file is drawn at 2x or better. */
  maxWidth?: number;
};

const SHOTS: Readonly<Record<string, Shot>> = {
  "notchterm-notch": {
    src: "/projects/notchterm-notch.webp",
    width: 3200,
    height: 700,
    alt: "The collapsed notchTerm bar under the MacBook notch: a pill with a Claude chip and a green dot on the left of the notch and a Codex chip and a yellow dot on the right.",
    caption:
      "The collapsed bar, one chip on each side of the notch. Drawn from the same views as the cover, with sample sessions, not a screen capture.",
  },
  teamstat: {
    src: "/projects/teamstat-simulator.webp",
    width: 1600,
    height: 1396,
    alt: "The match simulator in TeamStat Insights after a run: a Red Alliance of KIROSHI and Engineerds NextGen against a Blue Alliance of Caesar Circuitry and MakEMinds, the Score Swing slider at plus or minus 20 percent, simulated scores of 273.84 and 227.35, and Red Alliance as the predicted winner.",
    caption: "The match simulator after a run.",
  },
  "teamstat-bracket": {
    src: "/projects/teamstat-bracket.webp",
    width: 1600,
    height: 1391,
    alt: "The playoff results from a full competition run in TeamStat Insights: eight alliances of two teams each, then the start of the upper and lower double-elimination brackets with the score of every game.",
    caption: "The playoffs from one full competition run.",
  },
  "smartinvest-company": {
    src: "/projects/smartinvest-company.webp",
    width: 1708,
    height: 1226,
    maxWidth: 854,
    alt: "The Company Data card in SmartInvest’s dark theme, for Apple: a search field with a Fetch button, then a Quick Ratio Table with three label and value pairs per row, covering market cap, price, the 52-week high and low, valuation ratios, margins, growth, debt, holdings, the analyst target and the recommendation.",
    caption: "The Company Data card for Apple.",
  },
};

// A screenshot that carries its own window frame, so it needs no mat of its own.
function ShotFigure({ shot }: { shot: Shot }) {
  return (
    <figure className="work-figure" style={shot.maxWidth ? { maxWidth: shot.maxWidth } : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="theme-tint"
        style={{ display: "block", width: "100%", height: "auto" }}
        src={shot.src}
        width={shot.width}
        height={shot.height}
        alt={shot.alt}
        loading="lazy"
        decoding="async"
      />
      <figcaption className="work-note">{shot.caption}</figcaption>
    </figure>
  );
}

function Mono({ children }: { children: string }) {
  return <span className="mono">{children}</span>;
}

/**
 * The figure for a software project, chosen by key: captured source or terminal output where
 * there is no screenshot, and a framed grayscale screenshot where there is one. Renders nothing
 * for a key it does not know.
 */
export function SoftwareVisual({ slug }: { slug: string }) {
  switch (slug) {
    case "notchterm-bridge":
      return (
        <figure className="work-figure">
          <div className="work-media is-terminal">
            <ScriptCapture />
          </div>
          <figcaption className="work-note">
            <Mono>locateTab</Mono>, from <Mono>TerminalBridge.swift</Mono>. The keyword is{" "}
            <Mono>claude</Mono> or <Mono>codex</Mono>.
          </figcaption>
        </figure>
      );
    case "openultracode":
      return (
        <figure className="work-figure">
          <div className="work-media is-terminal">
            <TerminalCapture />
          </div>
          <figcaption className="work-note">
            <Mono>ouc 0.1.0</Mono>, fake backend
          </figcaption>
        </figure>
      );
    case "shipkit":
      return (
        <figure className="work-figure">
          <div className="work-media is-terminal">
            <RuleList />
          </div>
          <figcaption className="work-note">
            The 18 rules in <Mono>registry.ts</Mono>, in the order they run, each with the
            severity it declares.
          </figcaption>
        </figure>
      );
    default: {
      const shot = Object.prototype.hasOwnProperty.call(SHOTS, slug) ? SHOTS[slug] : null;
      return shot ? <ShotFigure shot={shot} /> : null;
    }
  }
}
