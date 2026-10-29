import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'family-journey.spec.ts',timeout:900000,expect:{timeout:10000},workers:1,retries:0,reporter:[['list']],use:{actionTimeout:15000,navigationTimeout:30000,baseURL:'http://localhost:5174',browserName:'chromium',headless:true,launchOptions:{args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']},screenshot:'only-on-failure',trace:'retain-on-failure'}});

