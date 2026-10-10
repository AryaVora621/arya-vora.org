import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

// The names of the files in public/projects, for src/proxy.ts. The proxy answers an address like
// /projects/tally.webp itself when no such file exists (see the file), and on Vercel it cannot
// read public/ at run time, so the list is taken here, when the config loads for the build, and
// Next inlines it into the proxy as process.env.PROJECT_PUBLIC_FILES. A new image is listed by
// the next build or the next `next dev` start; until then the dev server answers it with the 404
// page, so restart it after adding one. Dotfiles (.DS_Store) are not served and are left out.
function projectPublicFiles(): string {
  try {
    return JSON.stringify(
      readdirSync(join(process.cwd(), "public", "projects")).filter((name) => !name.startsWith(".")),
    );
  } catch {
    // No such folder: no file can be there.
    return "[]";
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  env: { PROJECT_PUBLIC_FILES: projectPublicFiles() },

  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  experimental: {
    optimizePackageImports: ["three", "gsap"],
  },

  turbopack: {
    resolveAlias: {
      "@/*": "./src/*",
    },
  },

  // games.arya-vora.org serves the /games section from this same deployment.
  rewrites: async () => ({
    beforeFiles: [
      // The sitemap and robots of the games host are their own (src/app/games/sitemap.ts and
      // robots.txt/route.ts). The rule below skips anything with a dot, so without these two the
      // host would answer with the main site's files, which name www.arya-vora.org only.
      {
        source: "/sitemap.xml",
        has: [{ type: "host", value: "games.arya-vora.org" }],
        destination: "/games/sitemap.xml",
      },
      {
        source: "/robots.txt",
        has: [{ type: "host", value: "games.arya-vora.org" }],
        destination: "/games/robots.txt",
      },
      {
        source: "/",
        has: [{ type: "host", value: "games.arya-vora.org" }],
        destination: "/games",
      },
      {
        // Skip Next internals, files with an extension, and paths already under /games.
        source: "/:path((?!_next/|games(?:/|$))[^.]+)",
        has: [{ type: "host", value: "games.arya-vora.org" }],
        destination: "/games/:path",
      },
    ],
    afterFiles: [],
    fallback: [],
  }),

  headers: async () => [
    {
      source: "/:path*",
      headers: [
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Referrer-Policy",
          value: "origin-when-cross-origin",
        },
      ],
    },
    {
      source: "/:path*.svg",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    // The film packs live in a directory named by a hash of their contents
    // (scripts/grade-frames-bw.mjs), so a changed film gets a new URL and the old one can
    // be kept for good. A repeat visit then skips about 2 MB of revalidation requests.
    {
      source: "/sequence/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    // CAD renders, team photos and project screenshots keep their file names when they are
    // regenerated, so they get a day, then serve stale for a week while the browser checks.
    // /projects is also a page route, so only its images match there; the HTML keeps the
    // default no-cache so a deploy shows up on the next visit.
    ...["/cad/:path*", "/ftc/:path*", "/projects/:path*.webp"].map((source) => ({
      source,
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=86400, stale-while-revalidate=604800",
        },
      ],
    })),
    // The two roboPet stills are regenerated under the same names, so they stay on a short
    // lifetime.
    {
      source: "/robopet/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=3600, stale-while-revalidate=86400",
        },
      ],
    },
  ],
};

export default nextConfig;