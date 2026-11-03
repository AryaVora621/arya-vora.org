import { SEASONS } from "@/components/ftc/reaperContent";

/*
  Facts for the two team pages, /ftc and /frc. Add a line only with a source.

  FTC 23786 MakEMinds. The event ledger is SEASONS in src/components/ftc/reaperContent.tsx
  (FIRST's event pages and FTCScout, checked 2026-10-08 and again 2026-11-03); everything counted below is derived
  from it, so the totals can never drift from the table. Roles come from the same file (ROLES).
  The four FLL teams MakEMinds mentored: the team's 2025-26 engineering portfolio, page 3.
  E.M.E.R.G.E.: the 2024-25 engineering portfolio ("founded by FRC team 2554 and FTC team
  MakEMinds as a robotics student council for local teams ... in the Edison-Metuchen area").

  FRC 2554 The Warhawks. Every FRC row was checked on 2026-11-03 against The Blue Alliance
  (thebluealliance.com/team/2554/2024, /2025, /2026 and /history: rank, alliance, playoff round,
  awards, event towns) and Statbotics (api.statbotics.io/v3/team_events: qualification records,
  and the game breakdowns behind each "about" line). The first draft came from search excerpts of:
    frc-events.firstinspires.org/team/2554 and /2025/team/2554 (rookie year 2008, John P Stevens
      High School, Edison NJ, FIRST Mid-Atlantic; 2025 Quality Award and District Event Finalist
      at Seneca, Team Sustainability Award at Centennial, no awards at the District Championship)
    thebluealliance.com/team/2554/history (the same 2025 awards) and /team/2554 (2026: Seneca,
      Bensalem and the FMA District Championship; a Gracious Professionalism Award at Seneca)
    jpsrobotics2554.org ("Every year since 2008, our students have built a new competition robot
      from scratch") and docs.jpsrobotics2554.org/general/history (2021 FIRST Innovation
      Challenge global semifinalist with Visualeyes)
    firstinspires.org press release for REBUILT (2026 game: score fuel, cross obstacles, climb
      the tower).
  Individual awards (Dean's List, Woody Flowers, Leadership) name other students, so they stay
  off the page.

  Arya's FRC role (board member on the 2026-27 leadership board, core mechanical member and a
  driver) was confirmed by Arya on 2026-11-02; the work list is from his own About Me file.
*/

// ---------------------------------------------------------------------------------------------
// FTC
// ---------------------------------------------------------------------------------------------

const qualificationRows = SEASONS.flatMap((season) => season.rows).filter((row) => !row.final);

function sumRecord(rows: readonly { record: string }[]) {
  return rows.reduce(
    (total, row) => {
      const [wins, losses] = row.record.split("-").map(Number);
      return { wins: total.wins + wins, losses: total.losses + losses };
    },
    { wins: 0, losses: 0 },
  );
}

export const FTC_TOTALS = {
  /** Events with a qualification record; the state final is a playoff of the same event. */
  events: qualificationRows.length,
  record: sumRecord(qualificationRows),
  seasons: SEASONS.length,
  /** Events where the team finished qualification ranked first. */
  rankedFirst: qualificationRows.filter((row) => /^Ranked 1st\b/.test(row.result)).length,
};

/** Judged awards, each one a row of the ledger (date and event match it). */
export const FTC_AWARDS = [
  { date: "2026-02-14", award: "Inspire Award, 2nd place", event: "Upper Central League Tournament" },
  { date: "2025-03-16", award: "Control Award, 1st place", event: "New Jersey Championship" },
  { date: "2025-02-15", award: "Think Award, 1st place", event: "Upper Central League Tournament" },
  { date: "2025-02-15", award: "Inspire Award, 3rd place", event: "Upper Central League Tournament" },
] as const;

/** Events and qualification record of one season of the ledger, by its id ("2025"). */
export function seasonTotals(id: string) {
  const rows = SEASONS.find((season) => season.id === id)?.rows.filter((row) => !row.final) ?? [];
  return { events: rows.length, ...sumRecord(rows) };
}

export type SeasonCard = {
  id: string;
  years: string;
  game: string;
  robot?: string;
  href?: string;
  role: string;
  /** Short result lines, each one a row of the ledger. */
  lines: readonly string[];
  current?: boolean;
};

