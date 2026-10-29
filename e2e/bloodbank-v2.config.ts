import { defineConfig } from "@playwright/test";
export default defineConfig({testDir:".",testMatch:"bloodbank-v2-visual.spec.ts",timeout:180000,workers:1,retries:0,reporter:"list",outputDir:"../artifacts/bloodbank-v2/test-results",use:{baseURL:"http://localhost:5174",headless:true,trace:"retain-on-failure"}});
