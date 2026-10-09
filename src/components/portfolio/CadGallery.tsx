"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionAllowed } from "@/lib/hooks/useMotionAllowed";

// Shaded views from Arya’s Onshape documents, made grey by scripts/prepare-cad-images.mjs.
// Each is a product-style three-quarter view (elevation 22 degrees, azimuth 215 or 325, picked
// per model for what it shows best) rendered from assets-src/cad-v2. The images carry the class
// "theme-tint": a no-op in the black and white theme, a violet duotone in the violet theme. The
// FRC task's ball is drawn as clear glass by the script, so the arm, sprockets and gearmotors
// read before the sphere does.
//
// The gallery holds only models Arya drew. Left out on purpose: the open-source Sesame robot
// (someone else’s design), Totebot (authorship not confirmed), the custom claw (unfinished), the
// two-servo head and the second DIY CoreXY frame (weaker than the pieces kept), and WorldsRobo,
// which is the FTC team’s robot and is shown in the FTC section.
//
// MycoVent (key "mycovent-part-studio-1", a part studio from 2026) is shown with a caption that
// describes only what the render shows. Its purpose is not recorded anywhere, so the caption
// does not guess one. Add the purpose to its text once Arya says what it is for.
//
// The roboPet chassis ("quadruped-oldv1") is the only place the Onshape render of the 8-servo
// frame appears. The roboPet film's outro states once that the frame is printed and partly
// assembled, so the caption here does not repeat it.
//
// Each caption says what the model is and what is in it. None explains how a CoreXY printer
// works, and none claims a reason Arya has not given: why he drew each design the way he did is
// still his to add. The one trade-off left is read off the geometry (one-piece frame against
// bolted arms).
//
// Sources, checked 2026-10-08:
// - The renders (assets-src/cad-v2/*.png) for what each model shows.
// - The Onshape document list in the parent session for the year (the year each document was
//   last modified) and the element kind (assembly or part studio, from the Onshape element list).
// - github.com/AryaVora621/drone PROJECT_GOALS.md for the esp-fc firmware and four A2212 motors.
// - github.com/AryaVora621/mediapad README for the switches, knob, OLED and build status: the
//   PCB is ordered from JLCPCB, the case v2 redesign is unchecked, and the Onshape document was
//   last modified 2026-06-10.
// - github.com/AryaVora621/roboPet README for the 8-servo chassis (2 DOF per leg) and its boards.
// Open questions for Arya: what the 2025 FRC mechanism task asked for, which drone frame flew,
// whether the bolted frame is his own remodel of Peon230 (the drone's human_notes.md cites
// thingiverse.com/thing:3044786 as the frame source) or a model he only assembled, and what
// MycoVent is for.
// The Onshape documents are private, so nothing here links to them.

type Kind = "assembly" | "part studio";

type Piece = {
  /** File key in public/cad, set in scripts/prepare-cad-images.mjs. */
  key: string;
  name: string;
  text: string;
  kind: Kind;
  year: number;
  /** Size of public/cad/<key>.webp. The -sm file is 900 px wide. */
  width: number;
  height: number;
  /** Width of public/cad/<key>-xl.webp, a candidate for 2x screens, when the piece has one. */
  xl?: number;
  alt: string;
  /** Parallax travel as a percent of the render’s own height, each way. */
  depth: number;
  /** Optional sideways drift in percent, used once, on the lead drone. */
  drift?: number;
  sizes: string;
};

type Group = {
  id: string;
  title: string;
  note?: string;
  pieces: readonly Piece[];
};

