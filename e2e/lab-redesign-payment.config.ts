import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'lab-redesign-payment.spec.ts',timeout:360000,workers:1,retries:0,reporter:'list',outputDir:'../artifacts/lab-redesign/payment-results',use:{baseURL:'http://localhost:5174',headless:true,trace:'retain-on-failure'}});
