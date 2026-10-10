import type { CSSProperties } from "react";
import Link from "next/link";
import type { Project } from "@/data/projects/types";
import { ProjectImage, isCutout } from "@/components/projects/ProjectCard";
import { coverCrop, phoneCropStyle } from "@/components/projects/coverCrops";
import { keepNumbers } from "@/components/projects/keepNumbers";
import { teaserFor } from "./teasers";

/*
  One preview card on the home page: a picture, the title, one line, and the year and status.
  The /projects index uses the fuller ProjectCard; this one is built for a short, image-first
  grid. The whole card is one link to /projects/<slug>: the title carries it, and a stretched
  ::after over the card makes the picture clickable too, so a screen reader hears one link.

  A CAD render or a robot still is drawn whole, with room around it. A software cover is a
  3200 by 2000 picture of one window, made so that one feature of the app reads at card size,
  and it is cropped to that feature: COVER_CROPS (src/components/projects/coverCrops.ts) gives
  the crop as a box in the cover for each layout, the desktop grid, the two columns from 601 to
  1100 px (`m`) and a phone (`p`), where a software card spans both columns (ProjectPreviews.tsx)
  so that its text reads. home.css turns the box into a zoom and a focus point.
  Styles are in src/app/home.css under .home-card.
*/

export type HomeCardSpan = 4 | 6;

const SIZES: Record<HomeCardSpan, string> = {
  4: "(max-width: 1100px) 50vw, 33vw",
  6: "(max-width: 1100px) 50vw, 50vw",
};

export function HomeProjectCard({ project, span }: { project: Project; span: HomeCardSpan }) {
  const crop = coverCrop(project.slug);
  const cutout = isCutout(project.cover);
  const narrow = crop?.m ?? crop;
  const style = crop
    ? ({
        "--x0": crop.x0,
        "--y0": crop.y0,
        "--w": crop.w,
        "--mx0": narrow?.x0,
        "--my0": narrow?.y0,
        "--mw": narrow?.w,
        ...phoneCropStyle(crop),
      } as CSSProperties)
    : undefined;
  return (
    <article className="home-card" data-cutout={cutout || undefined} data-cropped={crop ? "" : undefined}>
      <div className="home-card-media" style={style}>
        <ProjectImage
          image={project.cover}
          sizes={SIZES[span]}
          className="home-card-img"
          decorative
          tint="always"
        />
      </div>
      <div className="home-card-body">
        <h3 className="home-card-title">
          <Link href={`/projects/${project.slug}`} className="home-card-link" prefetch={false}>
            {project.title}
          </Link>
        </h3>
        <p className="home-card-teaser">{keepNumbers(teaserFor(project))}</p>
        <p className="home-card-meta">
          <span className="mono">{project.year}</span>
          <span>{project.status}</span>
        </p>
      </div>
    </article>
  );
}
