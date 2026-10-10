import type { Project } from "./types";

// Five smaller models from Arya's Onshape documents, shown as a captioned gallery.
//
// Sources, read 2026-10-09: the renders in assets-src/cad-v2 (each caption says what its render
// shows, looked at one by one), the Onshape document list for the years (the year each document
// was last modified) and the v8.1 CAD gallery (src/components/portfolio/CadGallery.tsx at commit
// 5d301fe, since removed), whose verified captions cover the lovebox, MycoVent and the FRC task
// and whose notes say it held only models Arya drew and that the claw is unfinished. The lovebox
// note is the one place the page says "I drew".
//
// Each model is a heading and its picture with a caption. Two models carry a short note, each
// for something the render cannot show: the lovebox's parts (an ATmega328P board, a 9 V battery
// and a 16x2 LCD), in a paragraph, and the claw's status (unfinished, the gripper not drawn), as
// its caption. The FRC task, the two-servo head and MycoVent had paragraphs that only described
// the render under them, and they are gone. No caption or alt text says what a part does when
// only its shape suggests it (which servo turns or tilts what is not recorded). Nothing records
// what MycoVent is for or what the 2025 FRC task asked, so the page does not guess a purpose;
// those are questions for Arya. Whether any of these was printed or built is not recorded
// either, so the status says they are drawn.
//
// The cover, public/cad/bench-models.webp, is the five renders set side by side on one sheet (made
// from the files in public/cad; nothing is redrawn), and the page opens on it. Its caption names
// no years: the five are not points on a scale. The models then follow in the order of their
// years. The lovebox is a text block and an inset picture; the other four are galleries of one
// picture, which put the heading in the rail beside it.
//
// The FRC render's ball is a green sphere in Onshape. scripts/prepare-cad-images.mjs shades it a
// mid grey, darker than the arm (it was drawn as near-clear glass, which read as a black hole on
// the page), and the sheet was rebuilt with that tile on 2026-10-09 at the same placements.
//
// The tab says Onshape models, not "Smaller designs", which did not say what the page holds.
export const bench: Project = {
  slug: "bench",
  title: "Onshape models",
  category: "Hardware",
  tab: "Onshape models",
  year: "2025-26",
  status: "Drawn in Onshape",
  summary:
    "Five smaller models from my Onshape documents, among them a heart-shaped lovebox with an LCD on its lid and a two-servo head with an ultrasonic sensor on the front.",
  cover: {
    src: "/cad/bench-models.webp",
    alt: "The five models together: the heart-shaped lovebox open beside its lid, the two-servo head, the vented canister, the FRC task's arm around a grey ball, and the claw base.",
    width: 1657,
    height: 1430,
    caption: "The five models side by side.",
    tint: true,
  },
  stack: ["Onshape"],
  blocks: [
    {
      kind: "text",
      heading: "Lovebox, 2025",
      body: [
        "I drew the lovebox as a heart-shaped box in two halves. The base holds an ATmega328P board and a 9 V battery, with a cutout for a switch in its side wall, and the lid holds a 16x2 LCD on its carrier board and a button.",
      ],
    },
    {
      kind: "image",
      size: "inset",
      image: {
        src: "/cad/lovebox-assembly-1.webp",
        alt: "Heart-shaped box shown open with its lid raised above it, a circuit board and battery in the base and a two-line LCD and a button on the lid.",
        width: 1141,
        height: 1498,
        caption: "The lid raised above the base, with screw holes around both rims.",
        tint: true,
      },
    },
    {
      kind: "gallery",
      heading: "FRC mechanism task, 2025",
      items: [
        {
          src: "/cad/frc-mech-task-2025-assembly-1.webp",
          alt: "Curved plate arm with a wheel at each end, chain sprockets and two cylindrical gearmotors beside an upright tube, wrapped around a large grey ball.",
          width: 1800,
          height: 1417,
          caption: "Two gearmotors sit on the upright tube, with chain sprockets at the foot of the arm.",
          tint: true,
        },
      ],
    },
    {
      kind: "gallery",
      heading: "Two-servo head, 2026",
      items: [
        {
          src: "/cad/2-servo-ting-assembly-1.webp",
          alt: "A small robot head with two servos on a sloped base. Its face plate has the two transducers of an ultrasonic sensor for eyes, with a nose and a smile cut in.",
          width: 1150,
          height: 1498,
          caption:
            "The eyes are the two transducers of an ultrasonic distance sensor, with a nose and a smile cut in below them.",
          tint: true,
        },
      ],
    },
    {
      kind: "gallery",
      heading: "Custom claw, 2026",
      items: [
        {
          src: "/cad/custom-claw-assembly-1.webp",
          alt: "A box base with a round riser, a servo lying on top of it, and an L-shaped bracket holding a second servo upright.",
          width: 1226,
          height: 1498,
          caption: "The claw is unfinished: the gripper itself is not drawn.",
          tint: true,
        },
      ],
    },
    {
      kind: "gallery",
      heading: "MycoVent, 2026",
      items: [
        {
          src: "/cad/mycovent-part-studio-1.webp",
          alt: "Upright six-sided canister with a flat lid and a pointed base, the lid and the walls covered in a pattern of small hexagonal holes.",
          width: 1068,
          height: 1498,
          caption: "The lid and all six walls are cut through with a honeycomb of small hexagonal holes.",
          tint: true,
        },
      ],
    },
  ],
};
