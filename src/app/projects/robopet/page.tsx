import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProject } from "@/data/projects";
import { RoboPetFilm } from "@/components/robopet/RoboPetFilm";
import { RoboPetExploded } from "@/components/robopet/RoboPetExploded";
import { RoboPetBuildLog } from "@/components/robopet/RoboPetBuildLog";
import type { CustomBlocks } from "@/components/projects/ProjectBlocks";
import { ProjectView, projectPageMetadata } from "../_view/project-view";

/*
  /projects/robopet has a route of its own, and not a place in ./[slug]/page.tsx, so that the
  build log, and the stylesheet RoboPetBuildLog.module.css makes for it, are imported by this page
  alone (see ../reaper/page.tsx). The film and the exploded view come in the same way, which
  keeps every roboPet component in the one route that renders it. All three blocks are in this
  page's HTML in full.
*/
const ROBOPET_BLOCKS: CustomBlocks = {
  "robopet-film": RoboPetFilm,
  "robopet-exploded": RoboPetExploded,
  "robopet-build-log": RoboPetBuildLog,
};

const project = getProject("robopet");

export const metadata: Metadata = project ? projectPageMetadata(project) : {};

export default function RoboPetPage() {
  if (!project) notFound();
  return <ProjectView project={project} custom={ROBOPET_BLOCKS} />;
}
