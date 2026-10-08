import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

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
    ...["/cad/:path*", "/ftc/:path*", "/projects/:path*"].map((source) => ({
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