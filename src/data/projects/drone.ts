import type { ImageRef, Project } from "./types";

// The ESP32 quadcopter.
//
// Sources, read 2026-10-09, all in github.com/AryaVora621/drone (public): DEVLOG.md (Sessions 1
// to 5 and Issues 1 to 20), CHECKPOINT_LAST.md (2026-07-25), FLIGHT_LOG.md (one GO entry on
// 2026-07-21 with a blank post-flight section), PROJECT_GOALS.md, human_notes.md and the commit
// list (last commits 2026-09-12 and 2026-09-14, local time). The frame captions are the CAD gallery's
// verified ones; the one-piece frame's caption sits under the cover, so the page shows each
// frame once.
//
// What the page does not say, and why: which of the two frames flew is not recorded, so neither
// is named as the one that flew. The plan's weight, thrust and range figures were never
// measured, so none are quoted. No flight after the crash is logged, and the 2026-07-25
// checkpoint leaves the ESP-NOW link unconfirmed, so the page says it has not flown again.
// The crash: DEVLOG.md's "Maiden flight and crash" says the pilot oversteered and flipped the
// frame, and leaves open whether the roll and pitch rates need a tune or the flip was purely
// piloting (PROJECT_GOALS.md has that judgment call unchecked). The 2026-07-25 checkpoint is
// headed "CRITICAL BUG & ROOT CAUSE OF 180° FLIP FIXED" for the cross-wired motor outputs. No
// source names the pilot. So the 2026-07-18 row says it flipped and that the notes put it down
// to oversteering at the time, the 2026-07-25 row states the remap as it is, and the page does
// not settle the cause.
// A bench photo of the real drone, for the picture after the first paragraph. The page shows the
// drone only as CAD until there is one. To add it: grade the photo to grayscale, save it as a WebP
// in public/projects/, then fill this in; the page marks it up for the violet theme itself.
//
//   const BENCH_PHOTO: ImageRef | null = {
//     src: "/projects/drone-bench.webp",
//     width: 1600,
//     height: 1200,
//     alt: "The drone on my bench: ...",
//     caption: "On the bench after the crash, 2026-07",
//     tint: true,
//   };
const BENCH_PHOTO: ImageRef | null = null;

export const drone: Project = {
  slug: "drone",
  title: "ESP32 quadcopter",
  category: "Hardware",
  tab: "Drone",
  year: "2026",
  status: "Flew once, back on the bench",
  summary:
    "A quadcopter flown by an ESP32 running esp-fc, with a second ESP32 as the transmitter. Its first flight, in July 2026, lasted several minutes and ended in a crash.",
  cover: {
    src: "/cad/drone-test-frame-v2-v17.webp",
    alt: "Flat quadcopter frame seen from above at an angle, with a motor and a three-blade propeller at each corner.",
    width: 1800,
    height: 791,
    caption:
      "Frame, one piece. The whole frame is one flat part, with the motors and three-blade props modeled in place. A bent arm means replacing all of it.",
    tint: true,
  },
  stack: ["ESP32", "esp-fc", "ESP-NOW", "Onshape"],
  links: [{ label: "Code on GitHub", href: "https://github.com/AryaVora621/drone" }],
  blocks: [
    {
      kind: "text",
      body: [
        "The drone flies on esp-fc, an open-source flight firmware for the ESP32 that is set up through Betaflight Configurator. An ESP32 with an MPU6050 is the flight controller, and it drives four A2212 motors through SimonK ESCs from a 3S LiPo.",
        "My transmitter is a second ESP32 that reads two joysticks and an arm button and talks to the drone over ESP-NOW. I drew two frames for it in Onshape.",
      ],
    },
    ...(BENCH_PHOTO ? [{ kind: "image" as const, size: "wide" as const, image: BENCH_PHOTO }] : []),
    {
      kind: "image",
      size: "wide",
      image: {
        src: "/cad/drone-test-india-test.webp",
        alt: "X-shaped drone frame with four bolt-on arms, a base plate, a top plate and a small camera mount.",
        width: 1800,
        height: 855,
        caption:
          "Frame, bolted together. The arms are separate parts between a base plate and a top plate, and each can be replaced on its own. It follows Peon230 on Thingiverse.",
        tint: true,
      },
    },
    {
      kind: "specs",
      heading: "Parts",
      rows: [
        { label: "Flight controller", value: "ESP32 DevKitC V4 with an MPU6050 IMU" },
        { label: "Firmware", value: "esp-fc, configured in Betaflight Configurator" },
        { label: "Motors", value: "Four A2212 2200KV" },
        { label: "ESCs", value: "Four SimonK 30A" },
        { label: "Battery", value: "3S LiPo, with a buck converter at 5 V for the ESP32" },
        { label: "Radio", value: "ESP-NOW between two ESP32 boards with external antennas" },
        { label: "Transmitter", value: "ESP32 with two joysticks and a push-to-arm button" },
      ],
    },
    {
      kind: "timeline",
      heading: "Log",
      items: [
        {
          date: "2026-07-13",
          text: "First bench test: one motor and ESC, throttled from a web page served by the ESP32. After a calibration step at boot, the ESC read the stop signal as about 45% throttle, and the motor tore out of my grip and shot across the room. I took the calibration step out.",
        },
        {
          date: "2026-07-14",
          text: "With a three-blade prop on, the motor cut out above about 40% throttle. The protection board in my homemade 18650 pack was tripping on current, so the drone moved to a 3S LiPo.",
        },
        {
          date: "2026-07-17",
          text: "Mounted all four motors and added a guided ESC calibration page. The same day, esp-fc and the ESP-NOW link to the transmitter came up on the bench.",
        },
        {
          date: "2026-07-18",
          text: "Four bugs blocked the first powered test in turn. The throttle stick rested at half throttle, an arming rule could never switch on, the radios had no antennas attached, and an arming flag latched for good.",
        },
        {
          date: "2026-07-18",
          text: "With those fixed, it flew untethered for several minutes, then flipped and broke two propellers. My notes put it down to oversteering at the time.",
        },
        {
          date: "2026-07-21",
          text: "Reprinted the props and the frame plates. A preflight tool now checks the flight controller’s settings and walks a checklist before each flight; it logged a go on the bench.",
        },
        {
          date: "2026-07-25",
          text: "Found the four motor outputs mapped to the wrong corners in the flight controller’s settings, which sent its corrections to the wrong motors. Remapped them and spin-tested each corner.",
        },
        {
          date: "2026-09-12",
          text: "Added diagnostics for the ESP-NOW link, which had not come back after the rebuild, and two days later clamped the transmitter’s throttle range. No second flight is logged yet.",
        },
      ],
    },
  ],
};
