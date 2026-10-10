import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PROJECTS } from "@/data/projects";
import { games } from "@/data/games";

/*
  The address a page answers at is lower case and has no trailing slash: /projects/robopet, never
  /Projects/RoboPet/. Every other spelling of a real page goes to it with one 308, before anything
  is rendered:

    /projects/Robopet, /projects/roboPet (the title's own spelling), /projects/REAPER
    /Projects, /PROJECTS/reaper, /Games, /GAMES/free-throw, /games/Free-Throw
    /projects/robopet/, /Projects/RoboPet/

  Doing it here and not in the page is what keeps the pages safe. Next matches a prerendered page
  without regard to case but renders it for the slug as typed. A request for /projects/roboPet
  was answered from the page built for "robopet", marked stale, and re-rendered in the background
  for the slug "roboPet", which is no project: the 404 that made replaced the page stored for
  "robopet", and /projects/robopet answered 404 for everyone until the next build. (A redirect
  from the page itself is stored the same way, so it makes no difference where in the page it
  sits.) The section is no different: a section in capitals is not matched by Next at all, so
  /Projects and /GAMES were plain 404s. The share-card routes under a project
  (/projects/<slug>/card.png) are redirected the same, keeping what follows the slug as written.

  A trailing slash is not this file's to remove on a real request. Next's own redirect for it
  (trailingSlash is off, and next.config.ts does not set skipTrailingSlashRedirect) runs before
  this file does. So /projects/robopet/ takes one redirect (Next's slash strip), /projects/RoboPet
  takes one (this file's), and /projects/RoboPet/ takes two: Next's slash strip to
  /projects/RoboPet, then this file to /projects/robopet. The code below still drops a slash from
  an address that reaches it with one, which is what keeps the rule in one place.

  A slug that is not a project (or a game) is not redirected: sending it somewhere first would
  only add a hop. A game that does not exist is a plain 404, the root not-found page. A project
  that does not exist is rewritten to /projects/missing, a page of the projects layout that
  renders the "no project at this address" message, and the response is given its 404 here. It
  cannot be a notFound() in the [slug] page: Next 16 answers that with an empty
  <html id="__next_error__"> shell and draws the message only once the scripts have run (see
  projects/missing/page.tsx). Only an address that could be a page is rewritten, and so is the
  address of a file that is not there.

  A name with a file extension (/projects/tally-cover.webp) may be a file in public/, which Next
  serves after this file has run, so the name of a file that is there is left alone. One that is
  not (/projects/tally.webp, a cover that was removed) cannot be left to [slug]: that route has
  dynamicParams = false, and Next answers an address outside generateStaticParams with a 404 but
  writes "Error: Internal: NoFallbackError" to the server log every time. It is rewritten, with
  its 404, to NO_SUCH_FILE, which no route owns, so the root not-found page answers and [slug] is
  never reached. The names of the files come from next.config.ts, which reads public/projects
  when it loads and hands the list over as PROJECT_PUBLIC_FILES (Next inlines it at build time).
  This file cannot read public/ itself: on Vercel the files are served from the CDN and are not
  in the function. Without the list (a build that did not set it) every name is let through, as
  it was before, so a file that exists is never turned away. Anything below a slug is left to
  Next: the share card of a project that does not exist, /projects/nope/card.png, is a 404 from
  its own route and logs nothing.

  One setup breaks the rewrites: `next start --hostname 127.0.0.1` (or ::1). Next hands this file
  a request.url whose host NextURL has turned into "localhost", so the rewrite's origin is not the
  http://127.0.0.1:<port> the server compares it with, the rewrite is taken for an external one
  and proxied back to the server, which rewrites it again until the connection drops (a 500 and
  "Failed to proxy"). Start the server without --hostname, as playwright.config.ts does. Vercel
  and `next dev` are not affected.

  The games.arya-vora.org host serves the same pages at "/" and "/<slug>" (next.config.ts rewrites
  them onto /games afterwards, and its /sitemap.xml and /robots.txt onto /games/sitemap.xml and
  /games/robots.txt). A game's slug in capitals there (/Stat-Line) is no route, so it goes with one
  308 to the lower-case address on the same host (/stat-line), the way /games/Stat-Line does on
  the main host. The third matcher entry picks those out by the Host header and by one segment
  with a capital letter in it, so everything else on that host (pages already in lower case,
  /_next assets, files) never runs this file. A path of that host that is under /games is the
  main host's rule above, unchanged.
*/