// One card per season, oldest first. The role is ROLES' for the year; the lines restate ledger
// rows in a few words. The 2026-27 card says only what is confirmed: the game, the captaincy and
// the events played so far.
export const FTC_SEASON_CARDS: readonly SeasonCard[] = [
  {
    id: "2023",
    years: "2023-24",
    game: "CENTERSTAGE",
    role: "Co-founder",
    lines: [
      "Rookie season, seven events",
      "Finalist alliance at the Central Conference Tournament",
      "Ranked 1st of 12 at the first league meet",
    ],
  },
  {
    id: "2024",
    years: "2024-25",
    game: "INTO THE DEEP",
    robot: "Riptide",
    role: "Design Lead",
    lines: [
      "Think Award, 1st, and Inspire Award, 3rd, at the league tournament",
      "Control Award, 1st, at the New Jersey Championship",
      "Michiana Premier Event in South Bend",
    ],
  },
  {
    id: "2025",
    years: "2025-26",
    game: "DECODE",
    robot: "Reaper",
    href: "/projects/reaper",
    role: "Mechanical Lead",
    lines: [
      "Inspire Award, 2nd, at the league tournament",
      "Won the Parkway Division of the New Jersey Championship, 5-0",
      "FIRST Championship, Houston, 5-5",
    ],
  },
  {
    id: "2026",
    years: "2026-27",
    game: "BIOBUZZ",
    role: "Captain",
    lines: ["I captain the team this season", "Ranked 12th of 17 at the first league meet, 3-3"],
    current: true,
  },
];

// ---------------------------------------------------------------------------------------------
// FRC
// ---------------------------------------------------------------------------------------------

export const FRC_FACTS = {
  rookieYear: 2008,
  district: "FIRST Mid-Atlantic",
  site: "https://jpsrobotics2554.org",
  tba: "https://www.thebluealliance.com/team/2554",
  first: "https://frc-events.firstinspires.org/team/2554",
} as const;

export type FrcEvent = { event: string; place?: string; result: string };
export type FrcSeason = { year: string; game: string; about: string; events: readonly FrcEvent[] };

// Newest first. "result" is the team's result at the event: an award or how far it went.
export const FRC_SEASONS: readonly FrcSeason[] = [
  {
    year: "2026",
    game: "REBUILT",
    about: "Two alliances score fuel, cross obstacles and climb the tower.",
    events: [
      {
        event: "FMA District Seneca Event",
        place: "Tabernacle NJ",
        result: "Ranked 22nd of 32. Second pick of alliance 5, out in playoff round 5. Gracious Professionalism Award.",
      },
      {
        event: "FMA District Bensalem Event",
        place: "Bensalem PA",
        result: "Ranked 30th of 34. Second pick of alliance 6, out in playoff round 4.",
      },
      {
        event: "FIRST Mid-Atlantic District Championship",
        place: "Bethlehem PA",
        result: "Qualified and competed. Ranked 66th of 66.",
      },
    ],
  },
  {
    year: "2025",
    game: "REEFSCAPE",
    about: "Robots score coral on the reef and algae in the net, then climb the barge.",
    events: [
      {
        event: "FMA District Seneca Event",
        place: "Tabernacle NJ",
        result: "Ranked 3rd of 33. Alliance 3 captain, district event finalist. Quality Award.",
      },
      {
        event: "FMA District Centennial Event",
        place: "Warminster PA",
        result: "Ranked 11th of 30. First pick of alliance 5, out in playoff round 2. Team Sustainability Award.",
      },
      {
        event: "FIRST Mid-Atlantic District Championship",
        place: "Bethlehem PA",
        result: "Qualified and competed. Ranked 17th of 60.",
      },
    ],
  },
  {
    year: "2024",
    game: "CRESCENDO",
    about: "Robots score notes in the speaker and amp, then climb onstage and score in the trap.",
    events: [
      {
        event: "FMA District Allentown Event",
        place: "Allentown NJ",
        result: "Ranked 19th of 27. Second pick of alliance 8, out in playoff round 2.",
      },
      { event: "FMA District Bensalem Event", place: "Bensalem PA", result: "Ranked 35th of 35." },
    ],
  },
];

export const FRC_HISTORY = [
  { when: "2007", text: "The robotics club starts at John P. Stevens High School." },
  { when: "2008", text: "Rookie year in FRC. The team has built a new robot every season since." },
  { when: "2021", text: "Global semifinalist in the FIRST Innovation Challenge with Visualeyes." },
  { when: "2026-27", text: "I join the team’s leadership board." },
] as const;

// DRAFT. Arya will rewrite these in his own words (see the sources at the top).
export const FRC_ROLE = [
  {
    title: "Board",
    text: "I’m on the 2026-27 leadership board. I help onboard new members and run outreach.",
  },
  {
    title: "Mechanical",
    text: "I work on the chassis and drivetrain: fabrication, assembly, gearbox integration, and CAN bus debugging when the electrical side acts up.",
  },
  {
    title: "Driver",
    text: "I drive the robot in matches.",
  },
] as const;
