"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  CELL_STATES,
  DEFAULT_OBSTACLES,
  findPath,
  GRID_SIZE,
  START,
  type CellState,
} from "@/lib/playground";

// Seven cells cannot each be 44px wide inside the 288px a 320px screen leaves between its
// 16px gutters, so under 360px the board drops to 6x6. Its walls keep the 7x7 shape: a
// barrier down from the top that steps one column left, open along the bottom row.
const COMPACT = "(max-width: 359.98px)";
const COMPACT_SIZE = 6;
const COMPACT_OBSTACLES = [3, 9, 15, 14, 20, 26];

function subscribeCompact(onChange: () => void) {
  const query = matchMedia(COMPACT);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const subscribeNever = () => () => {};

function defaultWalls(size: number): ReadonlySet<number> {
  return new Set(size === COMPACT_SIZE ? COMPACT_OBSTACLES : DEFAULT_OBSTACLES);
}

// Shown instead of the status line with JavaScript off, where the cells and buttons render
// disabled.
const NO_SCRIPT = "The grid shows the starting walls. The search needs JavaScript to run.";

const LEGEND = Object.keys(CELL_STATES) as CellState[];

const EXPLORED_STEP_MS = 12;
const ROUTE_STEP_MS = 30;
const MAX_RUN_MS = 1500;

type Run = {
  /** Cells the search dequeued, in order, without the start and goal. */
  explored: number[];
  /** Route cells from start to goal, without the start and goal. */
  route: number[];
  moves: number;
  found: boolean;
};

type Shown = { explored: number; route: number };

const NOTHING_SHOWN: Shown = { explored: 0, route: 0 };

function prefersReducedMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function plural(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

export function Pathfinding() {
  // Both read false on the server and through hydration, so the first paint is the 7x7 board
  // with its controls disabled until the script can run them.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const compact = useSyncExternalStore(
    subscribeCompact,
    () => matchMedia(COMPACT).matches,
    () => false,
  );
  const size = compact ? COMPACT_SIZE : GRID_SIZE;
  const cellCount = size * size;
  const goal = cellCount - 1;

  const [walls, setWalls] = useState<ReadonlySet<number>>(() =>
    defaultWalls(GRID_SIZE),
  );
  const [run, setRun] = useState<Run | null>(null);
  const [shown, setShown] = useState<Shown>(NOTHING_SHOWN);
  const [animating, setAnimating] = useState(false);
  const [activeCell, setActiveCell] = useState(START);
  const [boardSize, setBoardSize] = useState(GRID_SIZE);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Crossing 360px swaps the board, so its walls and any run start over.
  if (boardSize !== size) {
    setBoardSize(size);
    setWalls(defaultWalls(size));
    setRun(null);
    setAnimating(false);
    setShown(NOTHING_SHOWN);
    setActiveCell(START);
  }

  useEffect(() => {
    if (!run || !animating) return;
    const total =
      run.explored.length * EXPLORED_STEP_MS + run.route.length * ROUTE_STEP_MS;
    const scale = total > MAX_RUN_MS ? MAX_RUN_MS / total : 1;
    const exploredStep = EXPLORED_STEP_MS * scale;
    const routeStep = ROUTE_STEP_MS * scale;
    const exploredEnd = run.explored.length * exploredStep;
    const runEnd = exploredEnd + run.route.length * routeStep;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let startedAt: number | null = null;

    const finish = () => {
      cancelAnimationFrame(frame);
      setShown({ explored: run.explored.length, route: run.route.length });
      setAnimating(false);
    };

    const tick = (now: number) => {
      startedAt ??= now;
      const elapsed = now - startedAt;
      if (elapsed >= runEnd) {
        finish();
        return;
      }
      const explored = Math.min(
        run.explored.length,
        Math.floor(elapsed / exploredStep) + 1,
      );
      const route =
        elapsed < exploredEnd
          ? 0
          : Math.min(
              run.route.length,
              Math.floor((elapsed - exploredEnd) / routeStep) + 1,
            );
      setShown((previous) =>
        previous.explored === explored && previous.route === route
          ? previous
          : { explored, route },
      );
      frame = requestAnimationFrame(tick);
    };

    // Turning on reduced motion partway through a run skips to the result.
    const onMotionChange = () => {
      if (motion.matches) finish();
    };

    motion.addEventListener("change", onMotionChange);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", onMotionChange);
    };
  }, [run, animating]);

  const clearRun = () => {
    setRun(null);
    setAnimating(false);
    setShown(NOTHING_SHOWN);
  };

  const findRoute = () => {
    const { path, visited } = findPath(walls, START, goal, size);
    const next: Run = {
      explored: visited.filter((cell) => cell !== START && cell !== goal),
      route: path.slice(1, -1),
      moves: Math.max(0, path.length - 1),
      found: path.length > 0,
    };
    setRun(next);
    if (prefersReducedMotion()) {
      setShown({ explored: next.explored.length, route: next.route.length });
      setAnimating(false);
    } else {
      setShown(NOTHING_SHOWN);
      setAnimating(true);
    }
  };

  const toggleWall = (cell: number) => {
    setActiveCell(cell);
    if (cell === START || cell === goal) return;
    setWalls((previous) => {
      const next = new Set(previous);
      if (next.has(cell)) next.delete(cell);
      else next.add(cell);
      return next;
    });
    clearRun();
  };

  const clearWalls = () => {
    setWalls(new Set());
    clearRun();
  };

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, cell: number) => {
    const column = cell % size;
    const rowStart = cell - column;
    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = column < size - 1 ? cell + 1 : cell;
        break;
      case "ArrowLeft":
        next = column > 0 ? cell - 1 : cell;
        break;
      case "ArrowDown":
        next = cell + size < cellCount ? cell + size : cell;
        break;
      case "ArrowUp":
        next = cell - size >= 0 ? cell - size : cell;
        break;
      case "Home":
        next = rowStart;
        break;
      case "End":
        next = rowStart + size - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setActiveCell(next);
    cellRefs.current[next]?.focus();
  };

  const exploredNow = new Set(run?.explored.slice(0, shown.explored));
  const routeNow = new Set(run?.route.slice(0, shown.route));
  const finished = run !== null && !animating;

  const statesOf = (cell: number): CellState[] => {
    if (cell === START) return ["start"];
    if (cell === goal) return ["goal"];
    if (walls.has(cell)) return ["wall"];
    const states: CellState[] = [];
    if (exploredNow.has(cell)) states.push("explored");
    if (routeNow.has(cell)) states.push("route");
    return states;
  };

  let status: ReactNode = "Select cells to add walls.";
  if (run && animating) status = "Searching.";
  if (run && finished) {
    status = run.found ? (
      <>
        <span className="mono">{run.moves}</span>{" "}
        {plural(run.moves, "move", "moves")},{" "}
        <span className="mono">{run.explored.length}</span>{" "}
        {plural(run.explored.length, "cell", "cells")} explored.
      </>
    ) : (
      "No route. Remove a wall and try again."
    );
  }

  return (
    <section
      id="pathfinding"
      className="pathfinding"
      aria-labelledby="pathfinding-title"
    >
      <div className="wrap">
        {/* The span keeps "Breadth-first" from breaking at its hyphen on a 320px screen. */}
        <h2 id="pathfinding-title">
          <span className="pathfinding-title-nowrap">Breadth-first</span> search
        </h2>
        <div className="grid pathfinding-layout">
          {/* Draft for Arya to confirm or rewrite. It only describes the
              algorithm. Open question for him: why he built this demo, for
              example where he first used breadth-first search (FTC path
              planning?). His reason goes here in his own words; nobody else
              should write one for him. */}
          <p className="prose pathfinding-intro">
            The search checks every cell one move from the start, then every
            cell two moves away, and keeps widening that ring until it reaches
            the goal, so the first route it finds is a shortest one.
          </p>

          <div
            className="pathfinding-board"
            role="group"
            aria-label={`Grid of ${cellCount} cells. Select a cell to add or remove a wall.`}
            style={{ "--pathfinding-size": size } as CSSProperties}
          >
            {Array.from({ length: cellCount }, (_, cell) => {
              const states = statesOf(cell);
              const endpoint = cell === START || cell === goal;
              const row = Math.floor(cell / size) + 1;
              const column = (cell % size) + 1;
              const words = states.map((key) =>
                CELL_STATES[key].label.toLowerCase(),
              );
              return (
                <button
                  key={cell}
                  ref={(node) => {
                    cellRefs.current[cell] = node;
                  }}
                  type="button"
                  className={[
                    "pathfinding-cell",
                    ...states.map((key) => CELL_STATES[key].className),
                  ].join(" ")}
                  tabIndex={cell === activeCell ? 0 : -1}
                  aria-label={[`Row ${row}, column ${column}`, ...words].join(
                    ", ",
                  )}
                  aria-pressed={endpoint ? undefined : walls.has(cell)}
                  disabled={!hydrated}
                  aria-disabled={endpoint || !hydrated || undefined}
                  onClick={() => toggleWall(cell)}
                  onKeyDown={(event) => moveFocus(event, cell)}
                  onFocus={() => setActiveCell(cell)}
                >
                  {states.map((key) => CELL_STATES[key].mark).join("")}
                </button>
              );
            })}
          </div>

          <ul className="pathfinding-legend" aria-label="Legend">
            {LEGEND.map((key) => (
              <li key={key}>
                <span
                  className={`pathfinding-swatch ${CELL_STATES[key].className}`}
                  aria-hidden="true"
                >
                  {CELL_STATES[key].mark}
                </span>
                <span className="pathfinding-legend-label">
                  {CELL_STATES[key].label}
                </span>
              </li>
            ))}
          </ul>

          <div className="pathfinding-controls">
            <button
              type="button"
              className="button"
              disabled={!hydrated}
              onClick={findRoute}
            >
              {run ? "Run again" : "Find path"}
            </button>
            <button
              type="button"
              className="button"
              disabled={!hydrated}
              onClick={clearWalls}
            >
              Clear walls
            </button>
          </div>

          <p className="pathfinding-status" role="status">
            {hydrated ? status : <noscript>{NO_SCRIPT}</noscript>}
          </p>
        </div>
      </div>
    </section>
  );
}