const GROUPS: readonly Group[] = [
  {
    id: "drones",
    title: "Drone",
    note: "My ESP32 quadcopter runs esp-fc firmware on four A2212 motors. I drew two frames for it.",
    pieces: [
      {
        key: "drone-test-frame-v2-v17",
        name: "Frame, one piece",
        text: "The whole frame is one flat part, with the motors and three-blade props modeled in place. A bent arm means replacing all of it.",
        kind: "assembly",
        year: 2026,
        width: 1800,
        height: 791,
        xl: 2800,
        alt: "Flat quadcopter frame seen from above at an angle, with a motor and a three-blade propeller at each corner.",
        depth: 14,
        drift: 4,
        sizes: "(max-width: 900px) 100vw, 96vw",
      },
      {
        key: "drone-test-india-test",
        name: "Frame, bolted together",
        text: "The arms are separate parts between a base plate and a top plate, with a camera mount on top, so a broken arm can be replaced on its own. The bolted frame follows Peon230 on Thingiverse.",
        kind: "assembly",
        year: 2026,
        width: 1800,
        height: 855,
        alt: "X-shaped drone frame with four bolt-on arms, a base plate, a top plate and a small camera mount.",
        depth: 14,
        sizes: "(max-width: 900px) 100vw, 56vw",
      },
    ],
  },
  {
    id: "machines",
    title: "Machines",
    pieces: [
      {
        key: "quadruped-oldv1",
        name: "roboPet, first chassis",
        text: "Each of the four legs has two servos, one in a pocket on the rim and a second hanging off it. The middle of the plate has to fit a Pi Zero 2W, a Pico, a camera and an IMU.",
        kind: "assembly",
        year: 2026,
        width: 2140,
        height: 1116,
        alt: "Round shallow chassis with four servo pockets on the rim, a second servo beside each, and small boards in the middle.",
        depth: 10,
        sizes: "(max-width: 900px) 100vw, 70vw",
      },
      {
        key: "ender5corexy-topsystem",
        name: "Ender 5 CoreXY gantry",
        text: "The top frame for converting an Ender 5 to CoreXY, from 2020 extrusion, linear rails and printed corners, with the belts and carriage in place.",
        kind: "assembly",
        year: 2025,
        width: 1800,
        height: 866,
        alt: "Square printer gantry of aluminum extrusion with linear rails, belts, a carriage in the middle and printed corner blocks.",
        depth: 12,
        sizes: "(max-width: 900px) 100vw, 62vw",
      },
      {
        key: "frc-mech-task-2025-assembly-1",
        name: "FRC mechanism task",
        text: "A curved arm with a wheel at each end cradles a large ball, and gearmotors with chain sprockets sit on the frame.",
        kind: "assembly",
        year: 2025,
        width: 1800,
        height: 1417,
        alt: "Curved plate arm with a wheel at each end, chain sprockets and two cylindrical gearmotors beside an upright tube, around a large ball drawn as clear glass.",
        depth: 8,
        sizes: "(max-width: 900px) 100vw, 48vw",
      },
    ],
  },
  {
    id: "small",
    title: "Small builds",
    pieces: [
      {
        key: "mediapad-assembly-1",
        name: "Mediapad",
        text: "A USB media controller for Hack Club’s Hackpad program, with a rotary encoder for volume and three MX switches for play, previous and next. The case leaves a window for a 128x32 OLED. The board was ordered from JLCPCB. Case version 1 is drawn, and the version 2 redesign is unfinished.",
        kind: "assembly",
        year: 2026,
        width: 1800,
        height: 940,
        alt: "Flat rectangular macro pad with three keycaps in a row, a round knob beside them and a small screen window.",
        depth: 10,
        sizes: "(max-width: 900px) 100vw, 56vw",
      },
      {
        key: "lovebox-assembly-1",
        name: "Lovebox",
        text: "A heart-shaped box around an ATmega328P board, a 9 V battery, a 16x2 LCD and a button. The display and button are in the lid. The board and battery are in the base.",
        kind: "assembly",
        year: 2025,
        width: 1141,
        height: 1498,
        alt: "Heart-shaped box shown open with its lid raised above it, a circuit board and battery in the base and a two-line LCD and a button on the lid.",
        depth: 9,
        sizes: "(max-width: 900px) 74vw, 30vw",
      },
      {
        key: "mycovent-part-studio-1",
        name: "MycoVent",
        text: "A six-sided canister with a lid. The lid and the walls are cut through with small hexagonal holes.",
        kind: "part studio",
        year: 2026,
        width: 1068,
        height: 1498,
        alt: "Upright six-sided canister with a flat lid and a pointed base, the lid and the walls covered in a pattern of small hexagonal holes.",
        depth: 9,
        sizes: "(max-width: 900px) 74vw, 30vw",
      },
    ],
  },
];

