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

  // Stamped at build time so the footer date tracks the deploy.
  env: {
    BUILD_DATE: new Date().toISOString().slice(0, 10),
  },

  experimental: {
    optimizePackageImports: ["three"],
  },

  turbopack: {
    resolveAlias: {
      "@/*": "./src/*",
    },
  },

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
    // The film folder is named after a hash of its contents, and the model stills live in a
    // versioned folder, so neither changes under its URL. Change the hash or the version
    // folder, never the files in place.
    ...["/sequence/:path*", "/robopet/v1/:path*"].map((source) => ({
      source,
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    })),
  ],
};

export default nextConfig;