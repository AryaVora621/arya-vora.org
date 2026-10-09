"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";
import { ReaperDock, useReaperStage } from "@/components/ftc/ReaperStage";
import type { ReaperPartId } from "@/components/ftc/createReaperModel";

// Robot facts come from the team’s 2025-26 engineering portfolio (pages 9 to 15).
// Roles come from the 2024-25 portfolio (page 3, "Design Lead, Cadded design changes before
// building") and the 2025-26 portfolio (page 2, "Mechanical Lead, Built the robot and made
// design changes"); the founding year, the FLL team and the 2026-27 captaincy were confirmed
// by Arya himself. The page says MakEMinds "started in FIRST LEGO League as team 45814" because
// Arya's chronology is that the team had that FLL team before the FTC team existed; page 3 of
// the 2025-26 portfolio lists 45814 first among four FLL teams MakEMinds mentored, so the page
// never says MakEMinds "has" or "runs" it. Whether Arya himself was on 45814 is not confirmed,
// so the line does not say "we". Page 11 ("Subsystem Iterations") is the source of the version photos and
// of what changed between versions. The code is not Arya’s: the team repository’s authors
// are Meer, Arnav Doshi and Saiganesh, so the programming credit goes to "the programming
// team". The WorldsRobo Onshape document is the team’s, and incomplete.
// Event results are from FIRST’s event pages and FTCScout, checked 2026-10-08.
// Images are cut from the portfolio by scripts/prepare-ftc-images.mjs; the real-robot strip's
// four cut-outs (Reaper, the shooter and the two iterations) by
// assets-src/reaper-img2threejs/tools/prepare-real-robot.mjs, which keeps only the robot, pulls
// the cut edge in past the page white and the team's own halo, and feathers it.
// They are already sized for the page, so they are served as they are (unoptimized) rather than
// through /_next/image. That route reads each file through the visitor's own request, and
// `next start` keeps one pending job per image: a visitor who leaves while the job is reading
// leaves every later request for that image waiting, until the server restarts.
//
// The robot in the opener and beside the mechanisms is a procedural three.js model
// (src/components/ftc), built with the img2threejs pipeline from the team's incomplete
// WorldsRobo Onshape assembly and the photo of the finished robot. It is approximate: the hubs,
// battery, wiring and the inside of the transfer are placed by inference.
//
// What the page cannot say yet, and why. Which outtake or transfer version Arya drew himself is
// not written down anywhere: the portfolios credit him with the mechanical team's design changes
// as a whole, so the version cards describe what changed and the My part rows say what he led.
// When he supplies a line for a version, put it in that version's `mine` field and the card
// shows it. The 2026-27 row says only what is confirmed: he captains the team for BIOBUZZ.
//
// The version captions follow the portfolio's page 11 (what each version was) and page 10
// (what went wrong with the first robot). The portfolio's note that rubber bands "may break, or
// artifacts may get stuck" sits in its Intake box, so it is not attributed to the transfer here.

