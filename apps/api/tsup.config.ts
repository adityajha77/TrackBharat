import { defineConfig } from "tsup";

// Bundles the API into dist/ for production. `noExternal` inlines our workspace
// package, because @trackbharat/shared ships TypeScript source, not compiled JS.
export default defineConfig({
  // Named entries → flat output: dist/server.js, dist/migrate.js, dist/seed.js
  entry: { server: "src/server.ts", worker: "src/worker.ts", migrate: "src/db/migrate.ts", seed: "src/db/seed.ts", import: "src/imports/run.ts", "set-role": "src/scripts/set-role.ts" },
  format: ["esm"],
  target: "node22",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  noExternal: ["@trackbharat/shared"],
});
