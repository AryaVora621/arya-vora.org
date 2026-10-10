import type { Project } from "./types";

// Voice: Arya, first person. The purpose is the one his profile gives (a full-stack equity
// research dashboard with streaming AI analysis and emerging-markets screening); every claim about
// the code is checkable in the repository.
//
// This file holds SmartInvest. index.ts imports it as `smartai`, so the export keeps that name,
// but the project is SmartInvest (repository AryaVora621/SmartInvest) and its slug is
// "smartinvest", so the page lives at /projects/smartinvest. The repository called smartAI
// (Jarvis-Bee) is left off the site on purpose, as in v8.1: its agents only echo messages back.
//
// Checked 2026-10-09 against AryaVora621/SmartInvest at commit 7e6f04a: README, CHECKPOINT_LAST.md,
// apps/web/src (screen-actions.ts: curated list with no FMP key, live FMP screen with one),
// apps/bot (README, src/commands.js and src/scheduler.js: /research and the daily digest call the
// engine's runResearch; the hourly summary uses no AI) and packages/ai-engine. The repository
// README still says the bot "will reuse" the engine later; the bot's own code already does.
// The cover is a capture of the Emerging Markets card from a clone of the repository run locally
// on 2026-10-09 (dark theme, no keys set, so the curated list), at 4x and cropped below the page
// header, which carries the date. The one figure, the Company Data card for Apple, is another
// capture from a clone run locally the same day with no keys (see SoftwareVisual.tsx); the empty
// AI Research form that used to sit under the engine section is gone, since it showed none of
// the report the copy describes. The layout sentence in "One screen for a stock" (overview and
// screeners, then company data, financial tables and the TradingView chart, then AI Research)
// is the page order of that run.
//
// The summary carries the streamed, cited AI report and the market overview and screeners, so
// the first section opens on the monorepo instead of repeating them.
//
// Authorship: 15 of the repository's 16 commits carry a Co-Authored-By trailer for an AI agent,
// among them b667691 (2026-06-21, "remove Indian-market artifacts, US throughout"). The copy
// states that change with its date and does not say "I" did it. No role line is set: how the
// work was split is Arya's to say.
//
// Left out on purpose for now: any sentence about how provider keys are stored or kept private,
// and the AI Providers card, which says so on screen. Arya has the details.
export const smartai: Project = {
  slug: "smartinvest",
  title: "SmartInvest",
  category: "Software",
  tab: "SmartInvest",
  year: "2026",
  status: "In development",
  summary:
    "A stock research app. Its AI Research card streams a web-searched, cited report while it is written, next to a market overview and screeners. The AI engine tries local command-line tools before falling back to an API key.",
  cover: {
    src: "/projects/smartinvest-cover.webp",
    alt: "The Emerging Markets screener in SmartInvest’s dark theme: a count of 18, Swing, Long-term and Ranked tabs, a sector menu and a Hide extreme risk button, and the first five tickers (BBAI, SOUN, SMR, ENVX and NVTS) with a sector, a cap tier and growth and risk tags each.",
    width: 3200,
    height: 2000,
    tint: true,
  },
  stack: ["Next.js", "TypeScript"],
  links: [{ label: "Repository on GitHub", href: "https://github.com/AryaVora621/SmartInvest" }],
  blocks: [
    {
      kind: "text",
      heading: "One screen for a stock",
      body: [
        "SmartInvest is a monorepo of a Next.js app, a Telegram bot and the AI research engine the two share. The Indian-market code came out on 2026-06-21, and the app covers US stocks only.",
        "The web app is one long page. Under the market overview and the screeners come the company data, the financial tables and a price chart for the stock I pick, and the AI Research card sits below them.",
      ],
    },
    {
      kind: "text",
      heading: "The AI research engine",
      body: [
        "The engine starts with the local `claude`, `codex` or `agy` command-line tools, which let a report run on a subscription already signed in on the host. It falls back to an OpenAI-compatible API such as OpenRouter when a key is set.",
        "The command-line route works only when the app is self-hosted, because the tool has to be installed and signed in on the server. On a cloud host such as Vercel the app needs an API key and a model that can search the web.",
        "Reports reach the browser as server-sent events from `/api/ai-research`, and the server keeps a finished report on disk for an hour.",
      ],
    },
    {
      kind: "text",
      heading: "Data and the screener",
      body: [
        "Key statistics come from Yahoo Finance without any key, and the full income, balance-sheet and cash-flow tables come from Alpha Vantage when a key is set. The price chart is an embedded TradingView widget.",
        "The Emerging Markets screener is a fixed list of 28 small-company names, with cap, growth and risk tags that live in the code. Picking a name loads its numbers and an AI report in the cards below, and Batch analyze runs the top 12. With an FMP key set, the code switches to a live market-wide screen instead of that list.",
        "The bot in `apps/bot` runs the same engine for its `/research` command and a daily research digest, and it posts an hourly market and watchlist summary.",
      ],
    },
    { kind: "custom", component: "software-visual", props: { slug: "smartinvest-company" } },
  ],
};
