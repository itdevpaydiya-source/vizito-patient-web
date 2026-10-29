import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'D:\\Vizito-latest6\\artifacts\\auth-v2-walk';
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function runAuthWalk() {
  console.log('Starting Auth V2 Redesign Walk...');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const viewports = [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    console.log(`\n=== Testing Viewport: ${vp.name.toUpperCase()} (${vp.width}x${vp.height}) ===`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: vp.name === 'mobile'
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        : undefined,
    });
    const page = await context.newPage();

    // Clear session storage / local storage
    await page.goto('http://localhost:5174/auth/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle' });

    // ------------------------------------------------------------------------
    // Walk 1: Wrong password error
    // ------------------------------------------------------------------------
    console.log(`[${vp.name}] Walk 1: Wrong password error...`);
    await page.fill('input[placeholder="Enter 10-digit mobile or email"]', '8866314762');
    await page.fill('input[placeholder="Enter your password"]', 'WrongPass@2026');
    await page.click('button[type="submit"]:has-text("Log in")');

    // Wait for error alert banner
    await page.waitForSelector('.auth-v2-alert-error', { timeout: 10000 });
    const errText = await page.innerText('.auth-v2-alert-error');
    console.log(`[${vp.name}] Wrong password error displayed:`, errText);

    const shot1 = path.join(ARTIFACTS_DIR, `auth_wrong_password_${vp.name}.png`);
    await page.screenshot({ path: shot1, fullPage: true });

    // ------------------------------------------------------------------------
    // Walk 2: OTP login
    // ------------------------------------------------------------------------
    console.log(`[${vp.name}] Walk 2: OTP login...`);
    await page.click('button:has-text("Log in with OTP instead")');
    await page.waitForSelector('input[placeholder="98765 43210"]');

    await page.fill('input[placeholder="98765 43210"]', '8866314762');

    // Intercept send-otp response to get dev_otp
    const [sendOtpRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/patient/auth/send-otp') && res.status() === 200),
      page.click('button:has-text("Send OTP")'),
    ]);
    const sendOtpData = await sendOtpRes.json();
    const devOtp = String(sendOtpData.dev_otp || '123456');
    console.log(`[${vp.name}] OTP generated:`, devOtp);

    await page.waitForSelector('.auth-v2-otp-grid');
    const otpBoxes = await page.$$('.auth-v2-otp-box');
    for (let i = 0; i < 6; i++) {
      await otpBoxes[i].fill(devOtp[i]);
    }

    const shot2 = path.join(ARTIFACTS_DIR, `auth_otp_login_${vp.name}.png`);
    await page.screenshot({ path: shot2, fullPage: true });

    // Click Log In
    await page.click('button[type="submit"]:has-text("Log in")');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log(`[${vp.name}] OTP Login successful! Landed on:`, page.url());

    // Clear session again for next flow
    await page.evaluate(() => localStorage.clear());

    // ------------------------------------------------------------------------
    // Walk 3: New account with OTP (QA test number)
    // ------------------------------------------------------------------------
    console.log(`[${vp.name}] Walk 3: Create new account with OTP...`);
    await page.goto('http://localhost:5174/auth/register', { waitUntil: 'networkidle' });
    await page.waitForSelector('button[aria-selected="true"]:has-text("Create account")');

    // Random test number to ensure clean run
    const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
    const testPhone = `98${randomDigits}`;
    console.log(`[${vp.name}] Test registration phone:`, testPhone);

    await page.fill('input[placeholder="e.g. Kavya Reddy"]', `QA Tester ${randomDigits}`);
    await page.fill('input[placeholder="98765 43210"]', testPhone);
    await page.fill('input[placeholder="name@example.com"]', `tester.${randomDigits}@vizito.demo`);
    await page.fill('input[type="date"]', '1995-05-15');
    await page.fill('input[placeholder="Create a strong password"]', 'Vizito@2026Test#');
    await page.fill('input[placeholder="Re-enter password"]', 'Vizito@2026Test#');
    await page.check('input[type="checkbox"]');

    // Intercept register send-otp response to get dev_otp
    const [regSendOtpRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/patient/auth/register/send-otp') && res.status() === 200),
      page.click('button[type="submit"]:has-text("Send OTP")'),
    ]);
    const regOtpData = await regSendOtpRes.json();
    const regDevOtp = String(regOtpData.dev_otp || '123456');
    console.log(`[${vp.name}] Registration OTP received:`, regDevOtp);

    await page.waitForSelector('.auth-v2-otp-grid');
    // Click the dev Auto-fill button if present, or fill boxes
    const autoFillBtn = await page.$('button:has-text("Auto-fill")');
    if (autoFillBtn) {
      await autoFillBtn.click();
    } else {
      const regOtpBoxes = await page.$$('.auth-v2-otp-box');
      for (let i = 0; i < 6; i++) {
        await regOtpBoxes[i].fill(regDevOtp[i]);
      }
    }
    await page.waitForTimeout(500);

    const shot3 = path.join(ARTIFACTS_DIR, `auth_create_account_${vp.name}.png`);
    await page.screenshot({ path: shot3, fullPage: true });

    // Submit registration
    console.log(`[${vp.name}] Submitting registration...`);
    const submitBtn = page.locator('button[type="submit"]:has-text("Verify & Create account")');
    await submitBtn.waitFor({ state: 'visible' });
    await submitBtn.click();

    // Check for potential API error or redirection
    try {
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      console.log(`[${vp.name}] Registration successful! Redirected to dashboard.`);
    } catch (urlErr) {
      const alertMsg = await page.$eval('.auth-v2-alert-error', el => el.innerText).catch(() => 'no alert');
      console.error(`[${vp.name}] Registration failed to navigate to dashboard. Alert on screen:`, alertMsg);
      throw urlErr;
    }

    // Clear session for Walk 4
    await page.evaluate(() => localStorage.clear());

    // ------------------------------------------------------------------------
    // Walk 4: Forgot password reset
    // ------------------------------------------------------------------------
    console.log(`[${vp.name}] Walk 4: Forgot password reset...`);
    await page.goto('http://localhost:5174/auth/login', { waitUntil: 'networkidle' });
    await page.click('button:has-text("Forgot password?")');

    // Step 1: Request OTP
    await page.waitForSelector('input[placeholder="Enter mobile or email"]');
    await page.fill('input[placeholder="Enter mobile or email"]', '8866314762');

    const [forgotSendRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/patient/auth/forgot-password') && res.status() === 200),
      page.click('button[type="submit"]:has-text("Send OTP")'),
    ]);
    const forgotData = await forgotSendRes.json();
    const forgotOtp = String(forgotData.dev_otp || '123456');
    console.log(`[${vp.name}] Forgot password OTP:`, forgotOtp);

    // Step 2: Enter OTP
    await page.waitForSelector('.auth-v2-otp-grid');
    const forgotBoxes = await page.$$('.auth-v2-otp-box');
    for (let i = 0; i < 6; i++) {
      await forgotBoxes[i].fill(forgotOtp[i]);
    }
    await page.click('button[type="submit"]:has-text("Verify OTP")');

    // Step 3: Set new password
    await page.waitForSelector('input[placeholder="Enter new strong password"]');
    await page.fill('input[placeholder="Enter new strong password"]', 'Vizito@2026');

    const shot4 = path.join(ARTIFACTS_DIR, `auth_forgot_password_${vp.name}.png`);
    await page.screenshot({ path: shot4, fullPage: true });

    await page.click('button[type="submit"]:has-text("Reset password")');
    await page.waitForSelector('.auth-v2-alert-success', { timeout: 10000 });
    const successMsg = await page.innerText('.auth-v2-alert-success');
    console.log(`[${vp.name}] Password reset complete! Message:`, successMsg);

    await context.close();
  }

  await browser.close();
  console.log('\nAll Auth V2 walks completed successfully!');
}

runAuthWalk().catch(console.error);
