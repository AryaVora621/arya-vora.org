// Rows for the "Other projects" list, in the order they render.
// DRAFT: each description was written on 2026-10-08 from that repo's README and
// code, for Arya to confirm or rewrite in his own words. Text between backticks
// renders as inline code. The last-commit date comes from src/data/github.ts.
// The rows are kept to different lengths on purpose, and only notchTerm uses a
// semicolon. No row opens with its own name, which the heading above it already
// says. Open question for Arya: one first-hand detail each (what broke first, or
// who uses it) for two of these, so they can run longer.
//
// Sources for the rows that carry a date or a count (checked 2026-10-08):
// - TeamStat Insights: the repo was created and last pushed on 2025-05-25; its layout title is
//   "Thomson Scouting App"; its description says it was built for team 23786; all 48 teams in
//   src/lib/team-data.ts are in the 53-team Michiana Premier Event, Thomson Division (FTCScout
//   2024/FPEMITHO, 2025-06-19 to 22), where 23786 went 5-5 and ranked 20th. The repo does not say
//   the app was used there, or how long it took to write, so both are for Arya to confirm.
// - ShipKit: its README says the repo "was extracted from a larger workspace so it can be
//   deployed and iterated on as a standalone public app". It does not say who extracted it.

export type ProjectStatus = "Working" | "In progress" | "Paused" | "Abandoned";

export type Project = {
  id: string;
  name: string;
  url: string;
  description: string;
  stack: readonly string[];
  // Arya should confirm each status word. They are guesses from the repo's
  // README and commit history.
  status: ProjectStatus;
};

export const otherProjects: readonly Project[] = [
  {
    id: "notchterm",
    name: "notchTerm",
    url: "https://github.com/AryaVora621/notchTerm",
    description:
      "My Claude and Codex sessions in Terminal show up in a SwiftUI overlay around the MacBook notch; it reads their output over AppleScript and sends what I type to the matching tab. It opens when the pointer gets close.",
    stack: ["Swift", "SwiftUI", "AppleScript"],
    status: "Working", // Arya to confirm
  },
  {
    id: "teamstat",
    name: "TeamStat Insights",
    url: "https://github.com/AryaVora621/TeamStat-Insights",
    description:
      "In May 2025 I built this in Firebase Studio to scout our division at the Michiana Premier Event that June. It has a table of the 48 teams that you can sort and search, and a match simulator where each team's score can swing by a percentage you set.",
    stack: ["Next.js", "TypeScript", "Genkit"],
    status: "Paused", // Arya to confirm
  },
  {
    id: "shipkit",
    name: "ShipKit",
    url: "https://github.com/AryaVora621/shipkit",
    description:
      "I pulled this out of a larger workspace so it could deploy on its own. It scans AI-generated web projects for security, deployment and quality problems and explains how to fix what it finds.",
    stack: ["Next.js", "Supabase", "Stripe", "Vitest"],
    status: "Paused", // Arya to confirm
  },
  {
    id: "openultracode",
    name: "OpenUltraCode",
    url: "https://github.com/openultracode/openultracode",
    description:
      "When I give `ouc` a coding goal, it splits the work into tasks and sends the low-risk ones to free or cheap models. Edits and tests go to the stronger models. Each edit runs in its own git worktree, and none of them touch my repository until I opt in.",
    stack: ["TypeScript", "Node.js"],
    status: "In progress", // Arya to confirm
  },
  {
    id: "jarvis-bee",
    name: "Jarvis-Bee",
    url: "https://github.com/AryaVora621/smartAI",
    description:
      'A local agent swarm for my Mac, with a Queen agent handing work to Developer and Productivity sub-agents. The FastAPI server and the browser HUD (which listens for "Hey Jarvis") are done, but the Queen only repeats what you type until I connect a model.',
    stack: ["Python", "FastAPI", "JavaScript"],
    status: "In progress", // Arya to confirm
  },
];

// Every GitHub link on the page uses this URL. It opens the repositories tab, not the profile
// page, on purpose: the profile README (AryaVora621/AryaVora621, a separate repo) still says
// "Won it as captain, 5-0", "won the NJ State Championship, won the NJ University Cup" and
// "I'm a junior", and FTCScout records a 0-2 loss in the state final, no University Cup win and
// the class of 2028. Once Arya approves a corrected README, point this back at
// https://github.com/AryaVora621.
export const githubUrl = "https://github.com/AryaVora621?tab=repositories";

// Read by the Intro and the Contact section. Hugging Face is left out: the Frinklyy account
// exists but has no models, datasets or spaces (huggingface.co/api/users/Frinklyy/overview,
// 2026-10-08), so a link would only pad the list. Add it back once something is published.
export const socialLinks = [
  {
    label: "GitHub",
    handle: "@AryaVora621",
    url: githubUrl,
  },
  {
    label: "LinkedIn",
    // The slug comes from Arya's own profile README; linkedin.com answers bots with
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
