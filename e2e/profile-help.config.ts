import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: "profile-help.spec.ts",
  timeout: 360000,
  expect: { timeout: 20000 },
  workers: 1,
  retries: 0,
  reporter: "list",
  outputDir: "../artifacts/profile-help/test-results",
  use: {
    baseURL: "http://localhost:5174",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