// The page src/app/projects/missing/page.tsx.
const MISSING_PROJECT = "/projects/missing";

// An address no route can have (Next ignores a folder that starts with an underscore), so it is
// answered by the root not-found page. Rewritten to, so the address in the bar stays as typed.
const NO_SUCH_FILE = "/_no-such-file";

// The games site's host. The matcher below spells it out, since Next reads that as a constant.
const GAMES_HOST = "games.arya-vora.org";

// A Map, not an object: a path such as /valueOf must not find an inherited property.
const GAME_SLUGS: ReadonlySet<string> = new Set(games.map((game) => game.slug));
const SLUGS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["projects", new Set(PROJECTS.map((project) => project.slug))],
  ["games", GAME_SLUGS],
]);

// The names in public/projects, as next.config.ts listed them. Parsed once per distinct value.
let listed: { raw: string; files: ReadonlySet<string> } | undefined;

function isProjectFile(name: string): boolean {
  const raw = process.env.PROJECT_PUBLIC_FILES;
  if (!raw) return true;
  if (listed?.raw !== raw) {
    let files: string[] = [];
    try {
      files = JSON.parse(raw) as string[];
    } catch {
      return true;
    }
    listed = { raw, files: new Set(files) };
  }
  let decoded = name;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    // A name that is not valid percent-encoding is looked up as typed.
  }
  return listed.files.has(decoded);
}

function onGamesHost(request: NextRequest): boolean {
  const host = request.headers.get("host") ?? request.nextUrl.host;
  return host.split(":")[0].toLowerCase() === GAMES_HOST;
}

// A plain URL, not nextUrl.clone(): a NextURL remembers that the address it was made from ended
// in a slash and writes that slash back after the pathname is set.
function withPath(request: NextRequest, pathname: string): URL {
  const target = new URL(request.url);
  target.pathname = pathname;
  return target;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, rawSection, slug, ...rest] = pathname.split("/");
  const section = rawSection.toLowerCase();

  // games.arya-vora.org/Stat-Line: a game's slug as the only segment, in the wrong case.
  if (!slug && rest.length === 0 && onGamesHost(request) && GAME_SLUGS.has(section)) {
    if (section === rawSection) return NextResponse.next();
    return NextResponse.redirect(withPath(request, `/${section}`), 308);
  }

  const known = SLUGS.get(section);
  if (!known) return NextResponse.next();

  if (slug && !known.has(slug.toLowerCase())) {
    // A project that does not exist: the projects 404 page, rewritten so the address stays as
    // typed, with the 404 given here (a rewrite's status reaches the response). Only a page
    // address qualifies: nothing after the slug but a slash.
    if (section === "projects" && rest.every((part) => part === "")) {
      if (!slug.includes(".")) {
        return NextResponse.rewrite(withPath(request, MISSING_PROJECT), { status: 404 });
      }
      // A file name: public/ serves it when it is there, and when it is not the root 404 does.
      if (!isProjectFile(slug)) {
        return NextResponse.rewrite(withPath(request, NO_SUCH_FILE), { status: 404 });
      }
    }
    // Anything else that names nothing is a 404 as typed; sending it somewhere first would only
    // add a hop.
    return NextResponse.next();
  }

  const canonical = ["", section, ...(slug ? [slug.toLowerCase(), ...rest] : [])]
    .join("/")
    .replace(/\/+$/, "");
  if (canonical === pathname) return NextResponse.next();

  return NextResponse.redirect(withPath(request, canonical), 308);
}

// Next compares a matcher with the path as typed and does so case sensitively, so each section is
// written out as the letters it may be in either case. The third entry is the games host's: one
// segment of letters, digits and hyphens with at least one capital in it (the lookahead-free way
// to say "not already lower case"). `has` reads the Host header, as the rewrites in
// next.config.ts do.
export const config = {
  matcher: [
    "/:section([Pp][Rr][Oo][Jj][Ee][Cc][Tt][Ss])/:path*",
    "/:section([Gg][Aa][Mm][Ee][Ss])/:path*",
    {
      source: "/:slug([A-Za-z0-9-]*[A-Z][A-Za-z0-9-]*)",
      has: [{ type: "host", value: "games.arya-vora.org" }],
    },
  ],
};
