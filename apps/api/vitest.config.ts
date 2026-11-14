import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // First test in a file pays the cold-start cost of loading Fastify + plugins.
    testTimeout: 15_000,
  },
});
