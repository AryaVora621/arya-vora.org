import type { Project } from "./types";

// CoreXY printer frames.
//
// Sources, read 2026-10-09: the Onshape documents Ender5CoreXY (element TopSystem) and AccCoreXY
// (element V1 DIY CoreXY), both last modified in 2025, as rendered in assets-src/cad-v2; the
// Ender 5 caption is the CAD gallery's verified one, and the DIY frame's describes only what
// its render shows. Orochi: github.com/AryaVora621/orochi (README, docs/V1.0-BOM.md) and its
// CHECKPOINT_LAST.md of 2026-07-13, which says no hardware work has started; the repository has
// not been pushed since. The BOM's first build is two tools; the README's six-tool machine is
// deferred, so it is not mentioned.
//
// The timeline's Onshape entries carry only a year: the documents record when they were last
// modified, not when each frame was drawn, and nothing says which came first. Orochi's date is
// the day of its commits (2026-07-13, the only day there are any) and of its checkpoint.
//
// Nothing here says either frame was built: there is no evidence either way, so the page calls
// them CAD and stops there. The one line on how CoreXY works is general knowledge, so a reader
// knows why both motors sit on the frame.
export const corexy: Project = {
  slug: "corexy",
  title: "CoreXY printer frames",
  category: "Hardware",
  tab: "CoreXY",
  year: "2025",
  status: "CAD in Onshape",
  summary:
    "Two CoreXY 3D printer frames I drew in Onshape: a top gantry that converts an Ender 5, and a frame drawn from scratch in aluminum extrusion.",
  cover: {
    src: "/cad/ender5corexy-topsystem.webp",
    alt: "Square printer gantry of aluminum extrusion with linear rails, belts, a carriage in the middle and printed corner blocks.",
    width: 1800,
    height: 866,
    caption:
      "Ender 5 CoreXY gantry. The top frame for converting an Ender 5 to CoreXY, from 2020 extrusion, linear rails and printed corners, with the belts and carriage in place.",
    tint: true,
  },
  stack: ["Onshape", "Aluminum extrusion"],
  links: [{ label: "Orochi on GitHub", href: "https://github.com/AryaVora621/orochi" }],
  blocks: [
    {
      kind: "text",
      body: [
        "A CoreXY printer moves its print head with two long belts driven by two motors bolted to the frame, so neither motor rides on a moving axis and the moving parts stay light.",
        "In 2025 I drew two of these in Onshape. One is a top frame that turns an Ender 5 into a CoreXY machine. The other starts from nothing: a cube of aluminum extrusion with the motors on top.",
      ],
    },
    {
      kind: "image",
      size: "inset",
      image: {
        src: "/cad/acccorexy-v1-diy-corexy.webp",
        alt: "A cube frame of aluminum extrusion braced with triangular printed gussets, with a stepper motor on two of its top corners.",
        width: 1476,
        height: 1498,
        caption:
          "DIY CoreXY, version 1. A cube of aluminum extrusion squared up with printed gussets. Stepper motors sit on two top corners and pulley blocks on the other two; the gantry is not drawn yet.",
        tint: true,
      },
    },
    {
      kind: "text",
      heading: "Orochi",
      body: [
        "Orochi, from 2026, is a plan to rebuild an Ender 5 Pro as a CoreXY toolchanger on Klipper, with magnetic tool docks. It builds on two open-source designs, ZeroG Mercury One.1 and StealthChanger.",
        "Its repository holds the design documents and a parts list for a first version with two tools. No hardware has been built for it yet.",
      ],
    },
    {
      kind: "timeline",
      heading: "Dates",
      items: [
        {
          date: "2025",
          text: "The Ender 5 top frame, drawn in Onshape from 2020 extrusion, linear rails and printed corners.",
        },
        {
          date: "2025",
          text: "The DIY frame, version 1, drawn from scratch in Onshape.",
        },
        {
          date: "2026-07-13",
          text: "Orochi starts: its README, a design plan and a parts list for two tools are committed. The checkpoint that day says planning only, and nothing newer is logged.",
        },
      ],
    },
  ],
};
