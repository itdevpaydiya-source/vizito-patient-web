import { defineConfig } from '@playwright/test';

// Headed run of the urgent ambulance flow (patient → Ravi → completion), 4 s between steps.
export default defineConfig({
  testDir: '.',
  testMatch: 'ambulance-ravi-flow.spec.ts',
  timeout: 600000,
  expect: { timeout: 15000 },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5174',
    browserName: 'chromium',
    headless: false,
    viewport: { width: 1280, height: 900 },
    launchOptions: { args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] },
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
});
