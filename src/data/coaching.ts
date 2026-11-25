// Facts for /coaching and its resume section. Add a line only with a source.
//
// Source: the verified facts sheet for the coaching page and resume (2026-11-25), which is built
// from this site (src/data/profile.ts), Arya's own confirmations on 2026-10-08, 2026-11-14 and
// 2026-11-24, and the public FTC Scout record for team 23786. Nothing here comes from anywhere
// else. Left out on purpose: availability, phone, address, the Code Ninjas manager's name and
// any end date for Code Ninjas (the sheet gives none, so the dates read "Fall 2026").
// The two FLL roles are in the past tense because Arya no longer holds them.
//
// JJPL and TSA: Arya is a board member of each. The sheet gives no exact title, so the page
// writes "board member" and nothing more.

export const COACHING_ROLES = [
  {
    title: "FLL head coach",
    when: "2026 season",
    text: "I was head coach and technical mentor of FIRST LEGO League team 58899, NinjaTechies, for the 2026 BioGlow season. The team was coached through Code Ninjas. I taught gear ratios, sensor feedback loops, block and Python programming, and the FIRST Core Values. I planned the autonomous mission paths, aiming for consecutive clean runs before we added harder missions. I also helped with the Myco-Vent innovation project, a CAD model and a 3D-printed prototype of an air filter concept, and the 20-slide presentation deck.",
  },
  {
    title: "Code Ninjas",
    when: "Fall 2026",
    text: "I coached students in coding and robotics sessions as a part-time coach.",
  },
  {
    title: "PulseDrive",
    when: "Outside mentoring",
    text: "I mentored PulseDrive, a FIRST Tech Challenge team that is not my own.",
  },
] as const;

export const COACHING_TEAMS = [
  {
    name: "FTC 23786, MakEMinds",
    text: "I co-founded the team in 2023 and I am captain for 2026-27. I was Design Lead in 2024-25 and Mechanical Lead in 2025-26.",
    href: "/ftc",
  },
  {
    name: "FRC 2554, The Warhawks",
    text: "I have been on the board since 2025, as PR Manager for operations. I also build and drive.",
    href: "/frc",
  },
  {
    name: "JJPL, Junior Jet Propulsion Lab",
    text: "I am a board member of the rocketry club at John P. Stevens.",
    href: "https://jjplrockets.org",
  },
  {
    name: "TSA",
    text: "I am a board member of the Technology Student Association chapter at John P. Stevens.",
  },
] as const;

export const RESUME_GROUPS = [
  {
    title: "Education",
    lines: ["John P. Stevens High School, Edison, New Jersey. Class of 2028."],
  },
  {
    title: "Coaching",
    lines: [
      "Head Coach and Technical Mentor, FLL team 58899 NinjaTechies, 2026 season.",
      "Part-time coach, Code Ninjas, Fall 2026.",
      "Outside mentor, FTC team PulseDrive.",
    ],
  },
  {
    title: "Leadership",
    lines: [
      "Captain 2026-27, FTC team 23786 MakEMinds. Co-founder, 2023.",
      "Board member and PR Manager for operations, FRC team 2554, 2025 to present.",
      "Board member, JJPL and the TSA chapter at J.P. Stevens.",
    ],
  },
  {
    title: "Skills",
    lines: [
      "CAD in Onshape and Fusion 360, 3D printing, KiCad circuit boards.",
      "Python, Java, C++, MicroPython, TypeScript and React.",
      "Drivetrains, gearboxes, wiring, sensors, and finding out why a robot stopped working.",
    ],
  },
] as const;

export const RESUME_PDF = "/arya-vora-resume.pdf";