// The real robot, smaller, under the mechanisms. Captions say only what the portfolio shows:
// page 9 is Reaper itself, page 10 the first and third iterations, and page 8's Testing &
// Iterations photo the shooter from above with an artifact in it (the page does not say which
// iteration that shooter belongs to).
const REAL_ROBOT = [
  {
    src: "/ftc/reaper-cutout.webp",
    width: 492,
    height: 563,
    caption: "Reaper, the fifth version",
    alt: "Reaper from the front: a flywheel shooter under an adjustable hood with a Limelight camera mounted below it, above a full-width intake with mecanum rollers.",
  },
  {
    src: "/ftc/shooter-testing.webp",
    width: 594,
    height: 534,
    caption: "The shooter in testing, from above",
    alt: "Looking down into a black printed shooter: an artifact sits beside the flywheel, with a motor along one side and wiring below.",
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

type SpecKey = "shooter" | "aiming" | "intake" | "protection" | "code";

/** Which parts of the 3D model each spec row lights up. */
const SPEC_PARTS: Record<SpecKey, readonly ReaperPartId[]> = {
  shooter: ["shooter"],
  aiming: ["aiming"],
  intake: ["intake", "transfer"],
  protection: ["protection"],
  code: ["electronics"],
};

/** The row a click on the model selects. The drivetrain has no row of its own. */
const PART_SPEC: Record<ReaperPartId, SpecKey | null> = {
  drive: null,
  intake: "intake",
  transfer: "intake",
  shooter: "shooter",
  aiming: "aiming",
  protection: "protection",
  electronics: "code",
};

const MODEL_LABEL =
  "A 3D model of Reaper built from the team’s CAD and photos: a flywheel shooter under an adjustable hood with a Limelight camera below it, above a full-width intake with mecanum wheels, between wooden side plates.";
const MODEL_DETAIL_LABEL =
  "The same 3D model of Reaper. Choosing a row below lights up that part of the robot.";

type Version = {
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

const OUTTAKE: readonly Version[] = [
  {
    name: "V1",
    src: "/ftc/outtake-v1.webp",
    width: 364,
    height: 432,
    alt: "A large black flywheel on a gearmotor, bolted to a perforated metal plate.",
    label: "Simple flywheel",
    text: "One wheel on a metal mount, spun to launch. The artifact had no guide, so shots were inconsistent.",
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
    text: "A servo tilts the shooter to change the trajectory, so the robot can score from more than one distance.",
  },
  {
    name: "V4",
    src: "/ftc/outtake-v4.webp",
    width: 302,
    height: 253,
    alt: "A top-down view of a black printed shooter housing with a gearmotor on each side of the wheel.",
    label: "Two motors, compact",
    text: "A second motor on the other side of the wheel, in a smaller housing. More power from a smaller shooter.",
  },
];

const TRANSFER: readonly Version[] = [
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

const ROLES = [
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
    text: "I led the mechanical team that built Reaper and made its design changes, including the outtake and transfer versions under Iterations. Teammates helped build and rig the outtake, wired the electronics and managed the 3D printing.",
  },
  {
    when: "2026-27",
    role: "Captain",
    text: "I captain the team for BIOBUZZ, the 2026-27 game.",
  },
] as const;

type Row = {
  date: string;
  event: string;
  record: string;
  result: string;
  /** Shown in the short list that leads Results; every row stays in the full ledger. */
  highlight?: boolean;
};
type Season = { id: string; title: string; note: string; rows: Row[] };

const SEASONS: Season[] = [
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
        highlight: true,
        date: "2025-02-15",
        event: "Upper Central League Tournament, Union NJ",
        record: "3-2",
        result: "Think Award, 1st place. Inspire Award, 3rd place. Ranked 4th of 25.",
      },
      {
        highlight: true,
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

const EVENT_COUNT = SEASONS.reduce((count, season) => count + season.rows.length, 0);

// The short list is newest first. Two rows share 2026-03-15, so the later row in the data (the
// final) comes first.
const HIGHLIGHTS: Row[] = SEASONS.flatMap((season) => season.rows)
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
      {"\u00a0"}
      {unit}
    </>
  );
}

const SPEC_ROWS: { key: SpecKey; term: string; body: ReactNode }[] = [
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
        Limelight for aiming and flywheel speed. It runs an 18-artifact autonomous.
        Its autonomous success rate rose from 52% to 92% as localization moved from motor
        encoders to odometry pods and then to the Pinpoint.
      </>
    ),
  },
];

