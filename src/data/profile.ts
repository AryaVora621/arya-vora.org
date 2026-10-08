// Facts about Arya that the page renders. Add a field only with a source.
//
// Team numbers, names, rookie year and links: FTCScout (api.ftcscout.org/rest/v1/teams/23786)
// and The Blue Alliance (thebluealliance.com/team/2554), checked 2026-10-08.
//
// The roles are self-reported and wait on Arya's confirmation. Neither FTCScout nor The Blue
// Alliance records them. Their only source is his profile README (AryaVora621/AryaVora621,
// his own commit 5ffb688: "Founder & Captain" of 23786, "Board Member" of 2554), and that same
// file also had his class year wrong and called the state final loss "1st Place", so treat it as
// a lead, not a record. The page states the roles in the Intro and the About copy.
//
// Profile links live in socialLinks in src/data/portfolio.ts.

export const profile = {
  name: "Arya Vora",
  email: "aryavora621@gmail.com",
  school: "John P. Stevens High School",
  city: "Edison, NJ",
  classYear: 2028,
} as const;

export const ftcTeam = {
  program: "FTC",
  number: 23786,
  name: "MakEMinds",
  rookieYear: 2023,
  url: "https://ftcscout.org/teams/23786",
  // Self-reported (see above). The About also says he started the team; same source.
  role: "Captain",
} as const;

export const frcTeam = {
  program: "FRC",
  number: 2554,
  name: "Warhawks",
  url: "https://www.thebluealliance.com/team/2554",
  // Self-reported (see above).
  role: "Board member",
} as const;
