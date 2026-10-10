import { useId } from "react";
import { PartText } from "./PartText";
import type { FrameImage } from "./framePhoto";
import styles from "./RoboPetBuildLog.module.css";

/*
  roboPet's build log, the robopet-build-log block of /projects/robopet. A whole <section> with
  its own h2 and .site-shell, like RoboPetFilm and RoboPetExploded, so the page renders it full
  width between them and the rest.

  Sources, read 2026-10-08 (carried over from the v7 page, src/data/robopet.ts at the
  v7-bw-snapshot tag): the README's Progress Log (gh api repos/AryaVora621/roboPet/readme),
  devlogs/DEVLOG.md and "ai/humanized daily logs/" in the same repo. Day 1 2026-06-26, Day 3
  2026-07-03, Day 4 2026-07-04, Day 5 and Day 6 2026-07-06, Day 7 2026-07-09, Day 8 2026-07-10
  to 11. The repository was last pushed on 2026-07-11, so nothing newer is logged.

  An entry is one date with one or two short paragraphs, the way a log kept by hand groups a
  day's work. Failures stay in. Text inside `backticks` is a part number or code and renders in
  the mono face; measurements stay in the sans with a no-break space before the unit.
*/

type BuildLogEntry = {
  /** Machine-readable start date for the time element. */
  date: string;
  /** What the page shows. */
  label: string;
  /** One paragraph per piece of work that day, in the order it happened. */
  paragraphs: readonly string[];
};

/**
 * Bench photos for the log, keyed by an entry's `date`. It is empty until Arya's photos are in:
 * the log would show a picture under the day the work was done, such as the printed frame
 * under 2026-07-10, and an entry with no photo shows none. Fill it in with the same fields as
 * the film's closing picture (framePhoto.ts), grayscale, a WebP in public/robopet/:
 *
 *   "2026-07-10": {
 *     src: "/robopet/frame-bench-sm.webp",
 *     width: 1200,
 *     height: 900,
 *     alt: "The printed roboPet frame on a desk with the Pico and some servos mounted.",
 *     caption: "The frame on my bench",
 *   },
 *
 * Use a different shot from the film's, so the page does not show one picture twice.
 */
const ENTRY_PHOTOS: Readonly<Record<string, FrameImage>> = {};

const LOG_URL = "https://github.com/AryaVora621/roboPet/blob/main/devlogs/DEVLOG.md";

// Newest first.
const BUILD_LOG: readonly BuildLogEntry[] = [
  {
    date: "2026-07-10",
    label: "2026-07-10 and 11",
    paragraphs: [
      "Designed the MVP chassis in Onshape, printed it on the A1 Mini and started bolting parts on.",
    ],
  },
  {
    date: "2026-07-09",
    label: "2026-07-09",
    paragraphs: [
      "Built a servo tester on an old ESP32 so I can check each `MG996R` before mounting it. I had already lost two servos on the 7.2 V rail. `MG996R` clones are often rated for only 4.8 to 6.0 V, so I'm looking at bringing the rail down toward 6 V.",
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
      "Blocking calls in the ESP32's web server froze its control loop, so a two-servo tracker stalled and fell out of sync with its web page. I rewrote it as a non-blocking state machine with time-delta kinematics and held servo updates to 50 Hz.",
    ],
  },
  {
    date: "2026-06-26",
    label: "2026-06-26",
    paragraphs: [
      "Built and tuned the power system first. Then I booted an ESP32 from the 5.0 V rail, got the LED working and drew the first faces on the OLED, inspired by the Sesame robot.",
    ],
  },
];

export function RoboPetBuildLog({ heading = "Build log" }: { heading?: string }) {
  const titleId = useId();
  return (
    <section className={styles.block} aria-labelledby={titleId}>
      <div className={`site-shell ${styles.shell} ${styles.layout}`}>
        <div className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {heading}
          </h2>
          <p>Newest first, from the devlog in the roboPet repository, with what broke.</p>
        </div>
        <div className={styles.main}>
          {/* list-style: none drops list semantics in Safari, so role="list" puts them back. */}
          <ol reversed role="list" className={styles.list}>
            {BUILD_LOG.map((entry) => {
              const photo = ENTRY_PHOTOS[entry.date];
              return (
                <li key={entry.date} className={styles.entry}>
                  <time dateTime={entry.date} className={`mono ${styles.date}`}>
                    {entry.label}
                  </time>
                  <div className={styles.body}>
                    {entry.paragraphs.map((text) => (
                      <p key={text}>
                        <PartText text={text} />
                      </p>
                    ))}
                    {photo && (
                      <figure className={styles.photo}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- grayscale bench photo */}
                        <img
                          className="theme-tint"
                          src={photo.src}
                          srcSet={photo.srcSet}
                          sizes="(max-width: 760px) 80vw, 440px"
                          alt={photo.alt}
                          width={photo.width}
                          height={photo.height}
                          loading="lazy"
                          decoding="async"
                        />
                        <figcaption>{photo.caption}</figcaption>
                      </figure>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          <p className={styles.more}>
            <a href={LOG_URL} target="_blank" rel="noopener noreferrer">
              Full devlog on GitHub
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
