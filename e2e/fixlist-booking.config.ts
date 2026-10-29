import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'fixlist-booking*.spec.ts',timeout:600000,expect:{timeout:20000},workers:1,retries:0,reporter:'list',outputDir:'../artifacts/fixlist-booking/test-results',use:{baseURL:'http://localhost:5174',headless:true,actionTimeout:30000,trace:'retain-on-failure',screenshot:'only-on-failure'}});
