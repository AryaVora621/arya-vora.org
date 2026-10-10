import type { Metadata } from "next";
import { PROJECTS } from "@/data/projects";
import type { Project, ProjectCategory } from "@/data/projects/types";
import { ProjectCard, isCutout, type ProjectCardSize } from "@/components/projects/ProjectCard";
import { ScrollChoreography } from "@/components/portfolio/ScrollChoreography";
import { projectMetadata } from "./project-metadata";

const INTRO = "My robots, hardware and software, each with a page of its own.";

export const metadata: Metadata = projectMetadata({
  title: "Projects",
  description: INTRO,
  path: "/projects",
});

const CATEGORIES: readonly ProjectCategory[] = ["Robotics", "Hardware", "Software"];

type Slot = { span: number; size: ProjectCardSize };

// The grid is 12 columns. Cards go two to a row. Renders and cutouts, which stand free on the page
// at every shape, go at 7 and 5, the wide side switching from row to row, so the page does not
// read as a uniform tile. Screenshots are all one shape (the software covers, 16 to 10) and fill
// their cells (ProjectCard.tsx), so a group of them goes at 6 and 6: two covers of one size per
// row, edge to edge with the grid. An odd count ends on a row of three, and a lone card takes the
// whole row.
function slotsFor(count: number, even: boolean): Slot[] {
  if (count === 1) return [{ span: 12, size: "large" }];
  const pairs = count % 2 === 0 ? count : count - 3;
  const slots: Slot[] = [];
  for (let i = 0; i < pairs; i += 2) {
    const wideFirst = (i / 2) % 2 === 0;
    const [first, second] = even ? [6, 6] : wideFirst ? [7, 5] : [5, 7];
    slots.push({ span: first, size: "large" }, { span: second, size: "large" });
  }
  for (let i = pairs; i < count; i++) slots.push({ span: 4, size: "medium" });
  return slots;
}

function Group({ category, projects }: { category: ProjectCategory; projects: Project[] }) {
  const id = category.toLowerCase();
  const slots = slotsFor(
    projects.length,
    projects.every((project) => !isCutout(project.cover)),
  );
  return (
    <section id={id} className="pindex-group site-shell" aria-labelledby={`${id}-title`}>
      <div className="section-heading">
        <h2 id={`${id}-title`}>{category}</h2>
      </div>
      <div className="pindex-grid">
        {projects.map((project, i) => (
          <div
            className="pindex-cell"
            data-span={slots[i].span}
            key={project.slug}
          >
            <ProjectCard project={project} size={slots[i].size} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ProjectsIndex() {
  return (
    <>
      <ScrollChoreography />
      <header className="pindex-head site-shell">
        <h1>Projects</h1>
        <p>{INTRO}</p>
      </header>
      {CATEGORIES.map((category) => {
        const projects = PROJECTS.filter((project) => project.category === category);
        return projects.length ? (
          <Group category={category} projects={projects} key={category} />
        ) : null;
      })}
    </>
  );
}
