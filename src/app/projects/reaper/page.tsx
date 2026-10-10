import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProject } from "@/data/projects";
import {
  ReaperIterationsBlock,
  ReaperModelBlock,
  ReaperResultsBlock,
  ReaperRoleBlock,
  ReaperSpecsBlock,
} from "@/components/ftc/ReaperBlocks";
import type { CustomBlocks } from "@/components/projects/ProjectBlocks";
import { ProjectView, projectPageMetadata } from "../_view/project-view";

/*
  /projects/reaper has a route of its own, and not a place in ./[slug]/page.tsx, so that the
  Reaper blocks, and the stylesheet that ReaperBlocks.module.css makes for them, are imported by
  this page alone. Imported by the shared page they were part of every project page's route, and
  each of those, and the 404 under /projects, fetched about 5 KB of CSS for blocks it never
  renders. The blocks themselves are still in this page's HTML in full: there is no dynamic import
  and no loading placeholder, so a visitor without script reads every one.
*/
const REAPER_BLOCKS: CustomBlocks = {
  "reaper-model": ReaperModelBlock,
  "reaper-specs": ReaperSpecsBlock,
  "reaper-iterations": ReaperIterationsBlock,
  "reaper-results": ReaperResultsBlock,
  "reaper-role": ReaperRoleBlock,
};

const project = getProject("reaper");

export const metadata: Metadata = project ? projectPageMetadata(project) : {};

export default function ReaperPage() {
  if (!project) notFound();
  return <ProjectView project={project} custom={REAPER_BLOCKS} />;
}
