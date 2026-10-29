import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'doctor-redesign*.spec.ts',timeout:300_000,expect:{timeout:30_000},workers:1,retries:0,reporter:'list',outputDir:'../artifacts/doctor-redesign/test-results',use:{baseURL:'http://localhost:5174',headless:true,actionTimeout:30_000,trace:'retain-on-failure',screenshot:'only-on-failure'}});
