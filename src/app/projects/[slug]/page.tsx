import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PROJECTS, getProject } from "@/data/projects";
import { notFoundMetadata } from "../project-metadata";
import { OWN_ROUTE } from "../_view/own-routes";
import { ProjectView, projectPageMetadata } from "../_view/project-view";

type Props = { params: Promise<{ slug: string }> };

// Every project but the ones in OWN_ROUTE (they have a static route, which Next answers first; the
// filter keeps this page from building them a second time) is built ahead of time, and nothing
// else is: dynamicParams is false, so an address outside the list is never rendered here. Next
// answers it with its own 404 page. A project address that names nothing (/projects/nope) does not
// get that far: src/proxy.ts rewrites it to /projects/missing, which shows the not-found message
// under the same nav and sub-tabs. Rendering it here would mean notFound(), and Next 16 answers
// notFound() from a page with an empty <html id="__next_error__"> shell whose message is drawn only
// after the scripts load (see missing/page.tsx), and stores that shell under the slug as typed.
//
// A case variant of a real slug (/projects/Robopet, /projects/roboPet) never gets here either: it
// would make Next render the page for a slug that is no project and store that 404 under the key
// of the real page, because Next keys what it stores without regard to case and renders for the
// slug as typed. src/proxy.ts sends those addresses to the lower-case one first.
export const dynamicParams = false;

export function generateStaticParams() {
  return PROJECTS.filter((project) => !OWN_ROUTE.has(project.slug)).map((project) => ({
    slug: project.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = OWN_ROUTE.has(slug) ? undefined : getProject(slug);
  if (!project) return notFoundMetadata("Project not found");
  return projectPageMetadata(project);
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = OWN_ROUTE.has(slug) ? undefined : getProject(slug);
  if (!project) notFound();
  return <ProjectView project={project} />;
}
