import { defineConfig } from "@playwright/test";

const PORT = 3100;
const baseURL = "http://127.0.0.1:" + PORT;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  globalTeardown: "./tests/e2e/global-teardown.ts",
  webServer: {
    command: "bash tests/e2e/serve.sh",
    url: baseURL + "/api/health",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
