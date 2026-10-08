"use client";

import { useBestScore } from "@/lib/hooks/useBestScore";
import { useCallback, useEffect, useRef, useState } from "react";

const SLUG = "free-throw";
const SHOTS = 10;
const BASE_WIDTH = 0.22;
const MIN_WIDTH = 0.06;
const BASE_SPEED = 0.9; // meter widths per second

type Shot = "make" | "miss";

function zoneFor(streak: number) {
  const width = Math.max(MIN_WIDTH, BASE_WIDTH * 0.85 ** streak);
  const center = width / 2 + Math.random() * (1 - width);
  return { center, width };
}

export function FreeThrow() {
  const [shots, setShots] = useState<Shot[]>([]);
  const [running, setRunning] = useState(false);
  const [best, recordBest] = useBestScore(SLUG);
  const [zone, setZone] = useState({ center: 0.5, width: BASE_WIDTH });
  const [last, setLast] = useState<Shot | null>(null);

  const needle = useRef<HTMLDivElement>(null);
  const pos = useRef(0);
  const dir = useRef(1);
  const speed = useRef(BASE_SPEED);

  const makes = shots.filter((s) => s === "make").length;
  const done = shots.length >= SHOTS;
  let streak = 0;
  for (let i = shots.length - 1; i >= 0 && shots[i] === "make"; i--) streak++;

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      let p = pos.current + dir.current * speed.current * dt;
      if (p > 1) {
        p = 2 - p;
        dir.current = -1;
      } else if (p < 0) {
        p = -p;
        dir.current = 1;
      }
      pos.current = p;
      if (needle.current) needle.current.style.left = `${p * 100}%`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  const start = useCallback(() => {
    setShots([]);
    setLast(null);
    setZone(zoneFor(0));
    speed.current = BASE_SPEED;
    pos.current = 0;
    dir.current = 1;
    setRunning(true);
  }, []);

  const shoot = useCallback(() => {
    if (!running) return;
    const hit = Math.abs(pos.current - zone.center) <= zone.width / 2;
    const result: Shot = hit ? "make" : "miss";
    const nextShots = [...shots, result];
    const nextStreak = hit ? streak + 1 : 0;
    setShots(nextShots);
    setLast(result);
    speed.current = BASE_SPEED * (1 + nextStreak * 0.12);
    if (nextShots.length >= SHOTS) {
      setRunning(false);
      recordBest(nextShots.filter((s) => s === "make").length);
    } else {
      setZone(zoneFor(nextStreak));
    }
  }, [running, shots, streak, zone, recordBest]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || !running) return;
      e.preventDefault();
      shoot();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [running, shoot]);

  if (!running && !done) {
    return (
      <div className="game-stage game-intro">
        <p>
          A needle sweeps across the meter. Stop it inside the green window to sink the shot. Each
          make in a row narrows the window and speeds the needle up; a miss resets both.
        </p>
        <button className="primary-button" onClick={start}>
          Start
        </button>
        {best > 0 && <p className="game-best">Best: {best} / {SHOTS}</p>}
      </div>
    );
  }

  return (
    <div className="game-stage">
      <div className="game-scorebar" aria-live="polite">
        <span>
          Shot {Math.min(shots.length + 1, SHOTS)} / {SHOTS}
        </span>
        <span>
          Makes {makes} · Streak {streak}
        </span>
      </div>
      <div className="meter" aria-hidden="true">
        <div
          className="meter-zone"
          style={{
            left: `${(zone.center - zone.width / 2) * 100}%`,
            width: `${zone.width * 100}%`,
          }}
        />
        <div className="meter-needle" ref={needle} />
      </div>
      <ol className="shot-track" aria-label="Shot results">
        {Array.from({ length: SHOTS }, (_, i) => (
          <li key={i} data-state={shots[i]}>
            <span className="sr-only">{shots[i] ?? "pending"}</span>
          </li>
        ))}
      </ol>
      <p className="game-flash" role="status">
        {last === "make" ? "Swish." : last === "miss" ? "Rim out." : " "}
      </p>
      {done ? (
        <div className="game-result">
          <p>
            {makes} / {SHOTS} from the line. Best is {best}.
          </p>
          <button className="primary-button" onClick={start} autoFocus>
            Shoot again
          </button>
        </div>
      ) : (
        <button className="primary-button shoot-button" onClick={shoot}>
          Shoot <kbd>Space</kbd>
        </button>
      )}
    </div>
  );
}
