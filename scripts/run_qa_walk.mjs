import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'D:\\Vizito-latest6\\artifacts\\qa-walk-20261029';
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

const ROUTES = [
  { name: 'Dashboard', path: '/dashboard', slug: 'dashboard' },
  { name: 'Explore Services', path: '/healthcare-services', slug: 'explore_services' },
  { name: 'Doctors (Find)', path: '/find-doctors', slug: 'find_doctors' },
  { name: 'Hospitals & Clinics', path: '/find-hospitals', slug: 'find_hospitals' },
  { name: 'Lab Tests Browse', path: '/lab-tests', slug: 'lab_tests' },
  { name: 'Lab Bookings', path: '/lab-bookings', slug: 'lab_bookings' },
  { name: 'Home Care', path: '/home-care', slug: 'home_care' },
  { name: 'Pharmacy Store', path: '/pharmacy-orders/new', slug: 'pharmacy_store' },
  { name: 'Pharmacy Orders', path: '/pharmacy-orders', slug: 'pharmacy_orders' },
  { name: 'Equipment Catalogue', path: '/equipment-rental', slug: 'equipment_catalogue' },
  { name: 'Equipment Active Rentals', path: '/equipment-rental/active', slug: 'equipment_active' },
  { name: 'Book Ambulance', path: '/book-ambulance', slug: 'book_ambulance' },
  { name: 'Urgent Ambulance', path: '/urgent-ambulance', slug: 'urgent_ambulance' },
  { name: 'Ambulance Trips', path: '/ambulance-trips', slug: 'ambulance_trips' },
  { name: 'Find Blood', path: '/find-blood', slug: 'find_blood' },
  { name: 'Request Blood', path: '/request-blood', slug: 'request_blood' },
  { name: 'Donate Blood', path: '/donate-blood', slug: 'donate_blood' },
  { name: 'Blood Requests', path: '/blood-requests', slug: 'blood_requests' },
  { name: 'My Bookings', path: '/bookings', slug: 'bookings' },
  { name: 'Medical Records', path: '/my-records', slug: 'my_records' },
  { name: 'Family Profiles', path: '/family-profiles', slug: 'family_profiles' },
  { name: 'Profile & Personal Info', path: '/profile', slug: 'profile' },
  { name: 'Settings', path: '/settings', slug: 'settings' },
  { name: 'Help & Support', path: '/help', slug: 'help_support' },
  { name: 'Notifications', path: '/notifications', slug: 'notifications' },
  { name: 'Ratings & Reviews', path: '/reviews', slug: 'reviews' },
];

async function runQaWalk() {
  console.log('Logging in as Kavya Reddy (8866314762)...');
  const loginRes = await fetch('http://localhost:3000/patient/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '8866314762', password: 'Vizito@2026' }),
  });
  const auth = await loginRes.json();
  const token = auth.access_token || auth.token;
  if (!token) {
    throw new Error('Login failed: ' + JSON.stringify(auth));
  }
  console.log('Login successful, token acquired.');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const viewports = [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ];

  const results = [];

  for (const vp of viewports) {
    console.log(`\n=== STARTING QA WALK FOR VIEWPORT: ${vp.name.toUpperCase()} (${vp.width}x${vp.height}) ===`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: vp.name === 'mobile'
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        : undefined,
    });

    const page = await context.newPage();

    // Collect console errors
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(`[Console Error] ${msg.text()}`);
      }
    });
    page.on('pageerror', err => {
      consoleLogs.push(`[Page Error] ${err.message}`);
    });

    // Seed session in localStorage
    await page.goto('http://localhost:5174/auth/login');
    await page.evaluate(({ token, auth }) => {
      localStorage.setItem('vizito_token', token);
      localStorage.setItem('vizito_user', JSON.stringify({
        patient_id: auth.patient_id,
        email: auth.email,
        mobile: auth.mobile,
        role: 'patient',
        fullName: auth.full_name || 'Kavya Reddy',
        token: token,
      }));
    }, { token, auth });

    for (const route of ROUTES) {
      console.log(`Checking [${vp.name}] ${route.name} (${route.path})...`);
      consoleLogs.length = 0; // Clear logs for this route
      const startTime = Date.now();
      let status = 'OK';
      let issueDetails = [];

      try {
        const response = await page.goto(`http://localhost:5174${route.path}`, {
          waitUntil: 'networkidle',
          timeout: 20000,
        });

        await page.waitForTimeout(1000);

        // Check if redirected to login
        const currentUrl = page.url();
        if (currentUrl.includes('/auth/login')) {
          status = 'BUG';
          issueDetails.push('Session unexpectedly dropped or redirected to /auth/login');
        }

        // Check for 404 or uncaught error boundary text
        const bodyText = await page.innerText('body');
        if (bodyText.includes('Something went wrong') || bodyText.includes('Application Error')) {
          status = 'BUG';
          issueDetails.push('React Error Boundary triggered');
        }

        // Check for horizontal overflow (patient-safety / responsive bug)
        const hasHorizontalOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth + 2;
        });
        if (hasHorizontalOverflow && vp.name === 'mobile') {
          status = status === 'OK' ? 'GAP' : status;
          issueDetails.push('Horizontal scroll overflow detected on 390px viewport');
        }

        if (consoleLogs.length > 0) {
          // Filter known benign warnings vs actual errors
          const seriousErrors = consoleLogs.filter(l =>
            !l.includes('Download the React DevTools') &&
            !l.includes('favicon.ico') &&
            !l.includes('Failed to load resource: net::ERR_CONNECTION_REFUSED')
          );
          if (seriousErrors.length > 0) {
            issueDetails.push(...seriousErrors);
          }
        }

        const screenshotFileName = `${route.slug}_${vp.name}.png`;
        const screenshotFilePath = path.join(ARTIFACTS_DIR, screenshotFileName);
        await page.screenshot({ path: screenshotFilePath, fullPage: true });

        results.push({
          viewport: vp.name,
          width: vp.width,
          name: route.name,
          path: route.path,
          status,
          issues: issueDetails,
          screenshot: screenshotFileName,
          durationMs: Date.now() - startTime,
        });

      } catch (err) {
        console.error(`Error loading ${route.path} on ${vp.name}:`, err.message);
        const screenshotFileName = `${route.slug}_${vp.name}_error.png`;
        const screenshotFilePath = path.join(ARTIFACTS_DIR, screenshotFileName);
        try {
          await page.screenshot({ path: screenshotFilePath, fullPage: true });
        } catch (_) {}

        results.push({
          viewport: vp.name,
          width: vp.width,
          name: route.name,
          path: route.path,
          status: 'BUG',
          issues: [`Navigation/Timeout failure: ${err.message}`],
          screenshot: screenshotFileName,
          durationMs: Date.now() - startTime,
        });
      }
    }

    await context.close();
  }

  await browser.close();

  const reportPath = path.join(ARTIFACTS_DIR, 'qa_walk_raw.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nQA Walk Complete! Raw results saved to: ${reportPath}`);
}

runQaWalk().catch(console.error);
