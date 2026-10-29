import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'lab-redesign-refunds.spec.ts',timeout:180000,workers:1,retries:0,reporter:'list',outputDir:'../artifacts/lab-redesign/refund-results',use:{baseURL:'http://localhost:5174',headless:true,trace:'retain-on-failure'}});
