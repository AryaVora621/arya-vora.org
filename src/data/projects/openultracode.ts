import type { Project } from "./types";

// Voice: Arya, first person. The reason for building it is the one his README gives under "Why
// This Should Exist" (expensive models used for cheap tasks, mutating workers stepping on each
// other); every claim about the tool is checkable in the repository.
//
// The summary carries what the tool does (a goal split into tasks, each routed to a model tier)
// and that edits run in worktrees and reach the checkout only on opt-in, so the body does not
// say either again in general terms: the intro gives the reason and names the command, "Routing
// by cost" has the rules, and "Edits that stay in worktrees" has the opt-in flag, once.
//
// Checked 2026-10-09 against openultracode/openultracode at commit 6b81862 (ouc 0.1.0): README,
// docs/MODEL_ROUTING.md, src/planner.ts, src/router.ts and a build of the commit run in a scratch
// repo. The repository moved to the openultracode organization on 2026-06-06 (AryaVora621/
// openultracode redirects to it). The transcript figure and the cover are real output of ouc 0.1.0
// (see SoftwareVisual.tsx and the build script behind public/projects). The cover is two dry runs
// of `ouc plan` in a small scratch repository, with `--run-id` so no date is in the run id, and
// a three-line helper, `./routes`, that prints each task's id, intent, tier and route from the
// plan.json that `ouc plan` writes. It calls no model, so there is no cost line on it.
//
// At this commit the planner always sets importance "normal", and every plan uses only the free
// and strong tiers; the cheap and critical tiers exist in the router only. The copy says so as a
// plain fact. The planner's own plan notes say "Real orchestrator parsing is not wired yet"; the
// copy calls the planner a keyword reader, which says the same, and does not add the caveat.
// "Not on npm yet" is in the status only; the last paragraph says it runs from a clone.
//
// Left out on purpose: the README ends with "MIT. See LICENSE" while LICENSE and package.json say
// AGPL-3.0, so the page says nothing about the license until Arya settles it.
export const openultracode: Project = {
  slug: "openultracode",
  title: "OpenUltraCode",
  category: "Software",
  tab: "OpenUltraCode",
  year: "2026",
  status: "Early CLI, not on npm yet",
  summary:
    "A command-line tool that splits a goal into tasks and routes each one to a model tier, so the most expensive model is not doing every job. Edits run in their own git worktrees, and nothing reaches my checkout unless I opt in.",
  cover: {
    src: "/projects/openultracode-cover.webp",
    alt: "A terminal window with two ouc plan runs. The goal “add rate limiting, tests and docs” makes three tasks, an edit, a test and an edit, all routed to the strong tier on codex-cli with gpt-5.3-codex. The goal “audit the auth middleware” makes one research task, routed to the free tier on OpenRouter with qwen/qwen3-coder:free.",
    width: 3200,
    height: 2000,
    tint: true,
  },
  stack: ["TypeScript", "Node.js"],
  links: [{ label: "Repository on GitHub", href: "https://github.com/openultracode/openultracode" }],
  blocks: [
    {
      kind: "text",
      heading: "What OpenUltraCode does",
      body: [
        "Parallel coding agents often use an expensive model for cheap tasks, and when several edit at once they can overwrite each other. I wanted the model matched to the task. The command is `ouc`, and `ouc plan` shows the routing as a dry run before any model is called.",
      ],
    },
    {
      kind: "text",
      heading: "Routing by cost",
      body: [
        "The planner is a deterministic keyword reader. It plans edit work for words such as implement, fix or add, test work for test or verify, and research for review, audit or inspect. A goal that asks for a change and a test becomes two dependent tasks, an Implement and a Verify.",
        "The router then maps each task to a tier by fixed rules. Research goes to free models, and edits and tests go to the strong tier, which the default profile points at Codex CLI with `gpt-5.3-codex`. The router also has a cheap tier on OpenRouter and a critical tier on Claude Opus, and each tier falls back to the next one up when it fails. The planner always sets each task’s importance to normal, and its plans use only the free and strong tiers.",
      ],
    },
    { kind: "custom", component: "software-visual", props: { slug: "openultracode" } },
    {
      kind: "text",
      heading: "Edits that stay in worktrees",
      body: [
        "Each edit task runs in its own git worktree under `.ouc/runs`, and the worker’s diff is captured as a patch. A patch reaches my checkout only if I pass `--apply-clean-patches` or turn the option on in the config, and only when it applies cleanly. If two edit tasks claim the same file, the run stops before it starts.",
        "A cost cap in the config, `limits.maxCostUsd`, can end a run partway through, using the cost the backend actually reports. Stopping a run with `SIGINT` or `SIGTERM` keeps what it has written, and every run leaves a plan, a ledger of events and a final report to read afterward.",
        "Real models stay off unless I name a backend with `--backend`. The default is a fake backend that calls nothing. It runs from a clone of the repository.",
      ],
    },
  ],
};
