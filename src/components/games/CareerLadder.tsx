"use client";

import { useBestScore } from "@/lib/hooks/useBestScore";
import { useState } from "react";
import { careerPoints, shuffle, type CareerEntry } from "@/data/games";

const SLUG = "career-ladder";
const fmt = new Intl.NumberFormat("en-US");

type Phase = "ready" | "playing" | "reveal" | "over";

export function CareerLadder() {
  const [deck, setDeck] = useState<CareerEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [best, recordBest] = useBestScore(SLUG);
  const [phase, setPhase] = useState<Phase>("ready");
  const [picked, setPicked] = useState<CareerEntry | null>(null);
  const [startBest, setStartBest] = useState(0);

  const left = deck[index];
  const right = deck[index + 1];

  function start() {
    setDeck(shuffle(careerPoints));
    setIndex(0);
    setScore(0);
    setPicked(null);
    setStartBest(best);
    setPhase("playing");
  }

  function choose(choice: CareerEntry) {
    if (phase !== "playing") return;
    const other = choice === left ? right : left;
    const correct = choice.points >= other.points;
    setPicked(choice);
    if (correct) {
      const next = score + 1;
      setScore(next);
      recordBest(next);
      setPhase("reveal");
    } else {
      setPhase("over");
    }
  }

  function advance() {
    // Card B slides over to A; reshuffle once the deck runs out.
    if (index + 2 >= deck.length) {
      const carry = right;
      setDeck([carry, ...shuffle(careerPoints.filter((p) => p !== carry))]);
      setIndex(0);
    } else {
      setIndex(index + 1);
    }
    setPicked(null);
    setPhase("playing");
  }

  if (phase === "ready" || !left || !right) {
    return (
      <div className="game-stage game-intro">
        <p>
          Forty retired NBA greats. Each round shows two of them. Pick who finished with more
          regular-season career points.
        </p>
        <button className="primary-button" onClick={start}>
          Start
        </button>
        {best > 0 && <p className="game-best">Best streak: {best}</p>}
      </div>
    );
  }

  const revealed = phase !== "playing";

  return (
    <div className="game-stage">
      <div className="game-scorebar" aria-live="polite">
        <span>Streak {score}</span>
        <span>Best {best}</span>
      </div>
      <div className="ladder-pair">
        {[left, right].map((p, i) => {
          const isPicked = picked === p;
          const won = revealed && p.points >= (p === left ? right : left).points;
          return (
            <button
              key={p.name}
              className="ladder-card"
              data-state={revealed ? (won ? "win" : "lose") : undefined}
              data-picked={isPicked || undefined}
              onClick={() => choose(p)}
              disabled={revealed}
              aria-label={revealed ? `${p.name}, ${fmt.format(p.points)} points` : `Pick ${p.name}`}
            >
              <span className="micro">{i === 0 ? "A" : "B"} · {p.years}</span>
              <strong>{p.name}</strong>
              <span className="ladder-points tabular">
                {revealed || i === 0 ? fmt.format(p.points) : "?"}
                <small> pts</small>
              </span>
            </button>
          );
        })}
      </div>
      {phase === "reveal" && (
        <button className="primary-button" onClick={advance} autoFocus>
          Next matchup
        </button>
      )}
      {phase === "over" && (
        <div className="game-result" role="status">
          <p>
            Run over at <strong>{score}</strong>. {score > startBest ? "New best." : `Best is ${best}.`}
          </p>
          <button className="primary-button" onClick={start} autoFocus>
            Play again
          </button>
        </div>
      )}
    </div>
  );
}
