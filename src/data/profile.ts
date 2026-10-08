// Facts about Arya that the page states. Add a field only with a source.
//
// Team numbers, names and rookie year: FTCScout (api.ftcscout.org/rest/v1/teams/23786) and
// The Blue Alliance (thebluealliance.com/team/2554), checked 2026-10-08.
//
// Roles, confirmed by Arya on 2026-10-08. He co-founded MakEMinds in 2023. Before the FTC team,
// MakEMinds had an FLL team, 45814, and the page says MakEMinds "started in FIRST LEGO League"
// as that team. Do not write "also has" or "runs" a FLL team: the 2025-26 portfolio (p.3) lists
// 45814 as one of four FLL teams MakEMinds mentored, so that reading makes it four teams, and
// the owner's account is only that 45814 came first. Whether Arya was on it himself is not
// confirmed, so no "we". The team's engineering portfolios list him as Design Lead in 2024-25
// ("Cadded design changes before building") and Mechanical Lead in 2025-26 ("Built the robot
// and made design changes"). He is captain for 2026-27 and on the board of FRC 2554. The FTC
// section states the roles once, so the timeline below leaves out the founding.
//
// Profile links (GitHub, LinkedIn and the rest) live in socialLinks in src/data/portfolio.ts.

export const profile = {
  name: "Arya Vora",
  email: "aryavora621@gmail.com",
  school: "John P. Stevens High School",
  city: "Edison, New Jersey",
  classYear: 2028,
  siteSource: "https://github.com/AryaVora621/arya-vora.org",
} as const;

export const ftcTeam = {
  program: "FTC",
  number: 23786,
  name: "MakEMinds",
  founded: 2023,
  fllNumber: 45814,
  url: "https://ftcscout.org/teams/23786",
} as const;

export const frcTeam = {
  program: "FRC",
  number: 2554,
  name: "Warhawks",
  url: "https://www.thebluealliance.com/team/2554",
} as const;

// The About timeline, oldest first. Sources per row:
// roboPet frame: the roboPet README progress log, Day 8 (8-servo MVP chassis designed in Onshape,
// printed on a Bambu A1 Mini, partly assembled 2026-07-10 to 11: some servos, the MPU6050 and the
// Pico mounted).
// The row leaves out "printed": the film outro in the roboPet section states once that the
// frame is printed and partly assembled, and this row adds only what was mounted and when.
// Drone flight: drone repo DEVLOG.md, session 5, 2026-07-18 ("several minutes of controlled
// flight. Ended when the pilot oversteered and flipped the frame, breaking 2 propellers").
export const milestones = [
  {
    when: "Jul 2026",
    dateTime: "2026-07-10",
    text: "Mounted the IMU, the Pico and some of the servos on roboPet’s 8-servo frame.",
  },
  {
    when: "Jul 2026",
    dateTime: "2026-07-18",
    text: "First flight of my ESP32 quadcopter. It flew for several minutes, then an oversteer flipped it and broke two props.",
  },
] as const;
