import Link from "next/link";
import { games } from "@/data/games";

export function GamePage({ slug, children }: { slug: string; children: React.ReactNode }) {
  const game = games.find((g) => g.slug === slug)!;
  return (
    <article className="game-page" data-game={slug}>
      <Link href="/games" className="game-back">
        All games
      </Link>
      <h1>{game.title}</h1>
      <p className="games-lede">{game.howTo}</p>
      {children}
    </article>
  );
}
