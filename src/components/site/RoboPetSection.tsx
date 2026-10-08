"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { canRunLiveModel } from "@/components/robopet/gpu";
import { RoboPetFigure } from "@/components/robopet/RoboPetFigure";
import { RoboPetFilm } from "@/components/robopet/RoboPetFilm";
import {
  BUILD_LOG,
  PARTS,
  ROBOPET_LOG_URL,
  ROBOPET_REPO_URL,
  type PartKey,
} from "@/data/robopet";

// Data strings wrap part numbers and code in backticks; those runs get the mono face.
function withMono(text: string): ReactNode[] {
  return text
    .split("`")
    .map((chunk, index) =>
      index % 2 === 1 ? (
        <span key={index} className="mono">
          {chunk}
        </span>
      ) : (
        chunk
      ),
    );
}

// The boards and the battery sit inside the shell, so picking one of them takes the model apart;
// otherwise the press would change nothing a visitor can see.
const INSIDE = new Set(PARTS.filter((part) => part.inside).map((part) => part.key));

// Below 1024px the parts table stacks under the figure, so the model can be far off screen
// while a row is pressed. From 1024px up the table sits beside it.
const STACKED = "(max-width: 1023.98px)";

// The words on the canvas that RoboPetFigure draws. The stand-in below says the same words, so
// the keyboard path reads the same before the model loads and after.
const MODEL_LABEL =
  "roboPet 3D model. Drag sideways or press the arrow keys to turn it. Home resets the view.";

// Clear space kept between a revealed stage or row and the screen edge.
const MARGIN = 16;
// A focused row stays at least this far inside the screen, so its 2px ring and 2px offset show.
const FOCUS_RING = 8;

const subscribeNever = () => () => {};

// False on the server and through hydration, so a control that needs script renders disabled
// until it can work, and stays disabled with JavaScript off.
function useHydrated() {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}

