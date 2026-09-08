export const GRID_SIZE = 7;
export const START = 0;
export const GOAL = GRID_SIZE * GRID_SIZE - 1;
export const DEFAULT_OBSTACLES = [3, 10, 17, 24, 23, 30, 37];

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

export const agentScenarios = {
  "Build a feature": [
    [
      "Planner",
      "Split the work into interface, implementation, and verification.",
    ],
    ["Builder", "Prepare a change in an isolated workspace."],
    ["Reviewer", "Check the proposed change against the task."],
    ["Verifier", "Return the plan and checks for human review."],
  ],
  "Audit a repository": [
    ["Planner", "Map source files and define a read-only audit."],
    ["Builder", "Inspect configuration and public entry points."],
    ["Reviewer", "Group potential findings by severity."],
    ["Verifier", "Return findings with reproducible verification steps."],
  ],
} as const;