function LedgerHead() {
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

function LedgerRows({ rows }: { rows: readonly Row[] }) {
  return (
    <tbody>
      {rows.map((row) => (
        <tr key={`${row.date}-${row.event}`}>
          <td className="ftc-date mono">{row.date}</td>
          <th scope="row">{row.event}</th>
          <td className="ftc-record">{row.record}</td>
          <td>{row.result}</td>
        </tr>
      ))}
    </tbody>
  );
}

// The version photos are small: the team placed them in its portfolio at 130 to 190 ppi. Every
// photo sits in the same 4 by 3 frame, cropped to fit, so the eight read as one set, with its
// caption beside it. Each row of photos drifts together.
function VersionRow({
  id,
  title,
  intro,
  versions,
}: {
  id: string;
  title: string;
  intro: string;
  versions: readonly Version[];
}) {
  return (
    <section className="ftc-sub" aria-labelledby={id}>
      <div className="ftc-sub-head">
        <h4 id={id}>{title}</h4>
        <p>{intro}</p>
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
                <span className="ftc-step-text">{version.text}</span>
                {version.mine ? <span className="ftc-step-mine">{version.mine}</span> : null}
              </figcaption>
            </figure>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function FtcSection() {
  const root = useRef<HTMLElement>(null);
  const motion = useMotionAllowed();

  // A spec row lights up its part of the model while it is hovered or focused, and stays lit
  // when clicked (aria-pressed). A click on the model selects the row for that part.
  const [hovered, setHovered] = useState<SpecKey | null>(null);
  const [pinned, setPinned] = useState<SpecKey | null>(null);
  const onPick = useCallback((id: ReaperPartId | null) => {
    setPinned(id ? PART_SPEC[id] : null);
  }, []);
  const selected = hovered ?? pinned;
  const focus = useMemo(() => (selected ? SPEC_PARTS[selected] : null), [selected]);
  // The spec rows are buttons only where the model draws. Without a script, without WebGL, on a
  // software renderer, or before the model is first built, they would be controls that change
  // nothing, so those visitors get the plain terms, and nothing claims to show a part.
  const drawable = useReaperStage(root, { focus, onPick });
  const active = drawable ? selected : null;

  useEffect(() => {
    const section = root.current;
    if (!motion || !section) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // The robot climbs past its name while the name slides the other way.
      const opener = section.querySelector<HTMLElement>(".ftc-opener");
      const scrub = { trigger: opener, start: "top bottom", end: "bottom top", scrub: true };
      gsap.fromTo(
        "[data-ftc-robot]",
        { yPercent: 9 },
        { yPercent: -9, ease: "none", scrollTrigger: scrub },
      );
      gsap.fromTo(
        "[data-ftc-name]",
        { xPercent: 2 },
        { xPercent: -5, ease: "none", scrollTrigger: scrub },
      );

      // Each pair of version photos drifts together, and the real-robot strip at its own rate.
      gsap.utils.toArray<HTMLElement>("[data-ftc-depth]").forEach((element) => {
        const distance = Number(element.dataset.ftcDepth) || 20;
        gsap.fromTo(
          element,
          { y: distance },
          {
            y: -distance,
            ease: "none",
            scrollTrigger: {
              trigger: element,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      });
    }, section);

    return () => ctx.revert();
  }, [motion]);

  return (
    <section
      ref={root}
      id="ftc"
      tabIndex={-1}
      className="ftc-section"
      aria-labelledby="ftc-title"
    >
      <div className="ftc-opener site-shell">
        <div className="ftc-name" data-ftc-name>
          <h2 id="ftc-title">Reaper</h2>
        </div>
        <figure className="ftc-hero">
          <div className="ftc-hero-robot" data-ftc-robot>
            <ReaperDock className="ftc-hero-dock" label={MODEL_LABEL} />
          </div>
          <figcaption className="reaper-hint">Drag to turn it.</figcaption>
        </figure>
        <div className="ftc-intro">
          <p className="ftc-lede">
            Reaper is the robot my team, FTC 23786 MakEMinds, built for DECODE, the 2025-26
            game. At the New Jersey Championship it went 5-0 in qualification, and our
            alliance won the Parkway Division before losing the state final. At the FIRST
            Championship it went 5-5 in the Ross Division.
          </p>
        </div>
      </div>

      <div className="ftc-block ftc-mine site-shell">
        <div className="ftc-mine-head">
          <h3>My part</h3>
        </div>
        <ol className="ftc-roles">
          {ROLES.map((entry) => (
            <li key={entry.when}>
              <span className="ftc-role-when mono">{entry.when}</span>
              <span className="ftc-role-name">{entry.role}</span>
              <span className="ftc-role-text">{entry.text}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="ftc-block ftc-mechanisms site-shell" data-reaper-track>
        <h3 className="ftc-mechanisms-title">Mechanisms</h3>
        <figure className="ftc-model">
          <ReaperDock className="ftc-model-dock" label={MODEL_DETAIL_LABEL} />
          {/* On phones the model rides at the top of the screen while the rows scroll under it,
              and ftc.css moves this caption after the rows (see the 760px block). There the
              row half of the hint is said once, above the rows, by .ftc-spec-cue instead. */}
          <figcaption>
            Built in code from the team’s robot in Onshape and photos of Reaper. The model is
            incomplete, so the hubs, wiring and transfer are placed by estimate.
            <span className="reaper-hint">
              {" "}
              Drag to turn it<span className="ftc-hint-rows">, or pick a row to light up its part</span>.
            </span>
          </figcaption>
        </figure>
        {drawable && (
          <p id="ftc-spec-hint" className="ftc-visually-hidden">
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
                if (drawable && event.pointerType === "mouse") setHovered(row.key);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse") setHovered(null);
              }}
            >
              <dt>
                {drawable ? (
                  <button
                    type="button"
                    className="ftc-spec-key"
                    aria-pressed={pinned === row.key}
                    aria-describedby="ftc-spec-hint"
                    onFocus={() => setHovered(row.key)}
                    onBlur={() => setHovered(null)}
                    onClick={() => setPinned((current) => (current === row.key ? null : row.key))}
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
      </div>

      <div className="ftc-block ftc-real site-shell">
        <div className="ftc-sub-head">
          <h4>The real robot</h4>
          <p>Reaper as the team built it, with the shooter in testing and two earlier iterations.</p>
        </div>
        <ul className="ftc-real-strip">
          {REAL_ROBOT.map((photo) => (
            <li key={photo.src}>
              <figure>
                <div className="ftc-real-photo" data-ftc-depth="6">
                  <Image
                    className="theme-tint"
                    src={photo.src}
                    width={photo.width}
                    height={photo.height}
                    unoptimized
                    alt={photo.alt}
                  />
                </div>
                <figcaption>{photo.caption}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
        <p className="ftc-credit">Photos: Team 23786 MakEMinds</p>
      </div>

      <div className="ftc-block ftc-iterations site-shell">
        <div className="ftc-iterations-copy">
          <h3>Iterations</h3>
          <p>
            Reaper is the fifth version of the robot. The first had an unstable shooter and a chain
            transfer too weak to move artifacts reliably. It had to turn its whole body to shoot,
            and shooting in one fixed direction made it easy to defend. Over the season the outtake
            and the transfer each went through four versions.
          </p>
        </div>

        <VersionRow
          id="ftc-outtake"
          title="Outtake"
          intro="The shooter started as one wheel on a metal mount and ended as a compact unit with two motors."
          versions={OUTTAKE}
        />
        <VersionRow
          id="ftc-transfer"
          title="Transfer"
          intro="The transfer moves artifacts from the intake up to the shooter."
          versions={TRANSFER}
        />
        <p className="ftc-credit">Photos: Team 23786 MakEMinds</p>
      </div>

      {/* .ftc-table is the shared look. .ftc-ledger marks the three season tables only, so
          the highlights table that leads Results is not counted as a season. */}
      <div className="ftc-block ftc-results site-shell">
        <h3>Results</h3>
        <table className="ftc-table ftc-highlights">
          <caption className="ftc-visually-hidden">Highlights, newest first</caption>
          <LedgerHead />
          <LedgerRows rows={HIGHLIGHTS} />
        </table>
        <details className="ftc-all">
          <summary>All {EVENT_COUNT} events, season by season</summary>
          {SEASONS.map((season) => (
            <table className="ftc-table ftc-ledger" key={season.id}>
              <caption>
                {season.title} <span>{season.note}</span>
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
      </div>
    </section>
  );
}
