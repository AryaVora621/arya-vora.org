import { PROJECTS } from "@/data/projects";
import { renderShareCard } from "../../_share/card";

// /projects/<slug>/card.png: the 1200 x 630 PNG that a link to the project previews as. The page's
// metadata (generateMetadata in ../page.tsx) names it for Open Graph and for X, so Facebook,
// LinkedIn, Slack, iMessage and the rest all read the same file. One per project, drawn once at
// build time from the project's data (../../_share/card.tsx); nothing is drawn on a request.
//
// A plain route and not the opengraph-image file convention: that one cannot name the picture's
// alt text per project without a generated id in the address, and a card with an id in its
// address is not built ahead of time. And ".png" in the address is something every crawler reads.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return renderShareCard((await params).slug);
}