function subscribeStacked(onChange: () => void) {
  const query = matchMedia(STACKED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useStacked() {
  return useSyncExternalStore(subscribeStacked, () => matchMedia(STACKED).matches, () => false);
}

export function RoboPetSection() {
  const [selected, setSelected] = useState<PartKey | null>(null);
  const [exploded, setExploded] = useState(false);
  const hydrated = useHydrated();
  const stacked = useStacked();
  // The box around RoboPetFigure. It stands in for the canvas as a Tab stop until the canvas
  // exists, and it is what a press scrolls into view.
  const stageRef = useRef<HTMLDivElement>(null);
  // RoboPetFigure appends its canvas only once the live model is drawing. Before that, and for
  // good on software GPUs, it shows a still. Rows are buttons either way (the still has one per
  // part), but only the live model can be dragged, so the caption hint waits for it.
  const [live, setLive] = useState(false);
  // Whether this device can run the live model, found out shortly after hydration. Until then, and
  // for good on software GPUs, no stand-in stop is offered: it would lead to nothing.
  const [capable, setCapable] = useState(false);

  useEffect(() => {
    // After hydration has settled, so opening a throwaway WebGL context never competes with it.
    const id = window.setTimeout(() => setCapable(canRunLiveModel()), 300);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const check = () => {
      const canvas = stage.querySelector("canvas");
      setLive(canvas !== null);
      // Focus reached the stand-in before the canvas existed (a keyboard visitor tabbing
      // forward gets here long before the model loads). Hand it over, so the next arrow key
      // turns the model instead of nothing.
      if (canvas && document.activeElement === stage) canvas.focus();
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(stage, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // The model is the first Tab stop after the repository link, loaded or not. RoboPetFigure
  // mounts its canvas only when the stage is near the screen, and the film sits between the
  // link and the stage, so the canvas does not exist yet when a forward Tab passes its place.
  // The box stands in for it until it does. Once the canvas exists the box is no longer a stop,
  // so Shift+Tab from the canvas does not land on it and bounce back.
  const standIn = capable && !live;

  const passFocusOn = (event: FocusEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) event.currentTarget.querySelector("canvas")?.focus();
  };

  const select = (key: PartKey | null) => {
    setSelected(key);
    if (key && INSIDE.has(key)) setExploded(true);
  };

  // Scroll by whatever it takes to bring the span [top, bottom] on screen: its top if it is
  // taller than the screen, otherwise the nearer edge. Nothing moves when it is already at least
  // `edge` px inside the screen.
  const scrollToShow = (top: number, bottom: number, edge = 0) => {
    if (top >= edge && bottom <= innerHeight - edge) return;
    const fits = bottom - top <= innerHeight - 2 * MARGIN;
    const delta = !fits || top < 0 ? top - MARGIN : bottom - innerHeight + MARGIN;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollBy({ top: delta, behavior: still ? "instant" : "smooth" });
  };

  // A pressed row brings the model on screen, so the visitor sees the part light up. Where the
  // stage and the row fit on screen together (a tablet, the first rows on a phone, any wide
  // screen) the page moves only as far as that takes, so the row stays under the finger. Where
  // they do not, a tap on a phone scrolls up to the stage, and a keyboard or screen reader
  // press (a click with no pointer, detail 0) stays where it is: the focused row stays on
  // screen with its ring, and the caption under the model names the part.
  const revealStage = (row: HTMLElement, fromKeyboard: boolean) => {
    const stage = stageRef.current;
    if (!stage) return;
    const s = stage.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    const top = Math.min(s.top, r.top);
    const bottom = Math.max(s.bottom, r.bottom);
    if (bottom - top <= innerHeight - 2 * MARGIN) scrollToShow(top, bottom);
    else if (fromKeyboard) scrollToShow(r.top, r.bottom, FOCUS_RING);
    else scrollToShow(s.top, s.bottom);
  };

  // Late layout (a font, or the readout's margin landing a frame late under reduced motion, from
  // the global 0.01ms transition) can move the row just after the first scroll. For half a
  // second the figure's size is watched, and each change is followed.
  const stopFollowing = useRef<(() => void) | null>(null);
  useEffect(() => () => stopFollowing.current?.(), []);

  const reveal = (row: HTMLElement, fromKeyboard: boolean) => {
    stopFollowing.current?.();
    revealStage(row, fromKeyboard);
    const figure = stageRef.current?.parentElement;
    if (!figure) return;
    let first = true;
    const watcher = new ResizeObserver(() => {
      // The first callback only reports the size the figure already has.
      if (first) first = false;
      else if (row.isConnected) revealStage(row, fromKeyboard);
    });
    watcher.observe(figure);
    const timer = window.setTimeout(() => stopFollowing.current?.(), 500);
    stopFollowing.current = () => {
      watcher.disconnect();
      window.clearTimeout(timer);
      stopFollowing.current = null;
    };
  };

  const pressRow = (key: PartKey | null, event: MouseEvent<HTMLButtonElement>) => {
    const row = event.currentTarget;
    const fromKeyboard = event.detail === 0;
    select(key);
    if (!key) return;
    // Next frame, once React has committed the new caption.
    requestAnimationFrame(() => {
      if (row.isConnected) reveal(row, fromKeyboard);
    });
  };

  // In the stacked layout the selected row can be far from the stage, so its name and note
  // also show under the model. Beside the table on wide screens they would only repeat it.
  const readout = stacked && selected ? PARTS.find((part) => part.key === selected) : undefined;

  return (
    <section id="robopet" aria-labelledby="robopet-heading" className="robopet">
      <div className="wrap">
        <h2 id="robopet-heading">roboPet</h2>

        <div className="robopet-intro prose">
          {/* Draft from the roboPet README (summary, architecture and Status) and the devlog
              (Day 3: "build off the open-source sesame-robot quadruped design", then "graduating
              from the ESP32 and transitioning to a dual-board architecture"), for Arya to
              confirm. Sesame itself runs on one ESP32 (its README: ESP32-based controller, 8
              MG90 servos, 2 per leg, an OLED face), so the two boards are where roboPet differs
              from it, and the sentence says so. The header links straight here, so the paragraph
              says what roboPet is and why it exists before where it stands. The board roles live
              in the parts table, the servo counts in the figure caption and the dates in the
              build log. */}
          <p>
            roboPet is a four-legged robot I&apos;m building to learn mechatronics. It started
            from the open-source Sesame robot, a quadruped that runs on one ESP32 and has an OLED
            face. I moved the control onto two boards. The robot hasn&apos;t stood up yet: next I
            wire the Pico to the servos and the IMU on the printed frame and try a first stand.
          </p>
          <p>
            <a href={ROBOPET_REPO_URL}>roboPet repository</a>
          </p>
        </div>
      </div>

      {/* The film runs full width and sets its own wrap inside. */}
      <div className="robopet-film">
        <RoboPetFilm />
      </div>

      <div className="wrap">
        <div className="robopet-model grid">
          <figure className="robopet-figure">
            <div
              ref={stageRef}
              tabIndex={standIn ? 0 : undefined}
              role={standIn ? "group" : undefined}
              aria-label={standIn ? MODEL_LABEL : undefined}
              onFocus={passFocusOn}
            >
              <RoboPetFigure selected={selected} exploded={exploded} onSelect={select} />
            </div>
            <div className="robopet-figure-controls">
              {/* The label names the view a press switches to, so it is an action, not a
                  pressed state. */}
              <button
                type="button"
                className="button robopet-toggle"
                disabled={!hydrated}
                onClick={() => setExploded((value) => !value)}
              >
                {exploded ? "Show assembled view" : "Show exploded view"}
              </button>
            </div>
            {/* Polite, so a part picked in the stacked layout is read out once. The readout
                only renders there, so wide screens never announce it. */}
            <figcaption
              className={readout ? "robopet-figure-caption prose" : "robopet-figure-caption"}
              aria-live="polite"
            >
              {readout ? (
                <p className="robopet-figure-readout">
                  {readout.label}. {withMono(readout.detail)}
                </p>
              ) : null}
              <p>
                The model shows the planned twelve-servo design. The frame on my desk is built
                for eight.
                {/* The part names look like plain text and the model has no visible handle, so
                    once the live model is drawing the caption says what a visitor can do with
                    them. The still cannot be dragged, so the hint waits for the model. aria-hidden keeps
                    this live region from announcing it when the model loads; the canvas label
                    already tells screen reader users how to turn the model. */}
                {live ? (
                  <span aria-hidden="true">
                    {" "}
                    Drag the model sideways to turn it, or press a part name to find that part.
                  </span>
                ) : null}
              </p>
            </figcaption>
          </figure>

          {/* Once the page is interactive each row header is a button, so the table and the
              model are one control. With the live model a press fills the part in; with the
              still (software GPU, no WebGL, a lost context) it swaps in the still captured with
              that part filled in. Without JavaScript the names are plain text. The explicit
              roles keep table semantics in browsers that drop them once the rows are restyled
              to stack. */}
          <table className="robopet-parts" role="table">
            <caption className="visually-hidden">roboPet parts</caption>
            <tbody role="rowgroup">
              {PARTS.map((part) => {
                const pressed = selected === part.key;
                return (
                  <tr key={part.key} role="row" className="robopet-part">
                    <th scope="row" role="rowheader" className="robopet-part-name">
                      {hydrated ? (
                        <button
                          type="button"
                          className="button robopet-part-button"
                          aria-pressed={pressed}
                          onClick={(event) => pressRow(pressed ? null : part.key, event)}
                        >
                          {part.label}
                        </button>
                      ) : (
                        <span className="robopet-part-label">{part.label}</span>
                      )}
                    </th>
                    <td role="cell" className="robopet-part-detail">
                      {withMono(part.detail)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="robopet-log grid">
          <div className="robopet-log-body">
            <h3>Build log</h3>
            {/* list-style: none drops list semantics in Safari, so role="list" puts them back. */}
            <ol reversed role="list" className="robopet-log-list">
              {BUILD_LOG.map((entry) => (
                <li key={entry.date} className="robopet-log-entry">
                  <time dateTime={entry.date} className="meta">
                    {entry.label}
                  </time>
                  {/* One wrapper, so the entry stays two grid cells (date, text) however many
                      paragraphs the day has. */}
                  <div className="prose">
                    {entry.paragraphs.map((text) => (
                      <p key={text}>{withMono(text)}</p>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
            <p className="robopet-log-more">
              <a href={ROBOPET_LOG_URL}>Full devlog</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
