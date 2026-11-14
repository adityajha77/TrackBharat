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
