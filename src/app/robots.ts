import type { MetadataRoute } from "next";

// One public page, so everything is open to crawlers. The site address matches
// metadataBase in layout.tsx.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://www.arya-vora.org/sitemap.xml",
  };
}
