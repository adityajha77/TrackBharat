import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components: pages are prerendered into a static shell; anything
  // dynamic must be either cached ("use cache") or streamed inside <Suspense>.
  cacheComponents: true,
  partialPrefetching: true,

  // Our shared package ships TypeScript source; let Next compile it.
  transpilePackages: ["@trackbharat/shared"],

  // Docker: produce a self-contained server in .next/standalone (no full node_modules).
  output: "standalone",
  // Monorepo: trace dependencies from the repo root, not just apps/web.
  outputFileTracingRoot: path.join(__dirname, "../.."),

  // Issue photos are served by the API; the browser fetches them from our own
  // origin (/media/…) and Next.js proxies the request, so the API can stay private.
  async rewrites() {
    return [{ source: "/media/:path*", destination: `${process.env.API_URL ?? "http://localhost:4000"}/v1/media/:path*` }];
  },

  // Allow photo uploads through Server Actions (the default body limit is 1 MB)
  experimental: { serverActions: { bodySizeLimit: "8mb" } },

  turbopack: {
    root: path.join(__dirname, "../.."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
