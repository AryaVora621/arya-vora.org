export const GRID_SIZE = 7;
export const START = 0;
export const GOAL = GRID_SIZE * GRID_SIZE - 1;
export const DEFAULT_OBSTACLES = [3, 10, 17, 24, 23, 30, 37];

/**
 * The cell states the grid can show. The cells and the legend both read this list,
 * so a label can never drift from what a cell looks like. `className` is the class
 * the stylesheet draws; an empty cell has no entry because it is not in the legend.
 * Labels name a state, never a color.
 */
export const CELL_STATES = [
  { key: "start", label: "Start", className: "endpoint start", glyph: "S" },
  { key: "goal", label: "Goal", className: "endpoint goal", glyph: "G" },
  { key: "wall", label: "Wall", className: "wall", glyph: "" },
  { key: "explored", label: "Explored", className: "visited", glyph: "" },
  { key: "route", label: "Route", className: "route", glyph: "" },
] as const;

export type CellStateKey = (typeof CELL_STATES)[number]["key"];

export function cellStateClass(key: CellStateKey) {
  return CELL_STATES.find((state) => state.key === key)?.className ?? "";
}

/**
 * Where a key press moves focus on the grid. Arrow keys stay inside the current row
 * or column and stop at the edge: ArrowRight on the last column does not continue
 * onto the next row. Home and End jump to the ends of the row.
 */
export function moveCell(cell: number, key: string, size = GRID_SIZE) {
  const x = cell % size;
  const y = Math.floor(cell / size);
  switch (key) {
    case "ArrowRight":
      return y * size + Math.min(x + 1, size - 1);
    case "ArrowLeft":
      return y * size + Math.max(x - 1, 0);
    case "ArrowDown":
      return Math.min(y + 1, size - 1) * size + x;
    case "ArrowUp":
      return Math.max(y - 1, 0) * size + x;
    case "Home":
      return y * size;
    case "End":
      return y * size + size - 1;
    default:
      return cell;
  }
}

/** Breadth-first search: shortest route on an unweighted, four-neighbor grid. */
export function findPath(
  obstacles: ReadonlySet<number>,
  start = START,
  goal = GOAL,
  size = GRID_SIZE,
) {
  if (
    size < 1 ||
    !Number.isInteger(size) ||
    !Number.isInteger(start) ||
    !Number.isInteger(goal) ||
    start < 0 ||
    goal < 0 ||
    start >= size * size ||
    goal >= size * size ||
    obstacles.has(start) ||
    obstacles.has(goal)
  ) {
    return { path: [] as number[], visited: [] as number[] };
  }
  const queue = [start];
  const parents = new Map<number, number | null>([[start, null]]);
  const visited: number[] = [];
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    visited.push(cell);
    if (cell === goal) {
      const path: number[] = [];
      let current: number | null = goal;
      while (current !== null) {
        path.unshift(current);
        current = parents.get(current) ?? null;
      }
      return { path, visited };
    }
    const x = cell % size;
    const y = Math.floor(cell / size);
    const neighbors = [
      [x + 1, y],
      [x, y + 1],
      [x - 1, y],
      [x, y - 1],
    ];
    for (const [nx, ny] of neighbors) {
      const next = ny * size + nx;
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= size ||
        ny >= size ||
        obstacles.has(next) ||
        parents.has(next)
      )
        continue;
      parents.set(next, cell);
      queue.push(next);
    }
  }
  return { path: [], visited };
}
