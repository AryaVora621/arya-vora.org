import Image from "next/image";
import type { ReactNode } from "react";
import type { ReaperPartId } from "./createReaperModel";

/*
  Reaper's copy and data for the blocks of /projects/reaper (src/components/ftc/ReaperBlocks.tsx),
  so every fact is written once. The home page's short highlight (src/components/home/
  ReaperHighlight.tsx) quotes three rows of the 2025-26 ledger below.

  Robot facts come from the team's 2025-26 engineering portfolio (pages 9 to 15).
  Roles come from the 2024-25 portfolio (page 3, "Design Lead, Cadded design changes before
  building") and the 2025-26 portfolio (page 2, PDF page 3, the roster: "Mechanical Lead, Built
  the robot and made design changes"). The same roster has a separate design team, whose lead
  "Cadded design changes before build" and whose member "Iterated on designs in CAD before
  production", and credits mechanical teammates with helping "build, rig, and maintain
  outtake" and managing "electrics and wiring", and a design-team member with managing "3D
  printing". The 2025-26 My part row says that and no more. The founding year, the FLL team
  and the 2026-27 captaincy were confirmed
  by Arya himself. The page says MakEMinds "started in FIRST LEGO League as team 45814" because
  Arya's chronology is that the team had that FLL team before the FTC team existed; page 3 of
  the 2025-26 portfolio lists 45814 first among four FLL teams MakEMinds mentored, so the page
  never says MakEMinds "has" or "runs" it. Whether Arya himself was on 45814 is not confirmed,
  so the line does not say "we". Page 11 ("Subsystem Iterations") is the source of the version
  photos and of what changed between versions; page 10 ("Robot Iterations") of the three robot
  photos and their notes. The code is not Arya's: the team repository's authors are Meer, Arnav
  Doshi and Saiganesh, so the programming credit goes to "the programming team". The WorldsRobo
  Onshape document is the team's, and incomplete.
  Event results are from FIRST's event pages and FTCScout, checked 2026-10-08.
  Images are cut from the portfolio by scripts/prepare-ftc-images.mjs; the real-robot strip's
  three cut-outs (Reaper and the two iterations) by
  assets-src/reaper-img2threejs/tools/prepare-real-robot.mjs, which keeps only the robot, pulls
  the cut edge in past the page white and the team's own halo, and feathers it. That script also
  cuts page 8's photo of the shooter in testing, which the site no longer shows: the photo is
  only about 600 px wide in the portfolio and its cut edge is rough.
  They are already sized for the page, so they are served as they are (unoptimized) rather than
  through /_next/image. That route reads each file through the visitor's own request, and
  `next start` keeps one pending job per image: a visitor who leaves while the job is reading
  leaves every later request for that image waiting, until the server restarts.

  What the page cannot say yet, and why. Which outtake or transfer version Arya drew himself is
  not written down anywhere: page 11, which shows versions V1 to V4, credits no one, and the
  roster gives him "Built the robot and made design changes" while the design team did the CAD.
  So the version cards describe what changed, and no line credits the versions to him or to the
  mechanical team. When he supplies a line for a version, put it in that version's `mine` field
  and the card shows it. The 2026-27 row says only what is confirmed: he captains the team for
  BIOBUZZ.

  The version captions follow the portfolio's page 11 (what each version was) and page 10
  (what went wrong with the first robot). The portfolio's note that rubber bands "may break, or
  artifacts may get stuck" sits in its Intake box, so it is not attributed to the transfer here.

  Ranges, scores and dates in running text (2025-26, 3-0, 284-297, 18-artifact) and
  "co-founded" go through keepTogether below, as on the home page (Portfolio.tsx), so a line
  never breaks one at its hyphen. It wraps them in a no-wrap span and leaves the text itself as
  it is.
*/

// A line may not break inside a digit range, a score, a date, a number-word compound such as
// "18-artifact", or "co-founded" (which broke after "co-" in My part at 1440px). Ordinary
// compounds ("full-width") still break as usual.
const UNBROKEN = /(co-founded|\d+(?:-\d+)+|\d+-[A-Za-z]+)/i;

