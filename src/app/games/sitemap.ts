import type { MetadataRoute } from "next";
import { games } from "@/data/games";
import { GAMES_ORIGIN } from "./meta";

/*
  The sitemap of games.arya-vora.org: the index and one page per game, at the addresses each page
  names as its canonical (meta.ts). It is served at that host's /sitemap.xml by a rewrite in
  next.config.ts; the main site's sitemap names www.arya-vora.org only and leaves /games out,
  since the games' canonical host is this one.
*/
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${GAMES_ORIGIN}/`, changeFrequency: "monthly", priority: 1 },
    ...games.map((game) => ({
      url: `${GAMES_ORIGIN}/${game.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
