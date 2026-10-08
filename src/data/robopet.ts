// roboPet parts and build log for the roboPet section.
//
// Sources, read 2026-10-08:
// - README: gh api repos/AryaVora621/roboPet/readme (Hardware table, Progress Log, Status).
// - Dated entries: devlogs/DEVLOG.md and "ai/humanized daily logs/" in the same repo.
//   Day 1 2026-06-26, Day 3 2026-07-03, Day 4 2026-07-04, Day 5 and Day 6 2026-07-06,
//   Day 7 2026-07-09, Day 8 2026-07-10 to 11.
//
// A build log entry is one date with one or two short paragraphs, the way a log kept by hand
// groups a day's work. The word "yet" belongs to the section intro; part rows say what a part
// is or what it has done.
//
// Text inside `backticks` is a part number or code and renders in the mono face. Measurements
// stay in the sans with a no-break space (\u00a0) before the unit, because Atkinson Mono gives
// the decimal point a full cell and "7.2 V" read as three separate characters.
// Re-check every line against the README before changing a number here.

export type PartKey = "shell" | "face" | "camera" | "electronics" | "power" | "legs" | "chassis";

export type Part = {
  key: PartKey;
  label: string;
  /** Mesh ids in the model that belong to this part. */
  modelIds: readonly string[];
  /** Sits inside the shell, so the model has to come apart before it can be seen. */
  inside?: boolean;
  detail: string;
};

export type BuildLogEntry = {
  /** Machine-readable start date for the time element. */
  date: string;
  /** What the page shows. */
  label: string;
  /** One paragraph per piece of work that day, in the order it happened. */
  paragraphs: readonly string[];
};

export const ROBOPET_REPO_URL = "https://github.com/AryaVora621/roboPet";
export const ROBOPET_LOG_URL = "https://github.com/AryaVora621/roboPet/blob/main/devlogs/DEVLOG.md";

// Seven rows, matching the seven parts in the model, in the order the model is read top down.
export const PARTS: readonly Part[] = [
  {
    key: "shell",
    label: "Shell",
    modelIds: ["shell-top", "status-led"],
    // README hardware table: one WS2812 for status and mood. The README never mentions a printed
    // shell (only the chassis and legs), and the model's shell comes from the concept render, so
    // the row says it has not been printed. Arya to confirm. The README does not say where the LED
    // sits; the model puts it on the shell.
    detail: "A rounded top cover with one `WS2812` LED for status and mood. It has not been printed.",
  },
  {
    key: "face",
    label: "OLED face",
    modelIds: ["face"],
    // README hardware table ("The face: animated expressions"); Progress Log: the orientation
    // cube from the MPU6050 on the SSD1306 (Day 5); Day 1 drew the first faces.
    detail: "An `SSD1306` OLED for the face. So far it has drawn test faces and the IMU orientation cube.",
  },
  {
    key: "camera",
    label: "PiCam",
    modelIds: ["camera"],
    // Future Goals: the Zero 2W peripheral smoke test for the PiCam is unchecked.
    detail: "Camera module for the Pi Zero 2W, which has not been tested yet.",
  },
  {
    key: "electronics",
    label: "Pico and Zero 2W",
    modelIds: ["electronics"],
    inside: true,
    // README hardware table and Progress Log. The Pico drove two servos from the MPU6050 on the
    // bench (the gyroscope test), and the UART bridge was verified there; wiring the Pico to the
    // servos on the chassis and re-establishing the bridge on the assembled robot are both
    // unchecked, so the row says what happened on the bench and nothing about the frame.
    detail:
      "A Raspberry Pi Pico running MicroPython drives servo PWM and reads the `MPU6050` IMU on the bench. The Pi Zero 2W will take the camera, audio and RC. Its UART link to the Pico has only run off the robot.",
  },
  {
    key: "power",
    label: "Power",
    modelIds: ["power"],
    inside: true,
    // README hardware table and Architecture: salvaged 3-cell laptop pack, inline fuse and
    // switch, two XL4016 bucks for a servo rail and a logic rail.
    detail:
      "A salvaged 3-cell laptop pack, with an inline fuse and switch, feeds two `XL4016` buck converters: about 7.2\u00a0V for the servos and 5.0\u00a0V for logic.",
  },
  {
    key: "legs",
    label: "Legs",
    modelIds: ["leg-fl", "leg-fr", "leg-rl", "leg-rr"],
    // README hardware table: "PLA chassis & legs (printed on A1 Mini)" and 12x MG996R. The servo
    // counts (12 planned, 8 on the MVP frame) live once, in the figure caption beside the toggle
    // in RoboPetSection.tsx, so this row does not repeat them.
    detail: "Printed PLA legs driven by `MG996R` servos.",
  },
  {
    key: "chassis",
    label: "Chassis",
    modelIds: ["shell-bottom"],
    // Progress Log, Day 8: Onshape CAD with mounts for 8 servos, MPU6050, Pico and Zero 2W;
    // printed on the A1 Mini; partial assembly. The CAD, printer and assembly are in the build
    // log, so this row only says what the part is.
    detail: "The printed PLA frame for the MVP, with mounts for the servos, the IMU and both boards.",
  },
];

