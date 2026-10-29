import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: "bloodbank-journey.spec.ts",
  timeout: 300000,
  expect: { timeout: 15000 },
  workers: 1,
  retries: 0,
  reporter: "list",
  outputDir: "../artifacts/bloodbank-journey/test-results",
  use: {
    baseURL: "http://localhost:5174",
    headless: true,
    screenshot: "only-on-failure",
  },
});
