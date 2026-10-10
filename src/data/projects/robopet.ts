import type { Project } from "./types";

// roboPet, the four-legged robot Arya is building on his own.
//
// Sources, read 2026-10-09: the roboPet README (gh api repos/AryaVora621/roboPet/readme; the
// repository was last pushed 2026-07-11), its Progress Log and Status, and the v7 page's
// verified copy (src/data/robopet.ts at the v7-bw-snapshot tag). Checked boxes in the README
// are things done; unchecked ones (2-link IK, gait generation, the Zero 2W smoke tests, the
// 12-servo chassis) are described as not done.
//
// The film and the parts view are a concept render (the film's own caption says so), so the
// status text says once that they show the plan, not the printed frame. The Onshape gallery
// holds Arya's first chassis and, labelled as such, the open-source Sesame robot, which
// devlogs/DEVLOG.md (Day 3) says roboPet builds off; Sesame is not his design. Sesame runs on
// one ESP32 (dorianborian/sesame-robot README), and the same Day 3 entry moves roboPet from the
// ESP32 to a Pi Zero 2W and a Pico, so nothing here credits Sesame for the two boards. Totebot,
// in the same Onshape document, is left out because its authorship is not confirmed.
export const robopet: Project = {
  slug: "robopet",
  title: "roboPet",
  category: "Robotics",
  tab: "roboPet",
  year: "2026",
  status: "Chassis printed, not walking yet",
  summary:
    "A four-legged robot I’m building to learn mechatronics, on a Raspberry Pi Pico and a Pi Zero 2W. The 8-servo frame is printed and partly assembled.",
  cover: {
    src: "/robopet/hero-still.webp",
    alt: "Concept render of roboPet: a four-legged robot with a rounded shell and an OLED face.",
    width: 1278,
    height: 1066,
    tint: true,
  },
  // The film below opens on this same render, straight under the page header, so the page leaves
  // the cover to the preview cards.
  hideCoverOnPage: true,
  role: "Design and build",
  stack: ["Onshape", "Raspberry Pi Pico", "Pi Zero 2W", "MicroPython"],
  links: [
    { label: "Code on GitHub", href: "https://github.com/AryaVora621/roboPet" },
    {
      label: "Devlog",
      href: "https://github.com/AryaVora621/roboPet/blob/main/devlogs/DEVLOG.md",
    },
  ],
  blocks: [
    // The page opens on the film, straight under the header. Where the project stands follows it,
    // then the parts, the build log and the CAD.
    //
    // Each story has one home on this page. The film is shared with the home page, which has no
    // build log, so it keeps its four beats and its outro as they are, and the servo counts, the
    // two lost servos and the orientation cube can come up there a second time. The parts view
    // takes `brief` and gives each part's role or rating, leaving the incidents to the build log.
    // Where it stands has what is mounted on the chassis now and the one bench test the log does
    // not cover; the build log has the dated work (the print, the I2C chunks, the crossed UART
    // wires, the servo tester and the swapped power wires).
    { kind: "custom", component: "robopet-film", props: { hideIntro: true } },
    {
      kind: "text",
      heading: "Where it stands",
      body: [
        "Some servos, the IMU and the Pico are mounted on the MVP chassis. The Zero 2W has a mount but is not installed.",
        "On the bench, the Pico has held two servos level from the IMU with a PID loop. Walking still needs inverse kinematics for each leg and a gait, and neither is written yet.",
        "The film above and the parts view below show the planned robot as a concept render, not the printed frame.",
      ],
    },
    { kind: "custom", component: "robopet-exploded", props: { brief: true } },
    { kind: "custom", component: "robopet-build-log" },
    {
      kind: "gallery",
      heading: "In Onshape",
      items: [
        {
          src: "/cad/quadruped-oldv1.webp",
          alt: "Round shallow chassis with four servo pockets on the rim, a second servo beside each, and small boards in the middle.",
          width: 2140,
          height: 1116,
          caption:
            "roboPet’s first chassis. Each leg has two servos, one in a pocket on the rim and a second hanging off it. The middle of the plate has to fit a Pi Zero 2W, a Pico, a camera and an IMU.",
          tint: true,
        },
        {
          src: "/cad/quadruped-sesame-esp32-v123.webp",
          alt: "A small four-legged robot with printed legs, eight servos around a central battery, and an OLED screen on the front.",
          width: 1714,
          height: 1512,
          caption:
            "The open-source Sesame robot, an ESP32 quadruped that roboPet’s design starts from, in the same Onshape document. It is not my design.",
          tint: true,
        },
      ],
    },
    {
      kind: "specs",
      heading: "Bill of materials",
      rows: [
        { label: "Real-time board", value: "Raspberry Pi Pico running MicroPython" },
        { label: "Main board", value: "Raspberry Pi Zero 2W, for the camera, audio and RC" },
        { label: "Link", value: "UART between the two boards" },
        { label: "Servos", value: "MG996R, eight on the MVP frame, twelve planned" },
        { label: "IMU", value: "MPU6050" },
        { label: "Face", value: "SSD1306 OLED, 128 by 64" },
        { label: "Status light", value: "One WS2812 LED" },
        {
          label: "Power",
          value: "Salvaged 3-cell laptop pack, two XL4016 buck converters at about 7.2\u00a0V and 5.0\u00a0V",
        },
        { label: "Frame", value: "PLA, printed on a Bambu A1 Mini" },
      ],
    },
  ],
};