// Newest first, at most eight. Failures stay in. Work from the same day sits under one date.
export const BUILD_LOG: readonly BuildLogEntry[] = [
  {
    date: "2026-07-10",
    label: "2026-07-10 and 11",
    paragraphs: [
      "Designed the MVP chassis in Onshape, printed it on the A1 Mini and started bolting parts on. Some servos, the `MPU6050` and the Pico are mounted. The Zero 2W has a spot but isn't installed.",
    ],
  },
  {
    date: "2026-07-09",
    label: "2026-07-09",
    paragraphs: [
      "Built a servo tester on an old ESP32 so I can check each `MG996R` before mounting it. I had already lost two servos on the 7.2\u00a0V rail. `MG996R` clones are often rated for only 4.8\u00a0V to 6.0\u00a0V, so I'm looking at bringing the rail down toward 6\u00a0V.",
      "Then, while wiring a second servo to the tester, I swapped VCC and GND with the power on. The ESP32 DevKit smoked and won't boot, and the servo is probably dead too. Next is a reverse-polarity diode on servo VCC.",
    ],
  },
  {
    date: "2026-07-06",
    label: "2026-07-06",
    paragraphs: [
      "Gave the OLED its own I2C bus and drew a live 3D orientation cube from the `MPU6050`. Full-frame writes timed out on the breadboard until I split them into 256-byte chunks.",
      "Later that day I got the live PID-tuning dashboard running between the Zero and the Pico over USB serial. Start commands kept getting lost. Logging the lines I had been throwing away showed why: under servo load a brownout dropped the Pico's USB every 10 to 40 seconds and restarted the program.",
    ],
  },
  {
    date: "2026-07-04",
    label: "2026-07-04",
    paragraphs: [
      "Moved from one ESP32 to two boards. I flashed MicroPython v1.23.0 to the Pico over SWD and reached its REPL wirelessly through the Zero once I crossed TX and RX on the UART.",
    ],
  },
  {
    date: "2026-07-03",
    label: "2026-07-03",
    paragraphs: [
      "Blocking calls in the ESP32's web server froze its control loop, so a two-servo tracker stalled and fell out of sync with its web page. I rewrote it as a non-blocking state machine with time-delta kinematics and held servo updates to 50\u00a0Hz.",
    ],
  },
  {
    date: "2026-06-26",
    label: "2026-06-26",
    paragraphs: [
      "Built and tuned the power system first. Then I booted an ESP32 from the 5.0\u00a0V rail, got the LED working and drew the first faces on the OLED, inspired by the Sesame robot.",
    ],
  },
];
