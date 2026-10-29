import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'fixlist-portal*.spec.ts',workers:1,retries:0,timeout:900000,expect:{timeout:20000},reporter:[['list']],use:{baseURL:'http://localhost:5174',browserName:'chromium',actionTimeout:15000,navigationTimeout:45000,headless:true,screenshot:'only-on-failure',trace:'retain-on-failure'}});
