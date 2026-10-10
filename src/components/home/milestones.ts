/*
  The About timeline on the home page, oldest first, one plain sentence a row. It carries Arya's
  roles on MakEMinds and his firsts outside the team. The season results are not repeated
  here: the Reaper section higher on the page shows them, and the Reaper page keeps the full
  ledger. The roles are the rows already checked for the Reaper page
  (src/components/ftc/reaperContent.tsx: ROLES, from the team's 2024-25 and 2025-26
  engineering portfolios, and Arya's own word on the founding year and the 2026-27 captaincy).
  The 2025-26 row names the role only; the Reaper section says what he did in it.

  Sources for the two bench rows:
  roboPet frame: the roboPet README progress log, Day 8 (8-servo MVP chassis designed in
  Onshape, printed on a Bambu A1 Mini, partly assembled 2026-07-10 to 11: some servos, the
  MPU6050 and the Pico mounted). The row leaves out "printed": the film outro in the roboPet
  section states that once, and this row adds only what was mounted and when.
  Drone flight: drone repo DEVLOG.md, session 5, 2026-07-18 ("several minutes of controlled
  flight. Ended when the pilot oversteered and flipped the frame, breaking 2 propellers"). How
  it ended is on the drone's preview card and its page, so the row only dates the first flight.

  `dateTime` is the start of the row's period, as a valid HTML date or year.
*/
export const milestones = [
  {
    when: "2023",
    dateTime: "2023",
    text: "Co-founded the MakEMinds FTC team, 23786. The team began in FIRST LEGO League as team 45814.",
  },
  {
    when: "2024-25",
    dateTime: "2024",
    text: "Design Lead. I modeled design changes in CAD before the team built them.",
  },
  {
    when: "2025-26",
    dateTime: "2025",
    text: "Mechanical Lead on Reaper.",
  },
  {
    when: "Jul 2026",
    dateTime: "2026-07-10",
    text: "Mounted the IMU, the Pico and some of the servos on roboPet’s 8-servo frame.",
  },
  {
    when: "Jul 2026",
    dateTime: "2026-07-18",
    text: "First flight of my ESP32 quadcopter.",
  },
  {
    when: "2026-27",
    dateTime: "2026",
    text: "I captain the team for BIOBUZZ, the 2026-27 game.",
  },
] as const;