function CadPiece({ piece, lead }: { piece: Piece; lead: boolean }) {
  const titleId = `cad-${piece.key}`;
  return (
    <figure
      className={lead ? "cad-piece is-lead" : "cad-piece"}
      data-piece={piece.key}
      data-shape={piece.width / piece.height > 1.25 ? "wide" : "tall"}
      aria-labelledby={titleId}
    >
      <div className="cad-render">
        <div
          className="cad-parallax"
          data-depth={piece.depth}
          data-drift={piece.drift}
        >
          {/* Plain img: the grey WebP sizes (900 w, full, and 2x for the lead drone) are prepared
              ahead of time, with alpha. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="theme-tint"
            src={`/cad/${piece.key}.webp`}
            srcSet={
              `/cad/${piece.key}-sm.webp 900w, /cad/${piece.key}.webp ${piece.width}w` +
              (piece.xl ? `, /cad/${piece.key}-xl.webp ${piece.xl}w` : "")
            }
            sizes={piece.sizes}
            width={piece.width}
            height={piece.height}
            alt={piece.alt}
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
      <figcaption className="cad-caption">
        <h4 id={titleId}>{piece.name}</h4>
        <p>{piece.text}</p>
        <p className="cad-meta">
          <time dateTime={String(piece.year)}>{piece.year}</time>
        </p>
      </figcaption>
    </figure>
  );
}

export function CadGallery() {
  const motion = useMotionAllowed();
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!motion || !root) return;
    gsap.registerPlugin(ScrollTrigger);

    // Each render drifts against the page at its own depth while its caption stays put,
    // so the models read as sitting at different distances from the viewer. Most of the
    // travel is upward: a render that sinks far would slide over the caption under it.
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".cad-parallax", root).forEach((layer) => {
        // Half of the authored travel: the full amount left voids between a caption and the
        // next heading.
        const depth = (Number(layer.dataset.depth) || 0) * 0.5;
        const drift = (Number(layer.dataset.drift) || 0) * 0.5;
        gsap.fromTo(
          layer,
          { yPercent: depth * 0.25, xPercent: -drift },
          {
            yPercent: -depth,
            xPercent: drift,
            ease: "none",
            scrollTrigger: {
              trigger: layer.parentElement,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
              // Pinned scenes above this section add height; measure after they do.
              refreshPriority: -1,
            },
          },
        );
      });
    }, root);

    return () => ctx.revert();
  }, [motion]);

  return (
    <section
      id="cad"
      ref={rootRef}
      tabIndex={-1}
      className="cad-section"
      aria-labelledby="cad-title"
    >
      <div className="site-shell cad-shell">
        <header className="section-heading cad-head">
          <h2 id="cad-title">CAD</h2>
          <p>Models I drew in Onshape.</p>
        </header>
        {GROUPS.map((group, groupIndex) => (
          <section
            key={group.id}
            className={`cad-group cad-group--${group.id}`}
            aria-labelledby={`cad-group-${group.id}`}
          >
            <div className="cad-spread">
              <div className="cad-group-head">
                <h3 id={`cad-group-${group.id}`}>{group.title}</h3>
                {group.note ? <p>{group.note}</p> : null}
              </div>
              {group.pieces.map((piece, index) => (
                <CadPiece
                  key={piece.key}
                  piece={piece}
                  lead={groupIndex === 0 && index === 0}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
