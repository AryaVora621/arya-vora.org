import type { Metadata } from "next";

// The root layout's Open Graph and Twitter entries describe the home page, and a page that sets
// its own openGraph replaces the parent's whole object, so each projects page states all of it
// again with its own title, description and address.
//
// The card image of a project is its own: [slug]/card.png is a 1200 x 630 PNG per project (the
// cover on the page's black, the title set in Atkinson), so a link to Tally previews as Tally.
// A cover itself is the wrong thing to hand a crawler: it is a WebP, often a cutout with an
// alpha channel, in whatever shape the render came out. The index, and any page without a card
// of its own, keeps the site card, which names Arya and shows the 3D model of Reaper. Paths
// resolve against metadataBase, set in the root layout.
export type ShareImage = { src: string; alt: string; width: number; height: number; type?: string };

const SITE_IMAGE: ShareImage = {
  src: "/portfolio-og.png",
  width: 1200,
  height: 630,
  alt: "Arya Vora, captain of FTC team 23786, MakEMinds, next to a 3D model of Reaper, the team's 2025-26 robot.",
};

export function projectMetadata({
  title,
  description,
  path,
  image = SITE_IMAGE,
}: {
  title: string;
  description: string;
  path: string;
  image?: ShareImage;
}): Metadata {
  const shareTitle = `${title} | Arya Vora`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: path,
      siteName: "Arya Vora",
      title: shareTitle,
      description,
      images: [
        { url: image.src, width: image.width, height: image.height, alt: image.alt, type: image.type },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
      images: [{ url: image.src, alt: image.alt, width: image.width, height: image.height }],
    },
  };
}

// A 404 is not the home page. The root layout's canonical, og:url and og:title point at "/", and
// a page that sets nothing of its own inherits them, which tells a crawler or a link preview that
// the missing address is the home page. Naming a field here replaces the inherited one, so each
// is set to say only what the page is. There is no robots field: Next adds
// <meta name="robots" content="noindex"> to any page it answers with a 404, which keeps this one
// out of results, and a tag of our own would be a second, conflicting one.
export function notFoundMetadata(title: string): Metadata {
  const description = "There is no project at this address. The projects index lists every one.";
  return {
    title,
    description,
    alternates: { canonical: null },
    openGraph: {
      type: "website",
      siteName: "Arya Vora",
      title: `${title} | Arya Vora`,
      description,
    },
    twitter: { card: "summary", title: `${title} | Arya Vora`, description },
  };
}

// ---------------------------------------------------------------------------------------------
// Descriptions
// ---------------------------------------------------------------------------------------------

// A search result and a link preview cut a description at about 155 to 160 characters, mid
// sentence. The card summaries on /projects are written for a card and run longer, so the meta
// description is its own line, no longer than this.
export const MAX_DESCRIPTION = 155;

// Hand-cut descriptions for the summaries that run past the limit. Each says only what the
// summary says. A project not listed here uses its summary when it fits, and otherwise the
// whole sentences of it that do (shareDescription).
const DESCRIPTIONS: Record<string, string> = {
  bench:
    "Five smaller models from my Onshape documents, among them a lovebox with an LCD in its heart-shaped lid and a two-servo head with an ultrasonic sensor.",
  drone:
    "An ESP32 quadcopter running esp-fc, with a second ESP32 as the transmitter. Its first flight, in July 2026, lasted several minutes and ended in a crash.",
  notchterm:
    "An overlay for the MacBook notch that shows my Claude and Codex sessions in Terminal as chips and opens a panel with each session’s latest output.",
  openultracode:
    "A command-line tool that splits a goal into tasks and routes each one to a model tier, so the most expensive model is not doing every job.",
  reaper:
    "FTC team 23786 MakEMinds’ robot for DECODE, the 2025-26 game, with me as mechanical lead. It went 5-0 in qualification at the New Jersey Championship.",
  robopet:
    "A four-legged robot I am building to learn mechatronics, on a Raspberry Pi Pico and a Pi Zero 2W. The 8-servo frame is printed; it does not walk yet.",
  shipkit:
    "ShipKit checks a web project against 18 rules for problems such as an exposed service key or a missing 404 page, and can generate fixes for eight of them.",
  smartai:
    "A stock research app. Its AI Research card streams a web-searched, cited report while it is written, next to a market overview and screeners.",
  tally:
    "Short SAT sprints of 5, 10, 15 or 20 questions target the topics a student is weakest in, and a spaced-repetition queue brings missed questions back.",
  teamstat:
    "A scouting app I built for my FTC team in May 2025 in Firebase Studio. It lists 48 teams from the Thomson Division in a table you can sort and search.",
};

export function shareDescription(project: { slug: string; summary: string }): string {
  const hand = DESCRIPTIONS[project.slug];
  if (hand) return hand;
  const { summary } = project;
  if (summary.length <= MAX_DESCRIPTION) return summary;
  // Whole sentences while they fit; a single long sentence is cut at a word.
  const sentences = summary.match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? [summary];
  let out = "";
  for (const sentence of sentences) {
    const next = out ? `${out} ${sentence.trim()}` : sentence.trim();
    if (next.length > MAX_DESCRIPTION) break;
    out = next;
  }
  if (out) return out;
  return summary.slice(0, MAX_DESCRIPTION).replace(/\s+\S*$/, "").replace(/[,;:]$/, "");
}
