"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  Check,
  Play,
  RotateCcw,
  Workflow,
} from "lucide-react";
import {
  agentScenarios,
  DEFAULT_OBSTACLES,
  findPath,
  GOAL,
  GRID_SIZE,
  START,
} from "@/lib/playground";

function PathLab() {
  const [obstacles, setObstacles] = useState(new Set(DEFAULT_OBSTACLES));
  const [result, setResult] = useState<ReturnType<typeof findPath> | null>(
    null,
  );
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const grid = useRef<HTMLDivElement>(null);
  const arrived = !!result?.path.length && step === result.path.length - 1;
  useEffect(() => {
    if (!running || !result?.path.length) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const finishWithoutAnimation = () => {
      if (preference.matches || document.documentElement.dataset.motion === "paused") {
        setRunning(false);
        setStep(result.path.length - 1);
      }
    };
    // Both the system preference and the global toggle can change mid-route.
    preference.addEventListener("change", finishWithoutAnimation);
    const observer = new MutationObserver(finishWithoutAnimation);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    return () => {
      preference.removeEventListener("change", finishWithoutAnimation);
      observer.disconnect();
    };
  }, [running, result]);
  useEffect(() => {
    if (!running || !result?.path.length) return;
    const timer = window.setTimeout(() => {
      if (step >= result.path.length - 2) setRunning(false);
      setStep(Math.min(step + 1, result.path.length - 1));
    }, 160);
    return () => clearTimeout(timer);
  }, [running, result, step]);
  const edit = (cell: number) => {
    if (cell === START || cell === GOAL) return;
    setRunning(false);
    setResult(null);
    setStep(0);
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
    setStep(0);
    const reduced =
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset.motion === "paused";
    setRunning(next.path.length > 0 && !reduced);
    if (reduced) setStep(Math.max(0, next.path.length - 1));
  };
  return (
    <article className="lab-card">
      <div className="lab-card-title">
        <span className="micro">EXPERIMENT 01</span>
        <Bot size={20} aria-hidden="true" />
      </div>
      <h3>Find a way through.</h3>
      <p>Add walls. Run the planner. Watch a shortest route emerge.</p>
      <div
        ref={grid}
        className="path-grid"
        role="group"
        aria-label="Pathfinding field"
        onKeyDown={(event) => {
          const current = Number((event.target as HTMLElement).dataset.cell);
          const offsets: Record<string, number> = {
            ArrowRight: 1,
            ArrowLeft: -1,
            ArrowUp: -GRID_SIZE,
            ArrowDown: GRID_SIZE,
          };
          if (!(event.key in offsets) || !Number.isInteger(current)) return;
          event.preventDefault();
          const next = Math.max(
            0,
            Math.min(GOAL, current + offsets[event.key]),
          );
          grid.current
            ?.querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)
            ?.focus();
        }}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, cell) => {
          const wall = obstacles.has(cell);
          const pathIndex = result?.path.indexOf(cell) ?? -1;
          const robot = result?.path[step] === cell;
          const classes = [
            "path-cell",
            wall ? "wall" : "",
            pathIndex >= 0 && pathIndex <= step ? "route" : "",
            result?.visited.includes(cell) ? "visited" : "",
            cell === START || cell === GOAL ? "endpoint" : "",
          ].join(" ");
          return (
            <button
              type="button"
              data-cell={cell}
              key={cell}
              className={classes}
              onClick={() => edit(cell)}
              aria-label={`Row ${Math.floor(cell / GRID_SIZE) + 1}, column ${(cell % GRID_SIZE) + 1}: ${cell === START ? "start (fixed)" : cell === GOAL ? "goal (fixed)" : wall ? "wall" : "open"}`}
              aria-pressed={wall}
              aria-disabled={cell === START || cell === GOAL}
            >
              {robot ? (
                <Bot size={18} aria-hidden="true" />
              ) : cell === START ? (
                "S"
              ) : cell === GOAL ? (
                "G"
              ) : wall ? (
                "×"
              ) : (
                <span aria-hidden="true">·</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="lab-legend">
        <span>S / Start</span>
        <span>G / Goal</span>
        <span>× / Wall</span>
        <span>Green / Route</span>
      </div>
      <div className="lab-controls">
        <button className="primary-button" onClick={run}>
          <Play size={15} aria-hidden="true" />
          {result ? "Run again" : "Find path"}
        </button>
        <button
          className="secondary-button"
          onClick={() => {
            setObstacles(new Set());
            setResult(null);
            setRunning(false);
            setStep(0);
          }}
        >
          <RotateCcw size={15} aria-hidden="true" />
          Clear walls
        </button>
      </div>
      <p className="lab-status" role="status">
        {result
          ? result.path.length
            ? `${result.path.length - 1} moves · ${result.visited.length} cells explored${arrived ? " · Goal reached" : " · Following route"}`
            : "No route available. Remove a wall and try again."
          : "Tap cells to toggle walls. Arrow keys move between cells."}
      </p>
      <p className="lab-disclaimer">
        Browser simulation · Breadth-first search, 4-way movement. Not a live
        robot controller.
      </p>
    </article>
  );
}

function AgentLab() {
  const [scenario, setScenario] =
    useState<keyof typeof agentScenarios>("Build a feature");
  const [stage, setStage] = useState(-1);
  const [running, setRunning] = useState(false);
  const steps = agentScenarios[scenario];
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => {
      const next = Math.min(stage + 1, steps.length - 1);
      setStage(next);
      if (next === steps.length - 1) setRunning(false);
    }, 850);
    return () => clearTimeout(timer);
  }, [running, stage, steps.length]);
  return (
    <article className="lab-card agent-lab">
      <div className="lab-card-title">
        <span className="micro">EXPERIMENT 02</span>
        <Workflow size={20} aria-hidden="true" />
      </div>
      <h3>One task. A small crew.</h3>
      <p>
        Follow a task from planning to verification in a local-agent workflow.
      </p>
      <label className="micro scenario-label" htmlFor="agent-scenario">
        CHOOSE A TASK
      </label>
      <select
        id="agent-scenario"
        value={scenario}
        onChange={(event) => {
          setScenario(event.target.value as keyof typeof agentScenarios);
          setStage(-1);
          setRunning(false);
        }}
      >
        {Object.keys(agentScenarios).map((name) => (
          <option key={name}>{name}</option>
        ))}
      </select>
      <ol className="agent-pipeline">
        {steps.map(([name, text], index) => (
          <li key={name} className={index <= stage ? "is-complete" : ""}>
            <span className="agent-node">
              {index <= stage ? (
                <Check size={18} aria-hidden="true" />
              ) : (
                String(index + 1).padStart(2, "0")
              )}
            </span>
            <div>
              <h4>
                {name}
                <span>{index <= stage ? "Complete" : "Waiting"}</span>
              </h4>
              <p>{index <= stage ? text : "Waiting for the previous stage."}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="lab-controls">
        <button
          className="primary-button"
          disabled={running}
          onClick={() => {
            setStage(-1);
            setRunning(true);
          }}
        >
          <Play size={15} aria-hidden="true" />
          {running
            ? "Running demo…"
            : stage >= 0
              ? "Replay workflow"
              : "Run workflow"}
        </button>
        <button
          className="secondary-button"
          disabled={stage === -1 && !running}
          onClick={() => {
            setStage(-1);
            setRunning(false);
          }}
        >
          Reset
        </button>
      </div>
      <p className="lab-status" role="status">
        {running
          ? `Running: ${steps[Math.min(stage + 1, steps.length - 1)][0]}`
          : stage >= 0
            ? "Workflow complete. Human review comes next."
            : "Ready. Choose a task and run the workflow."}
      </p>
      <p className="lab-disclaimer">
        Scripted illustration · No AI calls, terminal access, or files uploaded.
      </p>
    </article>
  );
}

export function Playground() {
  return (
    <section
      id="playground"
      tabIndex={-1}
      className="section-pad playground-section"
    >
      <div className="site-shell">
        <div className="section-heading">
          <p className="eyebrow">02 / THE PLAYGROUND</p>
          <h2>
            Less scrolling.
            <br />
            <span className="accent-text">More tinkering.</span>
          </h2>
          <p>
            A couple of ideas from my work, made small enough to play with.
            Everything runs right here in your browser.
          </p>
        </div>
        <div className="lab-grid reveal">
          <PathLab />
          <AgentLab />
        </div>
        <a
          className="text-link"
          href="https://github.com/AryaVora621"
          target="_blank"
          rel="noopener noreferrer"
        >
          Get into the actual code <ArrowRight size={17} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
