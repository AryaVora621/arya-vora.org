import type { Metadata } from "next";
import { games } from "@/data/games";

/*
  The games' share and search metadata. The section lives at games.arya-vora.org (next.config.ts
  rewrites that host's "/" and "/<slug>" onto /games), so every canonical and og:url is on that
  host: the index at its root, as it always was, and each game at "/<slug>".

  Metadata merges shallowly, so a segment that sets openGraph or twitter replaces the parent's
  whole object. Every segment here therefore sets both in full, images included; the games share
  the site's social image. The og and twitter titles repeat the document title as the browser
  shows it ("Stat Line | Arya Vora Games"), so a link preview names the page the same way.
*/

export const GAMES_ORIGIN = "https://games.arya-vora.org";

// Resolved against metadataBase (https://www.arya-vora.org) in the root layout.
const IMAGE = {
  url: "/portfolio-og.png",
  width: 1200,
  height: 630,
  alt: "Arya Vora, captain of FTC team 23786, MakEMinds, next to a 3D model of Reaper, the team's 2025-26 robot.",
};

function share(url: string, title: string, description: string): Metadata {
  return {
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "Arya Vora Games",
      url,
      title,
      description,
      images: [IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [IMAGE.url],
    },
  };
}

export const INDEX_DESCRIPTION =
  "Three basketball games by Arya Vora that run in the browser: two quizzes on NBA numbers and a free-throw timing game.";

/** The games layout: the index's own share card, and the defaults any page under it starts from. */
export const indexMetadata = share(GAMES_ORIGIN, "Games | Arya Vora", INDEX_DESCRIPTION);

/** One game's page: its own title, description, canonical and share card. */
export function gameMetadata(slug: string): Metadata {
  const game = games.find((g) => g.slug === slug);
  if (!game) throw new Error(`No game with the slug ${slug}`);
  return {
    title: game.title,
    ...share(`${GAMES_ORIGIN}/${game.slug}`, `${game.title} | Arya Vora Games`, game.description),
  };
}
