// Rows for the Software section, in the order they render: two feature rows, then the index.
// Each description was written on 2026-10-08 from the repository’s README and code, and the
// owner reads them before they ship. Text between backticks renders as inline code. The
// last-commit date of each row is read from src/data/github.ts (npm run data:github), so it
// is not repeated here. `repo` is the name that file uses for the repository.
//
// What each row rests on (checked 2026-10-08):
// - notchTerm: README "Current State" and "Permissions"; NotchStateStore.swift polls every
//   1.2 s. There are no screenshots in the repository, so the figure is the AppleScript from
//   locateTab in TerminalBridge.swift (commit a721fc2), complete and in order. An untracked
//   notchterm-readme-hero.png sits in the local clone. It is a mockup with invented session
//   text, so it is not used.
// - OpenUltraCode: docs/MODEL_ROUTING.md and the README. The transcript in the visual is real
//   output of ouc 0.1.0, built from commit 6b81862 and captured on 2026-10-08. The routing
//   rule is in src/router.ts, classifyTask: importance "critical" returns the critical tier
//   before any other check, and the default profile maps that tier to claude-cli, opus.
// - SmartInvest: its README and the screenshot committed to the repository (cropped above the
//   Next.js dev badge and converted to grayscale).
// - Tally: the repository is still named adhdsat. REBRAND.md records the rename on 2026-06-30
//   and the full screenshot still shows the old name, so the page uses a crop of the question.
//   The question bank has 1,062 questions in server/data/questions.json; 912 are marked
//   generated, 80 ingested and 70 authored.
// - Jarvis-Bee (repository smartAI) is left off the page: its agents only echo messages back,
//   and there is no screenshot to show.
// - ShipKit: src/lib/scanner/registry.ts registers 18 rules; src/lib/ai/index.ts says the
//   Anthropic SDK is used only for fix suggestions.
// - TeamStat Insights: the repository was created and last pushed on 2025-05-25. Its 48 teams
//   all appear in the 53-team Thomson Division at the Michiana Premier Event (FTCScout
//   2024/FPEMITHO, 2025-06-19 to 22). The repository does not say the app was used there. The
//   row gives no team count: FIRST ranks 46 teams in that division and FTCScout lists 53, and
//   the Results table in the FTC section already uses FIRST's 46.

export type SoftwareVisual = "script" | "terminal";

export type SoftwareScreenshot = {
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Short caption, only where the screenshot needs one. */
  note?: string;
};

export type SoftwareProject = {
  id: string;
  name: string;
  repo: string;
  url: string;
  kind: string;
  body: readonly string[];
  stack: readonly string[];
  visual?: SoftwareVisual;
  screenshot?: SoftwareScreenshot;
};

export const featuredSoftware: readonly SoftwareProject[] = [
  {
    id: "notchterm",
    name: "notchTerm",
    repo: "notchTerm",
    url: "https://github.com/AryaVora621/notchTerm",
    kind: "macOS app",
    body: [
      "My Claude and Codex sessions in Terminal show up as two small chips on either side of the MacBook notch. Move the pointer toward them and a panel opens with each session’s latest output and a field for typing to one of them.",
      "A bridge drives Terminal.app through AppleScript. It finds a tab whose foreground processes include `claude` or `codex`, reads that tab’s visible text every 1.2 seconds and types my message into it. The overlay takes its size from the screen’s safe-area insets.",
      "macOS asks for Automation permission, and for Accessibility because the Esc button sends the Escape key to a session. Without them the panes read Offline. There is no packaged release. You compile it with `swift build`.",
    ],
    stack: ["Swift", "SwiftUI", "AppleScript"],
    visual: "script",
  },
  {
    id: "openultracode",
    name: "OpenUltraCode",
    repo: "openultracode",
    url: "https://github.com/openultracode/openultracode",
    kind: "Command-line tool",
    body: [
      "Give `ouc` a goal and it splits the work into tasks and routes each one to a model tier. Research goes to free models, and edits and tests go to the strong tier. Anything marked critical goes straight to the top tier, Claude Opus in the default profile. `ouc plan` shows that routing as a dry run before any model is called.",
      "Each edit task runs in its own git worktree, and nothing reaches my checkout unless I pass `--apply-clean-patches`. If two edit tasks claim the same file, the run stops before it starts. A cost cap can also end a run partway through, and every run keeps a plan and a ledger of what happened under `.ouc/runs`.",
      "The backends that call real models are covered by tests with mocked responses, and the fake backend calls nothing.",
    ],
    stack: ["TypeScript", "Node.js"],
    visual: "terminal",
  },
];

