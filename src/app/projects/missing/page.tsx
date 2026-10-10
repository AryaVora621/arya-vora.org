import type { Metadata } from "next";
import { notFoundMetadata } from "../project-metadata";
import ProjectNotFound from "../not-found";

/*
  The page /projects/<anything not in the list> is answered with, under the projects layout (the
  site nav and the sub-tabs). src/proxy.ts rewrites those addresses here and gives the response
  its 404, so the address in the bar stays the one that was typed.

  It is a page of its own, and the [slug] page does not call notFound() for it, because of how
  Next 16 answers notFound() from a page: the server render of the document fails, the response
  is a 404 shell (<html id="__next_error__">, no lang, no stylesheet, no theme script, an empty
  body) and the not-found UI is drawn only after the scripts load. That cost a flash of the
  wrong theme and left a page with no JavaScript, and a crawler, with no words. A page that
  renders normally is complete HTML. The same content is what projects/not-found.tsx shows if
  notFound() is ever called under /projects.
*/
// The one place a robots tag is written for a 404. Next adds <meta name="robots" content="noindex">
// itself to a page it renders for a 404, which covers the root not-found page and not-found.tsx,
// so notFoundMetadata leaves it out. This page is prerendered and only given its 404 afterwards,
// by the proxy, and Next does not add the tag to a prerendered page, so it is stated here: one
// tag, the same one.
export const metadata: Metadata = { ...notFoundMetadata("Project not found"), robots: { index: false } };

export default ProjectNotFound;
