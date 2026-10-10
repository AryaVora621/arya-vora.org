import type { Project } from "@/data/projects/types";

// What the page's metadata needs to know about a project's share card, kept apart from card.tsx
// so a page that only names the card does not pull in the image renderer.

export const SHARE_SIZE = { width: 1200, height: 630 } as const;
export const SHARE_CONTENT_TYPE = "image/png";

// Where a project's card is served (src/app/projects/[slug]/card.png/route.ts).
export const shareCardPath = (slug: string) => `/projects/${slug}/card.png`;

// The words for a preview that cannot show the picture: the title and kind of project, then what
// the cover shows.
export function shareAlt(project: Project): string {
  return `${project.title}, a ${project.category.toLowerCase()} project by Arya Vora, ${project.year}. ${project.cover.alt}`;
}
