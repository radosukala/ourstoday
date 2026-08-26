
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    // Integration suites share one worker so each file can point the
    // database URL at its own scratch database without cross-talk.
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 120000,
  },
});

