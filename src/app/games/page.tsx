import Link from "next/link";
import { games } from "@/data/games";
import { GamePreview } from "@/components/games/GamePreview";

// The index is built like the main site's project previews: a picture, the title as the card's
// one link (stretched over the whole card), and one line. The picture is a drawing of the game's
// own screen (GamePreview).
export default function GamesIndex() {
  return (
    <>
      <section className="games-head" aria-labelledby="games-title">
        <h1 id="games-title">Games</h1>
        <p className="games-lede">
          Three basketball games that run in the browser: two quizzes on NBA numbers and a
          free-throw timing game.
        </p>
      </section>
      <ul className="games-grid">
        {games.map((game) => (
          <li key={game.slug} className="games-card">
            <GamePreview slug={game.slug} />
            <h2 className="games-card-title">
              <Link href={`/games/${game.slug}`} className="games-card-link">
                {game.title}
              </Link>
            </h2>
            <p className="games-card-blurb">{game.blurb}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
