import type { Project } from "./types";

// Voice: Arya, first person. Every claim about the app is checkable in the repository or at the
// deployed copy.
//
// Checked 2026-10-09 against AryaVora621/TeamStat-Insights at commit 16a3f51 and the deployed
// app at team-stat-insights.vercel.app (HTTP 200, page title "Thomson Scouting App"). All three
// commits are from 2025-05-25. The 48 teams in src/lib/team-data.ts are all in the 53-team
// Thomson Division at the Michiana Premier Event (FTCScout 2024/FPEMITHO, 2025-06-19 to 22).
// The repository does not say the app was used at the event, so the copy does not either. The
// app labels its four score and rank pairs "Round 1" to "Round 4"; the copy repeats the labels
// and does not say what they measure, because the repository does not.
//
// The three pictures are captures of the deployed app taken 2026-10-09: the dashboard's chart
// card as the cover (a 900 px wide window at 4x, so the page's own scroll box for the chart shows
// the first ten bars whole and part of the eleventh, of 48), a match run with KIROSHI,
// Engineerds NextGen, Caesar Circuitry and MakEMinds, and the playoff bracket of one full
// competition run (the numbers are random per run).
//
// The summary carries the 48 teams, the division and the sortable, searchable table, so the
// first section opens on the fixed team list in src/lib/team-data.ts (MakEMinds, 23786, is in
// it) and does not repeat them.
//
// There is no "next" line on purpose: the repository states no plan, and the page should not
// invent one. Arya can add one.
export const teamstat: Project = {
  slug: "teamstat",
  title: "TeamStat Insights",
  category: "Software",
  tab: "TeamStat",
  year: "2025",
  status: "Deployed",
  summary:
    "In May 2025 I built a scouting app in Firebase Studio for the Thomson Division at the Michiana Premier Event, where my team competed. It lists 48 of the division’s teams in a table you can sort and search, and two simulators play out a match or a whole competition from each team’s scores.",
  cover: {
    src: "/projects/teamstat-cover.webp",
    alt: "The chart on the TeamStat Insights dashboard, in a browser window: a bar chart titled All Teams by Round 1 Score, with a bar for each of the first teams from the highest score down and each team’s name and number under its bar.",
    width: 3200,
    height: 2000,
    tint: true,
  },
  stack: ["Next.js", "TypeScript", "Genkit"],
  links: [
    { label: "Repository on GitHub", href: "https://github.com/AryaVora621/TeamStat-Insights" },
    { label: "Deployed app", href: "https://team-stat-insights.vercel.app" },
  ],
  blocks: [
    {
      kind: "text",
      heading: "Scouting a division",
      body: [
        "The team list, my team MakEMinds (23786) included, is fixed in the code. The app fetches nothing at run time. Each team has four score and rank pairs, which the app labels Round 1 through Round 4.",
        "The dashboard charts every team’s Round 1 score above the table, and Compare Teams puts two teams side by side as bar charts. An info icon on a column header asks a Genkit flow running Gemini 2.0 Flash to explain what that statistic means and how a team might improve it.",
      ],
    },
    {
      kind: "text",
      heading: "Simulating an event",
      body: [
        "The match simulator takes two alliances of two teams and scores each team as its Round 1 number times a random factor. The Score Swing slider sets how far that factor can move. At the default of plus or minus 20 percent, a team lands anywhere from 80 to 120 percent of its base.",
      ],
    },
    { kind: "custom", component: "software-visual", props: { slug: "teamstat" } },
    {
      kind: "text",
      body: [
        "The competition simulator plays 10 qualification matches per team in two-team alliances, with outcomes drawn from the combined Round 1 scores. It then runs a double-elimination playoff for 8 alliances of 2 teams, taken from the top 16. The swing slider applies to the playoff matches only.",
      ],
    },
    { kind: "custom", component: "software-visual", props: { slug: "teamstat-bracket" } },
    {
      kind: "specs",
      heading: "Pages and data",
      rows: [
        {
          label: "Pages",
          value: "Dashboard, Compare Teams, Simulate Match, Simulate Competition and a page for each team",
        },
        { label: "Data", value: "48 teams, each with four score and rank pairs" },
      ],
    },
  ],
};
