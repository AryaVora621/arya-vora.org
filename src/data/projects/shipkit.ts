import type { Project } from "./types";

// Voice: Arya, first person. The purpose is the one his README states (scan AI-generated web
// projects for production-readiness issues and get from prototype to deployment faster); every
// claim about the code is checkable in the repository.
//
// Checked 2026-10-09 against AryaVora621/shipkit at commit e0bc381: README, package.json,
// src/lib/scanner (registry, executor, auto-fix, rules), src/lib/ai, the route tree and
// supabase/migrations. The repository has no screenshot and no hosted copy, so the cover is the
// real results page: the repository's own FindingsList component in a scratch Next app, showing
// a real executeScan of another of Arya's repositories (8 findings: 0 critical, 3 warnings, 5
// info on 2026-10-09; the page has no date on it). Nothing in ShipKit was changed. The cover is
// captured at 4x and cropped to the issue summary and the first two findings, so no repository
// name is on it, and its caption says it is not a capture of a hosted copy. Swap it for a
// capture of a real hosted scan when Arya has one, and drop the caption.
//
// Fix suggestions: src/lib/ai/index.ts says in its header comment that Claude Haiku writes the
// suggestions, but no file in the repository imports it, so nothing calls it yet. The copy says
// so, inside "The 18 rules", rather than in a closing section.
//
// The summary carries the 18 rules, two example problems and the eight rules that can write a
// fix, and the body does not count them again: "What it catches" opens on what ShipKit is and
// what it looks for (the missing 404 page is left to the summary), the rule-list figure shows the
// 18, and "The 18 rules" says once that a scan calls no model and describes the fixing rules
// without their number. The heading keeps its
// name, which tests/projects.spec.ts looks up.
export const shipkit: Project = {
  slug: "shipkit",
  title: "ShipKit",
  category: "Software",
  tab: "ShipKit",
  year: "2026",
  status: "Standalone app, source only",
  summary:
    "ShipKit checks a web project against 18 rules for problems such as an exposed service key or a missing 404 page, and can generate the fix for eight of them.",
  cover: {
    src: "/projects/shipkit-cover.webp",
    alt: "ShipKit’s results page for a scan of one of my repositories: a summary reading 8 issues found, with 0 critical, 3 warning and 5 info, then the Security section with a warning for no rate limiting detected (SEC-007) and an info finding to run npm audit (SEC-008), each with a Fix suggestion.",
    width: 3200,
    height: 2000,
    caption:
      "ShipKit’s own results components on a real scan of one of my repositories. There is no hosted copy to capture.",
    tint: true,
  },
  stack: ["Next.js", "Supabase", "Stripe", "Vitest"],
  links: [{ label: "Repository on GitHub", href: "https://github.com/AryaVora621/shipkit" }],
  blocks: [
    {
      kind: "text",
      heading: "What it catches",
      body: [
        "ShipKit is a Next.js app for projects built with AI tools. Connect a GitHub repository or upload a project, and it returns each finding with how to fix it and a score out of 100.",
      ],
    },
    {
      kind: "text",
      heading: "The 18 rules",
      body: [
        "Each rule is a plain TypeScript function that reads a snapshot of the project’s files and configuration and returns findings. No model is called during a scan. The rules run in a fixed order, the 8 security rules first, then 5 for deployment and 5 for quality. If one throws, the scan carries on without it.",
        "Progress streams to the page over server-sent events, one event as a rule starts and another as it finishes. The score starts at 100, and each critical finding takes off 25 points, each warning 10 and each info finding 3, down to a floor of zero.",
        "The rules that can write their own fix mostly create the missing file, such as a `vercel.json`, an `error.tsx` or a `not-found.tsx`, and a few edit files that already exist. Every suggestion today comes from the rule’s own text. A module in `src/lib/ai` would ask Claude Haiku for a short fix suggestion and fall back to the rule’s text when the call fails, but nothing calls it yet.",
      ],
    },
    { kind: "custom", component: "software-visual", props: { slug: "shipkit" } },
    {
      kind: "text",
      heading: "Around the scanner",
      body: [
        "Supabase handles auth and data, with one migration devoted to row-level security policies. A deploy wizard uses the Vercel API and can roll a deploy back, an uptime monitor runs from a cron route, and Stripe handles billing. A public showcase page and an Open Graph image route show a project’s score.",
      ],
    },
  ],
};
