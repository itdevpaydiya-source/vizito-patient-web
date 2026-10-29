import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'notifications*.spec.ts',timeout:120000,retries:0,reporter:'list',use:{baseURL:'http://localhost:5174',trace:'retain-on-failure'}});
