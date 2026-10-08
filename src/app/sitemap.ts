import type { MetadataRoute } from "next";

// The portfolio is a single page. The section anchors are not separate URLs.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.arya-vora.org/",
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
