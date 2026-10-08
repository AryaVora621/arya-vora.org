import Link from "next/link";
import { games } from "@/data/games";

export default function GamesIndex() {
  return (
    <>
      <section className="games-hero">
        <p className="eyebrow">
          <span className="status-dot" /> games.arya-vora.org
        </p>
        <h1>Games</h1>
        <p className="games-lede">
          Quick games built around basketball numbers, plus one for your reflexes. No accounts, no
          ads, nothing to install.
        </p>
      </section>
      <ul className="games-grid">
        {games.map((game, i) => (
          <li key={game.slug}>
            <Link href={`/games/${game.slug}`} className="games-card">
              <span className="micro">
                {String(i + 1).padStart(2, "0")} / {game.kicker}
              </span>
              <h2>{game.title}</h2>
              <p>{game.blurb}</p>
              <span className="games-card-cta">Play →</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
