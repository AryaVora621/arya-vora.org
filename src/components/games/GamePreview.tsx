import { careerPoints, statLines } from "@/data/games";

/*
  The picture on each card of the games index: a still drawing of the game's own screen, made
  of the same pieces the game draws (two player cards, the three averages and four answers, the
  meter and the shot track), with real rows from src/data/games.ts. It is decoration, hidden
  from assistive tech; the card's title and line say what the game is. Styles are the gp-
  rules in src/app/games.css, sized in container units so the drawing scales with its card.
*/

const fmt = new Intl.NumberFormat("en-US");

function LadderPreview() {
  // Round one as the game shows it: the left card's total is open, the right one's is hidden.
  const shown = careerPoints.find((p) => p.name === "Kobe Bryant") ?? careerPoints[0];
  const hidden = careerPoints.find((p) => p.name === "Michael Jordan") ?? careerPoints[1];
  return (
    <div className="gp gp-ladder">
      {[shown, hidden].map((player, i) => (
        <div key={player.name} className="gp-ladder-card">
          <span className="gp-caption">
            {i === 0 ? "A" : "B"}, {player.years}
          </span>
          <strong>{player.name}</strong>
          <span className="gp-points">
            {i === 0 ? fmt.format(player.points) : "?"}
            <small> pts</small>
          </span>
        </div>
      ))}
    </div>
  );
}

function StatLinePreview() {
  const line = statLines.find((s) => s.player === "Wilt Chamberlain") ?? statLines[0];
  const options = [line.player, "Oscar Robertson", "Dennis Rodman", "Shaquille O'Neal"];
  return (
    <div className="gp gp-statline">
      <div className="gp-stats">
        {(
          [
            ["PTS", line.pts],
            ["REB", line.reb],
            ["AST", line.ast],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <span className="gp-caption">{label}</span>
            <span className="gp-stat">{value.toFixed(1)}</span>
          </div>
        ))}
      </div>
      <div className="gp-options">
        {options.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>
    </div>
  );
}

// Five shots in: the needle has stopped inside the window, which has narrowed after the makes.
const SHOTS = ["make", "make", "miss", "make", "make", "", "", "", "", ""];

function FreeThrowPreview() {
  return (
    <div className="gp gp-freethrow">
      <div className="gp-scorebar">
        <span>Shot 6 / 10</span>
        <span>Makes 4, streak 2</span>
      </div>
      <div className="gp-meter">
        <span className="gp-zone" />
        <span className="gp-needle" />
      </div>
      <div className="gp-track">
        {SHOTS.map((state, i) => (
          <span key={i} data-state={state || undefined} />
        ))}
      </div>
    </div>
  );
}

const PREVIEWS: Record<string, () => React.JSX.Element> = {
  "career-ladder": LadderPreview,
  "stat-line": StatLinePreview,
  "free-throw": FreeThrowPreview,
};

export function GamePreview({ slug }: { slug: string }) {
  const Preview = PREVIEWS[slug];
  if (!Preview) return null;
  return (
    <div className="games-card-media" aria-hidden="true">
      <Preview />
    </div>
  );
}