/** Wraps each range, score, date or "co-founded" in `text` in a span that does not break. */
export function keepTogether(text: string): ReactNode {
  const parts = text.split(UNBROKEN);
  if (parts.length === 1) return text;
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <span key={index} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

// The team's photos of the real robot. Captions say only what the portfolio shows: page 9 is
// Reaper itself, page 10 the first and third iterations. The Iteration 1 photo is cut flat across
// its top in the portfolio itself (page 10 crops through an upright and the artifact), so no
// re-cut can restore it; its top 14% fades to transparent in the file (baked with sharp on
// 2026-10-09, alpha only), so the cut dissolves into the page in both themes and at every size.
// Re-running prepare-real-robot.mjs (named at the top of this file) would undo the fade, so a
// re-cut needs it again. The other two photos end in the robot's real edges and are left as
// they are.
const REAL_ROBOT = [
  {
    src: "/ftc/reaper-cutout.webp",
    width: 492,
    height: 563,
    caption: "Reaper, the fifth version",
    alt: "Reaper from the front: a flywheel shooter under an adjustable hood with a Limelight camera mounted below it, above a full-width intake with mecanum rollers.",
  },
  {
    src: "/ftc/iteration-3.webp",
    width: 560,
    height: 665,
    caption: "Iteration 3",
    alt: "The third iteration: aluminum channel towers around a printed hood over a flywheel, with gecko wheels across the front.",
  },
  {
    src: "/ftc/iteration-1.webp",
    width: 649,
    height: 685,
    caption: "Iteration 1",
    alt: "The first iteration: an open aluminum frame with a single flywheel on a motor mount and an artifact on top.",
  },
] as const;

export type RobotStep = {
  src: string;
  width: number;
  height: number;
  alt: string;
  name: string;
  text: string;
};

// Three of the five robots, oldest first, as page 10 of the 2025-26 portfolio shows them. The
// notes are that page's own, in plain words: iteration 1's problems, iteration 3's changes and
// the current robot's.
export const ROBOT_STEPS: readonly RobotStep[] = [
  {
    src: REAL_ROBOT[2].src,
    width: REAL_ROBOT[2].width,
    height: REAL_ROBOT[2].height,
    alt: REAL_ROBOT[2].alt,
    name: "Iteration 1",
    text: "The shooter was unstable and the chain transfer was too weak to move artifacts reliably. The shooter was fixed to the chassis, so the robot had to turn its whole body to aim. That slowed cycles and made it easy to defend.",
  },
  {
    src: REAL_ROBOT[1].src,
    width: REAL_ROBOT[1].width,
    height: REAL_ROBOT[1].height,
    alt: REAL_ROBOT[1].alt,
    name: "Iteration 3",
    text: "A smaller, lighter chassis with an intake that lifts. Rubber bands carried artifacts past a servo gate to a hooded shooter, and a cycle went from two artifacts to three.",
  },
  {
    src: REAL_ROBOT[0].src,
    width: REAL_ROBOT[0].width,
    height: REAL_ROBOT[0].height,
    alt: REAL_ROBOT[0].alt,
    name: "Iteration 5, Reaper",
    text: "Its chassis is the smallest and lightest of the versions. A full-width intake that flexes around artifacts feeds a gecko-wheel transfer, and the Limelight sets the hood angle and the flywheel's power.",
  },
];

export type SpecKey = "shooter" | "aiming" | "intake" | "protection" | "code";

/** Which parts of the 3D model each spec row lights up. */
export const SPEC_PARTS: Record<SpecKey, readonly ReaperPartId[]> = {
  shooter: ["shooter"],
  aiming: ["aiming"],
  intake: ["intake", "transfer"],
  protection: ["protection"],
  code: ["electronics"],
};

/** The row a click on the model selects. The drivetrain has no row of its own. */
export const PART_SPEC: Record<ReaperPartId, SpecKey | null> = {
  drive: null,
  intake: "intake",
  transfer: "intake",
  shooter: "shooter",
  aiming: "aiming",
  protection: "protection",
  electronics: "code",
};

/** The label of the model beside the spec rows, the only Reaper model on its page. */
export const MODEL_ONLY_LABEL =
  "A 3D model of Reaper built from the team’s CAD and photos. Choosing a row lights up that part of the robot.";

export type Version = {
  name: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  /** The portfolio's name for this version, and what changed in it. */
  label: string;
  text: string;
  /** One line, in Arya's voice, on his own part in this version. Shown when present. */
  mine?: string;
  /** Where the 4 by 3 frame sits on the photo, as a CSS object-position. */
  focus?: string;
};

export const OUTTAKE: readonly Version[] = [
  {
    name: "V1",
    src: "/ftc/outtake-v1.webp",
    width: 364,
    height: 432,
    alt: "A large black flywheel on a gearmotor, bolted to a perforated metal plate.",
    label: "Simple flywheel",
    text: "One wheel on a metal mount, spun to launch. With no hood to guide the artifact, shots were inconsistent.",
    focus: "50% 22%",
  },
  {
    name: "V2",
    src: "/ftc/outtake-v2.webp",
    width: 291,
    height: 285,
    alt: "A printed cradle with a curved hood, holding a perforated ball and a black wheel.",
    label: "Static hood",
    text: "A printed housing with a curved hood guided the artifact, and shots became more consistent.",
  },
  {
    name: "V3",
    src: "/ftc/outtake-v3.webp",
    width: 323,
    height: 234,
    alt: "A long black printed hood over a flywheel, with a chain below it and a sensor board beside it.",
    label: "Angle control",
    text: "A servo tilts the shooter to change the trajectory for shots from more than one distance.",
  },
  {
    name: "V4",
    src: "/ftc/outtake-v4.webp",
    width: 302,
    height: 253,
    alt: "A top-down view of a black printed shooter housing with a gearmotor on each side of the wheel.",
    label: "Two motors, compact",
    text: "A second motor on the other side of the wheel, in a smaller housing, for more power.",
  },
];

export const TRANSFER: readonly Version[] = [
  {
    name: "V1",
    src: "/ftc/transfer-v1.webp",
    width: 384,
    height: 361,
    alt: "A curved white ramp above a black wheel and a motor on a metal frame, with red wiring.",
    label: "Chain",
    text: "A chain moved artifacts along a rigid path. It sat low, was hard to tension and align, and lacked the power to move artifacts reliably.",
  },
  {
    name: "V2",
    src: "/ftc/transfer-v2.webp",
    width: 282,
    height: 358,
    alt: "A black wheel on a white axle block over a circuit board, above a cardboard box and a small gearmotor.",
    label: "Flywheel",
    text: "A spinning wheel propelled artifacts toward the shooter instead of carrying them, which made the transfer faster.",
    focus: "50% 30%",
  },
  {
    name: "V3",
    src: "/ftc/transfer-v3.webp",
    width: 303,
    height: 218,
    alt: "Looking down into the transfer: pale strips stretched between black printed dividers, with a motor at the left.",
    label: "Rubber bands",
    text: "Rubber bands stretched between printed dividers carried artifacts, with printed wheels and a ramp to guide them.",
  },
  {
    name: "V4",
    src: "/ftc/transfer-v4.webp",
    width: 281,
    height: 388,
    alt: "A top-down view of the transfer between two columns of aluminum plates, with a black wheel in the middle and mecanum wheels along the bottom edge.",
    label: "Ramp and wheel",
    text: "A ramp leads to a wheel next to the shooter. The wheel stops an artifact or pushes it through.",
    focus: "50% 38%",
  },
];

export const ROLES = [
  {
    when: "2023",
    role: "Co-founder",
    text: "MakEMinds started in FIRST LEGO League as team 45814. In 2023 I co-founded its FTC team, 23786.",
  },
  {
    when: "2024-25",
    role: "Design Lead",
    text: "I modeled design changes in CAD before the team built them.",
  },
  {
    when: "2025-26",
    role: "Mechanical Lead",
    text: "I led the mechanical team. I built the robot and made design changes, and the design team modeled changes in CAD before we built them. Teammates helped build and rig the outtake, wired the electronics and managed the 3D printing.",
  },
  {
    when: "2026-27",
    role: "Captain",
    text: "I captain the team for BIOBUZZ, the 2026-27 game.",
  },
] as const;

export type Row = {
  date: string;
  event: string;
  record: string;
  result: string;
  /**
   * Shown in the short list that leads Results (Reaper's season only, see HIGHLIGHTS); every
   * row stays in the full ledger.
   */
  highlight?: boolean;
};
export type Season = { id: string; title: string; note: string; rows: Row[] };

export const SEASONS: Season[] = [
  {
    id: "2025",
    title: "2025-26",
    note: "DECODE, with Reaper",
    rows: [
      {
        date: "2025-11-15",
        event: "League meet, Randolph NJ",
        record: "5-1",
        result: "Ranked 1st of 13",
      },
      {
        date: "2025-12-13",
        event: "League meet, Somerset NJ",
        record: "1-4",
        result: "Ranked 17th of 28",
      },
      {
        date: "2026-01-17",
        event: "League meet, Piscataway NJ",
        record: "4-1",
        result: "Ranked 2nd of 23",
      },
      {
        highlight: true,
        date: "2026-02-14",
        event: "Upper Central League Tournament, Hillside NJ",
        record: "4-1",
        result: "Inspire Award, 2nd place. Ranked 4th of 23.",
      },
      {
        date: "2026-02-20",
        event: "US Governors Cup, Washington DC",
        record: "4-1",
        result: "Ranked 5th of 51. Alliance captain, 1-2 in the playoffs.",
      },
      {
        highlight: true,
        date: "2026-03-15",
        event: "New Jersey Championship, Parkway Division, Hillsborough NJ",
        record: "5-0",
        result:
          "Ranked 1st of 24. Won the division as alliance captain with team 14450, 3-0 in the playoffs.",
      },
      {
        highlight: true,
        date: "2026-03-15",
        event: "New Jersey Championship, final",
        record: "0-2",
        result: "Finalist alliance. Lost both matches, 284-297 and 229-280, to teams 23268 and 7149.",
      },
      {
        highlight: true,
        date: "2026-04-29",
        event: "FIRST Championship, Ross Division, Houston TX",
        record: "5-5",
        result: "Ranked 38th of 56",
      },
    ],
  },
  {
    id: "2024",
    title: "2024-25",
    note: "INTO THE DEEP, with Riptide",
    rows: [
      {
        date: "2024-10-26",
        event: "League meet, Randolph NJ",
        record: "5-1",
        result: "Ranked 2nd of 12",
      },
      {
        date: "2024-12-14",
        event: "League meet, Somerset NJ",
        record: "3-2",
        result: "Ranked 6th of 24",
      },
      {
        date: "2025-01-18",
        event: "League meet, Piscataway NJ",
        record: "3-2",
        result: "Ranked 7th of 25",
      },
      {
        date: "2025-02-15",
        event: "Upper Central League Tournament, Union NJ",
        record: "3-2",
        result: "Think Award, 1st place. Inspire Award, 3rd place. Ranked 4th of 25.",
      },
      {
        date: "2025-03-16",
        event: "New Jersey Championship, Turnpike Division, Hillsborough NJ",
        record: "4-1",
        result: "Control Award, 1st place. Ranked 2nd of 24. Division finalist as alliance captain.",
      },
      {
        date: "2025-06-19",
        event: "Michiana Premier Event, Thomson Division, South Bend IN",
        record: "5-5",
        result: "Ranked 20th of 46",
      },
    ],
  },
  {
    id: "2023",
    title: "2023-24",
    note: "CENTERSTAGE, the team’s rookie season",
    rows: [
      {
        date: "2023-10-28",
        event: "League meet, Randolph NJ",
        record: "6-0",
        result: "Ranked 1st of 12",
      },
      {
        date: "2023-11-05",
        event: "League meet, Rockaway NJ",
        record: "3-3",
        result: "Ranked 11th of 22",
      },
      {
        date: "2023-11-19",
        event: "League meet, Parsippany NJ",
        record: "2-3",
        result: "Ranked 7th of 12",
      },
      {
        date: "2023-12-09",
        event: "League meet, Piscataway NJ",
        record: "4-1",
        result: "Ranked 5th of 24",
      },
      {
        date: "2024-01-20",
        event: "League meet, Chatham NJ",
        record: "3-2",
        result: "Ranked 6th of 24",
      },
      {
        date: "2024-03-03",
        event: "Central Conference Tournament, Union NJ",
        record: "3-2",
        result: "Finalist alliance, first team selected. Ranked 4th of 21.",
      },
      {
        date: "2024-03-17",
        event: "New Jersey Championship, Turnpike Division, Hillsborough NJ",
        record: "2-3",
        result: "Ranked 15th of 24",
      },
    ],
  },
];

export const EVENT_COUNT = SEASONS.reduce((count, season) => count + season.rows.length, 0);

// The short list that leads Results holds Reaper's own season only. It has no season column, so
// an older season's awards in it (Riptide's, 2024-25) would read as Reaper's; those stay in the
// full ledger, where each table is captioned with its season and robot. The list is newest
// first. Two rows share 2026-03-15, so the later row in the data (the final) comes first.
const REAPER_SEASON_ID = "2025";
export const HIGHLIGHTS: Row[] = SEASONS.filter((season) => season.id === REAPER_SEASON_ID)
  .flatMap((season) => season.rows)
  .map((row, index) => ({ row, index }))
  .filter(({ row }) => row.highlight)
  .sort((a, b) => b.row.date.localeCompare(a.row.date) || b.index - a.index)
  .map(({ row }) => row);

// A measurement inside a sentence stays in the text face. A mono number opens a full cell of
// space around itself and changes the texture of the line, so mono is kept for the ledger's
// dates and for code. The no-break space keeps the number and its unit on one line.
function Spec({ value, unit }: { value: string; unit: string }) {
  return (
    <>
      {value}
      {" "}
      {unit}
    </>
  );
}

export const SPEC_ROWS: { key: SpecKey; term: string; body: ReactNode }[] = [
  {
    key: "shooter",
    term: "Shooter",
    body: (
      <>
        A <Spec value="6000" unit="RPM" /> motor spins a weighted flywheel, and the last
        outtake version added a second motor on the other side of the wheel. A servo
        tilts the hood to change the launch angle. All three stored artifacts leave
        within a second.
      </>
    ),
  },
  {
    key: "aiming",
    term: "Aiming",
    body: (
      <>
        A Limelight 3A is mounted under the hood. It reads AprilTags and gives the shooter its
        distance to the goal.
      </>
    ),
  },
  {
    key: "intake",
    term: "Intake",
    body: (
      <>
        The full-width intake lifts and flexes to fit around artifacts, and mecanum
        wheels push them in from the sides. A <Spec value="1150" unit="RPM" /> motor turns
        a gecko wheel that moves them up to a servo ramp feeding the shooter. Two RGB
        lights show whether the lift is up or down.
      </>
    ),
  },
  {
    key: "protection",
    term: "Protection",
    body: (
      <>
        On earlier versions, artifacts thrown by the shooter hit the electronics and
        knocked wires loose. Reaper has acrylic shields over the control and expansion
        hubs, wheel guards and wooden side plates.
      </>
    ),
  },
  {
    key: "code",
    term: "Code",
    body: (
      <>
        The programming team wrote it. It uses Pedro Pathing for autonomous paths and
        TeleOp assists, a goBILDA Pinpoint to track the robot’s position, and the
        Limelight for aiming and flywheel speed. It runs an{" "}
        <span className="whitespace-nowrap">18-artifact</span> autonomous.
        Its autonomous success rate rose from 52% to 92% as localization moved from motor
        encoders to odometry pods and then to the Pinpoint.
      </>
    ),
  },
];

// The robot as a short sheet of parts and numbers, for the Specs block on /projects/reaper.
// Each value restates a fact from SPEC_ROWS or the portfolio's page 9 in a few words; the drive
// is read off the team's CAD and the photos (four mecanum wheels). Numbers are the team's own.
// The team and the season are not rows: the page header already says both (title, summary,
// year), so the sheet holds only the robot.
export const SPEC_SHEET: readonly { label: string; value: string }[] = [
  { label: "Version", value: "Fifth iteration" },
  { label: "Drive", value: "Four mecanum wheels" },
  { label: "Shooter", value: "Weighted flywheel on a 6000 RPM motor, with a second motor on the far side" },
  { label: "Hood", value: "Tilted by a servo, angle set from the Limelight" },
  { label: "Intake", value: "Full width, lifts and flexes, mecanum wheels feed it from the sides" },
  { label: "Transfer", value: "Gecko wheel on an 1150 RPM motor, then a servo ramp" },
  { label: "Vision", value: "Limelight 3A reading AprilTags" },
  { label: "Localization", value: "goBILDA Pinpoint" },
  { label: "Paths", value: "Pedro Pathing" },
  { label: "Autonomous", value: "18 artifacts; success rate up from 52% to 92%" },
];

type HeadingLevel = 2 | 3 | 4;

export function Heading({
  level,
  id,
  className,
  children,
}: {
  level: HeadingLevel;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const Tag = `h${level}` as const;
  return (
    <Tag id={id} className={className}>
      {children}
    </Tag>
  );
}

export function LedgerHead() {
  return (
    <thead>
      <tr>
        <th scope="col">Date</th>
        <th scope="col">Event</th>
        <th scope="col">Record</th>
        <th scope="col">Result</th>
      </tr>
    </thead>
  );
}

export function LedgerRows({ rows }: { rows: readonly Row[] }) {
  return (
    <tbody>
      {rows.map((row) => (
        <tr key={`${row.date}-${row.event}`}>
          <td className="ftc-date mono">{row.date}</td>
          <th scope="row">{row.event}</th>
          <td className="ftc-record">{row.record}</td>
          <td>{keepTogether(row.result)}</td>
        </tr>
      ))}
    </tbody>
  );
}

/** The results table, the full ledger behind a disclosure, and the sources line. */
export function ResultsTables() {
  return (
    <>
      {/* .ftc-table is the shared look. .ftc-ledger marks the three season tables only, so
          the highlights table that leads Results is not counted as a season. */}
      <table className="ftc-table ftc-highlights">
        <caption className="ftc-visually-hidden">Highlights of 2025-26, newest first</caption>
        <LedgerHead />
        <LedgerRows rows={HIGHLIGHTS} />
      </table>
      <details className="ftc-all">
        <summary>All {EVENT_COUNT} events, season by season</summary>
        {SEASONS.map((season) => (
          <table className="ftc-table ftc-ledger" key={season.id}>
            <caption>
              <span className="ftc-season-title">{season.title}</span>{" "}
              <span className="ftc-season-note">{season.note}</span>
            </caption>
            <LedgerHead />
            <LedgerRows rows={season.rows} />
          </table>
        ))}
        <p className="ftc-sources">
          Ranks are FIRST’s where published, FTCScout’s otherwise.
        </p>
      </details>
      <p className="ftc-sources">
        Records are qualification matches, except for the final. Full results:{" "}
        <a
          href="https://ftc-events.firstinspires.org/2025/team/23786"
          target="_blank"
          rel="noopener noreferrer"
        >
          FIRST
        </a>{" "}
        and{" "}
        <a href="https://ftcscout.org/teams/23786" target="_blank" rel="noopener noreferrer">
          FTCScout
        </a>
        .
      </p>
    </>
  );
}

/** The four roles, one column each, in order. */
export function RoleList() {
  return (
    <ol className="ftc-roles">
      {ROLES.map((entry) => (
        <li key={entry.when}>
          <span className="ftc-role-when mono">{entry.when}</span>
          <span className="ftc-role-name">{entry.role}</span>
          <span className="ftc-role-text">{keepTogether(entry.text)}</span>
        </li>
      ))}
    </ol>
  );
}

// The version photos are small: the team placed them in its portfolio at 130 to 190 ppi. Every
// photo sits in the same 4 by 3 frame, cropped to fit, so the eight read as one set, with its
// caption beside it. Each row of photos drifts together.
export function VersionRow({
  id,
  title,
  intro,
  versions,
  level = 4,
}: {
  id: string;
  title: string;
  intro: string;
  versions: readonly Version[];
  level?: HeadingLevel;
}) {
  return (
    <section className="ftc-sub" aria-labelledby={id}>
      <div className="ftc-sub-head">
        <Heading level={level} id={id}>
          {title}
        </Heading>
        <p>{keepTogether(intro)}</p>
      </div>
      <ol className="ftc-versions">
        {versions.map((version) => (
          <li key={version.name}>
            <figure>
              <div className="ftc-photo" data-ftc-depth="8">
                <Image
                  className="theme-tint"
                  src={version.src}
                  width={version.width}
                  height={version.height}
                  unoptimized
                  alt={version.alt}
                  style={version.focus ? { objectPosition: version.focus } : undefined}
                />
              </div>
              <figcaption>
                <span className="ftc-step-name">{version.name}</span>
                <span className="ftc-step-label">{version.label}</span>
                <span className="ftc-step-text">{keepTogether(version.text)}</span>
                {version.mine ? <span className="ftc-step-mine">{version.mine}</span> : null}
              </figcaption>
            </figure>
          </li>
        ))}
      </ol>
    </section>
  );
}

export const OUTTAKE_INTRO =
  "The shooter started as one wheel on a metal mount and ended as a compact unit with two motors.";
export const TRANSFER_INTRO = "The transfer moves artifacts from the intake up to the shooter.";

/**
 * The spec rows beside the model. Where the model draws (`drawable`), each term is a button
 * that lights up its part: hovered or focused rows light it while they are, and a pressed row
 * keeps it lit. Elsewhere the terms are plain text, so nothing claims to show a part.
 */
export function SpecRows({
  drawable,
  active,
  pinned,
  hintId,
  onHover,
  onPin,
}: {
  drawable: boolean;
  active: SpecKey | null;
  pinned: SpecKey | null;
  hintId: string;
  onHover: (key: SpecKey | null) => void;
  onPin: (key: SpecKey) => void;
}) {
  return (
    <>
      {drawable && (
        <p id={hintId} className="ftc-visually-hidden">
          Shows this part on the 3D model.
        </p>
      )}
      {drawable && (
        <p className="ftc-spec-cue reaper-hint" aria-hidden="true">
          Pick a row to light up its part on the model.
        </p>
      )}
      <dl className="ftc-specs" data-active={active ?? undefined}>
        {SPEC_ROWS.map((row) => (
          <div
            key={row.key}
            className="ftc-spec"
            data-active={active === row.key || undefined}
            onPointerEnter={(event) => {
              if (drawable && event.pointerType === "mouse") onHover(row.key);
            }}
            onPointerLeave={(event) => {
              if (event.pointerType === "mouse") onHover(null);
            }}
          >
            <dt>
              {drawable ? (
                <button
                  type="button"
                  className="ftc-spec-key"
                  aria-pressed={pinned === row.key}
                  aria-describedby={hintId}
                  onFocus={() => onHover(row.key)}
                  onBlur={() => onHover(null)}
                  onClick={() => onPin(row.key)}
                >
                  {row.term}
                </button>
              ) : (
                <span className="ftc-spec-key">{row.term}</span>
              )}
            </dt>
            <dd>{row.body}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/** The model's caption beside the spec rows. */
export function ModelCaption() {
  return (
    <figcaption>
      Built in code from the team’s robot in Onshape and photos of Reaper. The model is
      incomplete. Its hubs, wiring and transfer are placed by estimate.
      <span className="reaper-hint">
        {" "}
        Drag to turn it<span className="ftc-hint-rows">, or pick a row to light up its part</span>.
      </span>
    </figcaption>
  );
}
