import type { Project } from "./types";

// Mediapad, a macro pad for Hack Club's Hackpad program.
//
// Sources, read 2026-10-09: github.com/AryaVora621/mediapad README (parts table, firmware,
// "all traces routed by hand", the progress checklist) and its commit list (every commit is
// 2026-06-07), the Onshape document Mediapad (last modified 2026-06-10) as rendered in
// assets-src/cad-v2, mediapad.vercel.app (HTTP 200) and, above all, the KiCad files in
// ~/Desktop/Personal Projects/Mediapad/Mediapad.
//
// The board, its renders and the schematic come from the working copy of those files
// (Mediapad.kicad_pcb and .kicad_sch, saved by KiCad 10), not from the commit on GitHub. The
// commit (192b8ad, 2026-06-07 11:01) holds an earlier draft: a portrait board with no screen
// header. The working copy is the board Arya exported: its Gerber job file and drill files
// (MediapadPaths/, written 2026-06-07 12:50 by KiCad 10.0.3) hold the same 29 plated holes as the
// working copy, the four of the OLED header among them, and a board 88.55 by 60.55 mm. The pcb
// file was saved again on 2026-06-08. The README, written before that export, still lists "add
// OLED to PCB revision" as open; the files already carry the header, wired to the XIAO's SDA (D4)
// and SCL (D5) and powered from its 5V and GND pins (kicad-cli netlist, 2026-10-09). What is
// still open is the display code ("get the OLED showing track info").
//
// The renders were made with kicad-cli 10.0.6 (pcb render, sch export svg) and graded to gray:
// gray is the red channel with a gamma, which separates the tan traces from the green mask far
// better than luminance does. The GitHub repository does not have this board yet, so the "Code on
// GitHub" link leads to an older draft of it.
//
// "Ordered from JLCPCB" is the README's line, written before the Gerber export, and nothing else
// records an order, so the page says the Gerbers were exported for JLCPCB and nothing more. The
// README calls case version 1 "just a box"; the page says only that version 1 is drawn and
// version 2 is unfinished. Dates come from file times and commits, so they are the day work was
// saved, not the day it started.
export const mediapad: Project = {
  slug: "mediapad",
  title: "Mediapad",
  category: "Hardware",
  tab: "Mediapad",
  year: "2026",
  status: "PCB designed, not soldered yet",
  summary:
    "A three-key USB media controller with a volume knob and a header for a small screen, for Hack Club’s Hackpad program. The PCB and a first case are designed.",
  cover: {
    src: "/cad/mediapad-assembly-1.webp",
    alt: "Flat rectangular macro pad with three keycaps in a row, a round knob beside them and a small screen window.",
    width: 1800,
    height: 940,
    tint: true,
  },
  stack: ["KiCad", "Onshape", "XIAO RP2040", "KMK"],
  links: [
    { label: "Code on GitHub", href: "https://github.com/AryaVora621/mediapad" },
    { label: "Project page", href: "https://mediapad.vercel.app" },
  ],
  blocks: [
    {
      kind: "text",
      body: [
        "Mediapad plugs in over USB-C and shows up as a keyboard, with no driver to install. Its three MX switches play or pause and skip back or forward, and an EC11 encoder sets the volume, with a click to mute.",
        "A Seeed XIAO RP2040 runs KMK, keyboard firmware written in CircuitPython. Changing a key means editing one file on the board. I drew the schematic in KiCad, laid out the two-layer PCB, routed every trace by hand and exported the Gerber files for JLCPCB.",
        "The board has a header for a 128x32 OLED between the knob and the XIAO, wired to the XIAO’s I2C pins, and the printed case, drawn in Onshape, leaves a window for it.",
      ],
    },
    {
      kind: "image",
      size: "wide",
      image: {
        src: "/projects/mediapad-board-angle.webp",
        alt: "The Mediapad circuit board at an angle: the rotary encoder footprint at the left, a long screen outline with a four-pin header in the middle, the XIAO footprint at the right, three key switch holes along the front and my name in silkscreen along the bottom edge.",
        width: 1800,
        height: 1073,
        caption: "The bare board, rendered from my KiCad files.",
        tint: true,
      },
    },
    {
      kind: "gallery",
      heading: "Both sides",
      items: [
        {
          src: "/projects/mediapad-board-front.webp",
          alt: "The front of the board, flat: the encoder at the left, the screen header in the middle, the XIAO at the right and three key switch holes along the bottom, joined by thin traces, with four mounting holes in the corners.",
          width: 1700,
          height: 1162,
          caption:
            "Front, with the parts side up. The keys sit along the bottom edge and the traces run up to the XIAO.",
          tint: true,
        },
        {
          src: "/projects/mediapad-board-back.webp",
          alt: "The back of the board, flat and mirrored: the XIAO's two rows of pads at the left, the screen header in the middle and the encoder's pads at the right, with a few traces on the bottom layer.",
          width: 1700,
          height: 1162,
          caption: "Back, mirrored, with the XIAO’s pads at the left.",
          tint: true,
        },
      ],
    },
    {
      kind: "image",
      size: "inset",
      image: {
        src: "/projects/mediapad-board-schematic.webp",
        alt: "The Mediapad schematic: the XIAO module on top, wired to a rotary encoder with a push switch, three push switches and the OLED module below.",
        width: 1696,
        height: 2294,
        caption:
          "The schematic. Each key and the encoder’s click pull a XIAO pin to ground, the encoder’s A and B go to D1 and D0, and the screen takes SDA and SCL on D4 and D5.",
        tint: true,
      },
    },
    {
      kind: "specs",
      heading: "Parts",
      rows: [
        { label: "Microcontroller", value: "Seeed XIAO RP2040, USB-C" },
        { label: "Firmware", value: "KMK on CircuitPython" },
        { label: "Keys", value: "Three MX-compatible switches" },
        { label: "Knob", value: "EC11 rotary encoder, 20 detents, with a click" },
        { label: "Display", value: "SSD1306 OLED, 128x32, I2C, on a four-pin header on the board" },
        { label: "PCB", value: "Two layers, 88.55 by 60.55 mm, KiCad, Gerbers for JLCPCB" },
        { label: "Case", value: "3D printed, drawn in Onshape" },
      ],
    },
    {
      kind: "timeline",
      heading: "Dates",
      items: [
        {
          date: "2026-06-07",
          text: "The first commit to the GitHub repository, with the README and the project page at mediapad.vercel.app.",
        },
        {
          date: "2026-06-07",
          text: "The schematic is finished, the board is routed and the Gerber files for JLCPCB are exported.",
        },
        {
          date: "2026-06-10",
          text: "Latest edit to the case in Onshape. Version 1 is drawn; version 2 is unfinished.",
        },
      ],
    },
    {
      kind: "specs",
      heading: "Still to do",
      rows: [
        { label: "Case", value: "Finish the version 2 redesign" },
        { label: "Build", value: "Solder the board and test it" },
        { label: "Screen", value: "Write the display code so it shows the current track" },
      ],
    },
  ],
};
