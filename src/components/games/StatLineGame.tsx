"use client";

import { useBestScore } from "@/lib/hooks/useBestScore";
import { useState } from "react";
import { shuffle, statLines, type StatLine } from "@/data/games";

const SLUG = "stat-line";
const ROUNDS = 10;

type Round = { line: StatLine; options: string[] };

function buildRounds(): Round[] {
  const players = statLines.map((s) => s.player);
  return shuffle(statLines)
    .slice(0, ROUNDS)
    .map((line) => ({
      line,
      options: shuffle([
        line.player,
        ...shuffle(players.filter((p) => p !== line.player)).slice(0, 3),
      ]),
    }));
}

export function StatLineGame() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [best, recordBest] = useBestScore(SLUG);
  const [hint, setHint] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  const round = rounds[index];
  const finished = rounds.length > 0 && index >= rounds.length;

  function start() {
    setRounds(buildRounds());
    setIndex(0);
    setScore(0);
    setHint(false);
    setAnswer(null);
  }

  function choose(option: string) {
    if (answer || !round) return;
    setAnswer(option);
    if (option === round.line.player) {
      // Two points clean, one with the hint.
      const next = score + (hint ? 1 : 2);
      setScore(next);
      if (index === rounds.length - 1) recordBest(next);
    } else if (index === rounds.length - 1) {
      recordBest(score);
    }
  }

  function next() {
    setIndex(index + 1);
    setHint(false);
    setAnswer(null);
  }

  if (!rounds.length) {
    return (
      <div className="game-stage game-intro">
        <p>
          Ten famous seasons, shown only as per-game averages. Name the player. Clean answers are
          worth 2 points; peeking at the season and team drops it to 1.
        </p>
        <button className="primary-button" onClick={start}>
          Start
        </button>
        {best > 0 && <p className="game-best">Best score: {best} / {ROUNDS * 2}</p>}
      </div>
    );
  }

  if (finished || !round) {
    return (
      <div className="game-stage game-result" role="status">
        <p>
          Final score <strong>{score}</strong> / {ROUNDS * 2}. Best is {best}.
        </p>
        <button className="primary-button" onClick={start} autoFocus>
          Play again
        </button>
      </div>
    );
  }

  const { line } = round;
  const showMeta = hint || answer !== null;

  return (
    <div className="game-stage">
      <div className="game-scorebar" aria-live="polite">
        <span>
          Round {index + 1} / {rounds.length}
        </span>
        <span>Score {score}</span>
      </div>
      <dl className="statline">
        <div>
          <dt>PTS</dt>
          <dd className="tabular">{line.pts.toFixed(1)}</dd>
        </div>
        <div>
          <dt>REB</dt>
          <dd className="tabular">{line.reb.toFixed(1)}</dd>
        </div>
        <div>
          <dt>AST</dt>
          <dd className="tabular">{line.ast.toFixed(1)}</dd>
        </div>
      </dl>
      <p className="statline-meta micro">
        {showMeta ? (
          <>
            {line.season}, {line.team}
            {line.note ? `, ${line.note}` : ""}
          </>
        ) : (
          <button className="text-link" onClick={() => setHint(true)}>
            Show season &amp; team (half credit)
          </button>
        )}
      </p>
      <div className="option-grid">
        {round.options.map((option) => (
          <button
            key={option}
            className="option-button"
            onClick={() => choose(option)}
            disabled={answer !== null}
            data-state={
              answer === null
                ? undefined
                : option === line.player
                  ? "win"
                  : option === answer
                    ? "lose"
                    : undefined
            }
          >
            {option}
          </button>
        ))}
      </div>
      {answer !== null && (
        <div className="game-result" role="status">
          <p>{answer === line.player ? "Correct." : `It was ${line.player}.`}</p>
          <button className="primary-button" onClick={next} autoFocus>
            {index === rounds.length - 1 ? "See score" : "Next season"}
          </button>
        </div>
      )}
    </div>
  );
}
