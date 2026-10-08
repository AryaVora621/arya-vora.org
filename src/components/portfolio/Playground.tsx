"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  CELL_STATES,
  type CellStateKey,
  cellStateClass,
  DEFAULT_OBSTACLES,
  findPath,
  GOAL,
  GRID_SIZE,
  moveCell,
  START,
} from "@/lib/playground";

const SOURCE_URL =
  "https://github.com/AryaVora621/arya-vora.org/blob/main/src/lib/playground.ts";

// Milliseconds per animation frame: one frame per explored cell, then one per route cell.
const EXPLORE_MS = 16;
const ROUTE_MS = 48;

const NAVIGATION_KEYS = new Set([
  "ArrowRight",
  "ArrowLeft",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
]);

const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

// False in the server HTML (and so with JavaScript off), true once the page is live.
const subscribeNever = () => () => {};

// Numbers in the status line are measurements, so they use the mono face.
const measure = { fontFamily: 'var(--font-mono), "Atkinson Mono Fallback", monospace' };

// Maps each cell to its position in a list, so a cell can ask when it appears.
function indexCells(cells: readonly number[] = []) {
  return new Map<number, number>(cells.map((cell, index) => [cell, index]));
}

// Legend swatches mirror the cell styles in portfolio.css (.lab-swatch). They do not carry
// the `.path-cell` classes, so anything that counts grid cells by class sees only the 49
// real buttons. The Record type makes a new cell state fail to compile until it has a swatch.
const SWATCHES: Record<CellStateKey, string> = {
  start: "lab-swatch lab-swatch--start",
  goal: "lab-swatch lab-swatch--goal",
  wall: "lab-swatch lab-swatch--wall",
  explored: "lab-swatch lab-swatch--explored",
  route: "lab-swatch lab-swatch--route",
};

function Swatch({ state }: { state: (typeof CELL_STATES)[number] }) {
  return (
    <span aria-hidden="true" className={SWATCHES[state.key]}>
      {state.key === "route" ? <span className="lab-swatch-dot" /> : state.glyph}
    </span>
  );
}

// A cell's name is its position, plus "start" or "goal" for the two fixed ones. Whether a
// cell is a wall is its pressed state, so the name never repeats it: a screen reader says
// "Row 2, column 2, toggle button, pressed" rather than naming the state twice.
function cellName(cell: number) {
  const position = `Row ${Math.floor(cell / GRID_SIZE) + 1}, column ${(cell % GRID_SIZE) + 1}`;
  if (cell === START) return `${position}, start`;
  if (cell === GOAL) return `${position}, goal`;
  return position;
}

