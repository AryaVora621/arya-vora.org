import { GAMES_ORIGIN } from "../meta";

/*
  The robots.txt of games.arya-vora.org, served at that host's /robots.txt by a rewrite in
  next.config.ts. A route handler and not a robots.ts, because Next reads robots.ts from the root
  of app/ only. It says what the main site's file says (everything is public) and names this
  host's own sitemap.
*/
export function GET() {
  return new Response(`User-Agent: *\nAllow: /\n\nSitemap: ${GAMES_ORIGIN}/sitemap.xml\n`, {
    headers: { "Content-Type": "text/plain" },
  });
}