export const indexedSoftware: readonly SoftwareProject[] = [
  {
    id: "smartinvest",
    name: "SmartInvest",
    repo: "SmartInvest",
    url: "https://github.com/AryaVora621/SmartInvest",
    kind: "Web app",
    body: [
      "A stock research app. Its Research tab streams a web-searched, cited report while it is written, next to a market overview and screeners. The AI engine tries local command-line tools before falling back to an API key, and provider keys stay on the server.",
    ],
    stack: ["Next.js", "TypeScript"],
    screenshot: {
      src: "/projects/smartinvest-screener.webp",
      width: 1440,
      height: 810,
      alt: "The SmartInvest dashboard, in grayscale, with a row of market index tiles above an Emerging Markets screener that has Swing, Long-term and Ranked tabs and a list of tickers.",
    },
  },
  {
    id: "tally",
    name: "Tally",
    repo: "adhdsat",
    url: "https://github.com/AryaVora621/adhdsat",
    kind: "Web app",
    body: [
      "Short sprints of 5, 10, 15 or 20 questions target the SAT topics a student is weakest in, and a spaced-repetition queue brings missed questions back. It adds XP, streaks and a predicted score, and an optional Gemini coach explains answers.",
      "The question bank holds 1,062 questions, most of them generated by AI.",
    ],
    stack: ["React", "Vite", "Express", "Postgres"],
    screenshot: {
      src: "/projects/tally-sprint.webp",
      width: 1200,
      height: 731,
      alt: "A sprint question, in grayscale, with a progress bar, a question about the vertex of a parabola, four answer choices, Hint and Check Answer buttons, and a sidebar headed ADHDSat that shows XP and a day streak.",
    },
  },
  {
    id: "shipkit",
    name: "ShipKit",
    repo: "shipkit",
    url: "https://github.com/AryaVora621/shipkit",
    kind: "Web app",
    body: [
      "ShipKit checks a web project against 18 rules for problems such as an exposed service key or a missing 404 page, then suggests fixes. Scanning runs locally. The Anthropic SDK is used only to write the suggestions.",
    ],
    stack: ["Next.js", "Supabase", "Stripe", "Vitest"],
  },
  {
    id: "teamstat",
    name: "TeamStat Insights",
    repo: "TeamStat-Insights",
    url: "https://github.com/AryaVora621/TeamStat-Insights",
    kind: "Web app",
    body: [
      "In May 2025 I built a scouting app for my FTC team in Firebase Studio. It lists teams from the Thomson Division at the Michiana Premier Event in a table you can sort and search, and a match simulator lets each team’s score swing by a percentage you set.",
    ],
    stack: ["Next.js", "TypeScript", "Genkit"],
  },
];

// Every GitHub link on the page uses this URL. It opens the repositories tab, not the profile
// page, on purpose: the profile README (AryaVora621/AryaVora621, a separate repo) still says
// "Won it as captain, 5-0" and "won the NJ University Cup", and FTCScout records a 0-2 loss in
// the state final. Once Arya approves a corrected README, point this back at
// https://github.com/AryaVora621.
export const githubUrl = "https://github.com/AryaVora621?tab=repositories";

// Read by the Contact section. Hugging Face is left out: the Frinklyy account exists but has
// no models, datasets or spaces, so a link would only pad the list.
export const socialLinks = [
  {
    label: "GitHub",
    handle: "@AryaVora621",
    url: githubUrl,
  },
  {
    label: "LinkedIn",
    // The slug comes from Arya’s own profile README; linkedin.com answers bots with
    // status 999, so it could not be checked here. Arya to confirm.
    handle: "aryavora",
    url: "https://linkedin.com/in/aryavora",
  },
  {
    label: "X",
    handle: "@aryavora621",
    url: "https://x.com/aryavora621",
  },
  {
    label: "Instagram",
    handle: "@aryavora621",
    url: "https://www.instagram.com/aryavora621/",
  },
] as const;