function PathLab() {
  const [obstacles, setObstacles] = useState(() => new Set(DEFAULT_OBSTACLES));
  const [result, setResult] = useState<ReturnType<typeof findPath> | null>(
    null,
  );
  // One counter drives the whole animation: the first `visited.length` frames reveal
  // explored cells in search order, the frames after that reveal the route.
  const [frame, setFrame] = useState(0);
  // Only one cell is a tab stop; the arrow keys move between the rest.
  const [active, setActive] = useState(START);
  const grid = useRef<HTMLDivElement>(null);
  // Until the page is live the buttons would do nothing, so they are inert: no tab stop,
  // no click, and nothing for a screen reader to announce. With scripting off,
  // interaction.css hides them and the note below takes their place.
  const live = useSyncExternalStore(subscribeNever, () => true, () => false);

  const exploredCount = result?.visited.length ?? 0;
  const total = result ? exploredCount + result.path.length : 0;
  const running = result !== null && frame < total;
  const routeShown = Math.max(0, frame - exploredCount);

  const exploredAt = useMemo(() => indexCells(result?.visited), [result]);
  const routeAt = useMemo(() => indexCells(result?.path), [result]);

  useEffect(() => {
    if (!result || frame >= total) return;
    const timer = window.setTimeout(
      () => setFrame((current) => current + 1),
      frame < exploredCount ? EXPLORE_MS : ROUTE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [result, frame, total, exploredCount]);

  // If the visitor turns on reduced motion mid-search, show the finished result.
  useEffect(() => {
    if (!running) return;
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const finish = () => {
      if (query.matches) setFrame(total);
    };
    query.addEventListener("change", finish);
    return () => query.removeEventListener("change", finish);
  }, [running, total]);

  const edit = (cell: number) => {
    if (cell === START || cell === GOAL) return;
    setResult(null);
    setFrame(0);
    setObstacles((previous) => {
      const next = new Set(previous);
      if (next.has(cell)) next.delete(cell);
      else next.add(cell);
      return next;
    });
  };

  const run = () => {
    const next = findPath(obstacles);
    setResult(next);
    setFrame(reducedMotion() ? next.visited.length + next.path.length : 0);
  };

  const clear = () => {
    setObstacles(new Set());
    setResult(null);
    setFrame(0);
  };

  const states = (cell: number): CellStateKey[] => {
    const keys: CellStateKey[] = [];
    if (cell === START) keys.push("start");
    else if (cell === GOAL) keys.push("goal");
    else if (obstacles.has(cell)) keys.push("wall");
    else {
      const explored = exploredAt.get(cell);
      if (explored !== undefined && explored < frame) keys.push("explored");
      const route = routeAt.get(cell);
      if (route !== undefined && route < routeShown) keys.push("route");
    }
    return keys;
  };

  let status: React.ReactNode;
  if (!result) {
    status = "Select cells to add walls. Arrow keys move between cells.";
  } else if (running) {
    status = "Searching for the shortest route.";
  } else if (!result.path.length) {
    status = "No route available. Remove a wall and try again.";
  } else {
    status = (
      <>
        <span style={measure}>{result.path.length - 1}</span> moves and{" "}
        <span style={measure}>{result.visited.length}</span> cells explored.
        Goal reached.
      </>
    );
  }

  return (
    <article className="lab-card">
      <div className="lab-copy">
        <h2 id="playground-title">Breadth-first search</h2>
        <p>
          The first route to reach the goal is a shortest one, because the search
          explores cells in order of their distance from the start.
        </p>
        <ul className="lab-legend" role="list" aria-label="Legend">
          {CELL_STATES.map((state) => (
            <li key={state.key}>
              <Swatch state={state} />
              {state.label}
            </li>
          ))}
        </ul>
        <noscript>
          <p className="lab-nojs">The grid needs JavaScript. The code is linked below.</p>
        </noscript>
      </div>
      <div
        ref={grid}
        className="path-grid"
        role="group"
        aria-label="Breadth-first search grid"
        aria-describedby="path-grid-help"
        inert={!live}
        onKeyDown={(event) => {
          const current = Number((event.target as HTMLElement).dataset.cell);
          if (!NAVIGATION_KEYS.has(event.key) || !Number.isInteger(current))
            return;
          // Arrow keys would otherwise scroll the page.
          event.preventDefault();
          grid.current
            ?.querySelector<HTMLButtonElement>(
              `[data-cell="${moveCell(current, event.key)}"]`,
            )
            ?.focus();
        }}
      >
        <span id="path-grid-help" className="sr-only">
          A pressed cell is a wall. The start and the goal cannot be changed.
        </span>
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, cell) => {
          const keys = states(cell);
          const wall = keys.includes("wall");
          const endpoint = cell === START || cell === GOAL;
          const glyph = keys
            .map((key) => CELL_STATES.find((state) => state.key === key)?.glyph)
            .find(Boolean);
          return (
            <button
              type="button"
              data-cell={cell}
              key={cell}
              tabIndex={cell === active ? 0 : -1}
              className={["path-cell", ...keys.map(cellStateClass)].join(" ")}
              onClick={() => edit(cell)}
              onFocus={() => setActive(cell)}
              aria-label={cellName(cell)}
              aria-pressed={endpoint ? undefined : wall}
              aria-disabled={endpoint || undefined}
            >
              {glyph}
            </button>
          );
        })}
      </div>

      <div className="lab-actions">
        <div className="lab-controls" inert={!live}>
          <button type="button" className="primary-button" onClick={run}>
            {result ? "Run again" : "Find path"}
          </button>
          <button type="button" className="secondary-button" onClick={clear}>
            Clear walls
          </button>
        </div>
        <p className="lab-status" role="status">
          {status}
        </p>
        <a
          className="text-link"
          href={SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Source on GitHub<span className="sr-only"> for the path lab</span>
        </a>
      </div>
    </article>
  );
}

export function Playground() {
  return (
    <section
      id="playground"
      tabIndex={-1}
      className="playground-section"
      aria-labelledby="playground-title"
    >
      <div className="site-shell">
        <PathLab />
      </div>
    </section>
  );
}
