import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // First test in a file pays the cold-start cost of loading Fastify + plugins.
    testTimeout: 15_000,
    // The integration tests share ONE Postgres database. Run files one at a time
    // when it is in use, so one file never sees another's half-finished rows.
    fileParallelism: !process.env.TEST_DATABASE_URL,
  },
});
