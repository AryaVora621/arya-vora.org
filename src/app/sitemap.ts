import type { MetadataRoute } from "next";
import { PROJECTS } from "@/data/projects";

const SITE = "https://www.arya-vora.org";

// The home page, the projects index and one page per project. The home page's sections (#about,
// #contact) are places on one page, not URLs of their own. /games is left out: its canonical
// address is games.arya-vora.org, a separate host.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE}/projects`, changeFrequency: "monthly", priority: 0.8 },
    ...PROJECTS.map((project) => ({
      url: `${SITE}/projects/${project.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
