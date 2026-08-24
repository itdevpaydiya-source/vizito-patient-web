const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const RESULTS_PATH = path.join(__dirname, '../../test-results/vizito-frontend-results.json');

async function getDbConnection() {
  return await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'vizito_auth',
  });
}

async function runBatch1() {
  console.log('===============================================================');
  console.log('STARTING BATCH 1: FE-AUTH-001 through FE-NAV-003 (10 Tests)');
  console.log('===============================================================');

  const results = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Load existing results if any
  let allResults = {
    date: new Date().toISOString().slice(0, 10),
    totalExecuted: 0,
    summary: { pass: 0, fail: 0, blocked: 0, real_bugs: [] },
    results: []
  };

  if (fs.existsSync(RESULTS_PATH)) {
    try {
      allResults = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // FE-AUTH-001: Patient login with valid credentials
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-AUTH-001: Patient login with valid credentials ---');
  try {
    const unique = Date.now().toString().slice(-8);
    const testPhone = `98${unique}`;
    const testEmail = `pw_patient_${unique}@vizito.test`;
    const testPassword = 'Password123!';

    const conn = await getDbConnection();
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(testPassword, 10);
    
    const [userRes] = await conn.execute(
      `INSERT INTO users (full_name, email, phone, role, status, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 'patient', 'Active', 1, NOW(), NOW())`,
      [`Test Patient ${unique}`, testEmail, testPhone]
    );
    const userId = userRes.insertId;

    await conn.execute(
      `INSERT INTO user_passwords (user_id, password_hash, is_active, created_at, updated_at)
       VALUES (?, ?, 1, NOW(), NOW())`,
      [userId, hash]
    );

    await conn.execute(
      `INSERT INTO patient_profiles (user_id, patient_id, full_name, phone, email, status, created_at, updated_at)
       VALUES (?, UUID(), ?, ?, ?, 'Active', NOW(), NOW())`,
      [userId, `Test Patient ${unique}`, testPhone, testEmail]
    );
    await conn.end();

    await page.goto('http://localhost:5174/auth/login', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });

    const passwordTab = page.locator('button', { hasText: /Password/i }).first();
    if (await passwordTab.isVisible()) {
      await passwordTab.click();
    }

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="mobile" i], input[placeholder*="phone" i]').first();
    const passInput = page.locator('input[type="password"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill(testEmail);
    } else if (await phoneInput.isVisible()) {
      await phoneInput.fill(testPhone);
    }

    await passInput.fill(testPassword);

    const submitBtn = page.locator('button[type="submit"]', { hasText: /Login|Sign In|Continue/i }).first();
    await submitBtn.click();

    await page.waitForURL('**/dashboard', { timeout: 8000 });
    const isDashboard = page.url().includes('/dashboard');

    const authUser = await page.evaluate(() => localStorage.getItem('vizito_user'));
    const authToken = await page.evaluate(() => localStorage.getItem('vizito_token'));

    const pass = isDashboard && !!authUser;
    results.push({
      id: 'FE-AUTH-001',
      title: 'Patient login with valid credentials',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'User is successfully logged in, patient dashboard appears, no error displayed',
      actual: `URL=${page.url()}, authUser=${!!authUser}, authToken=${!!authToken}`,
      evidence: { url: page.url(), user: authUser ? JSON.parse(authUser) : null },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-AUTH-001 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-AUTH-001 Error:', err.message);
    results.push({
      id: 'FE-AUTH-001',
      title: 'Patient login with valid credentials',
      status: 'FAIL',
      expected: 'User is successfully logged in, patient dashboard appears',
      actual: `Error: ${err.message}`,
      evidence: { error: err.stack },
      classification: 'REAL_BUG'
    });
  }

  // ---------------------------------------------------------------------------
  // FE-AUTH-002: Patient login with incorrect password
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-AUTH-002: Patient login with incorrect password ---');
  try {
    await page.goto('http://localhost:5174/auth/login', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });

    const passwordTab = page.locator('button', { hasText: /Password/i }).first();
    if (await passwordTab.isVisible()) {
      await passwordTab.click();
    }

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passInput = page.locator('input[type="password"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill('pw_patient_test@vizito.test');
    }
    await passInput.fill('WrongPassword123!');

    const submitBtn = page.locator('button[type="submit"]', { hasText: /Login|Sign In|Continue/i }).first();
    await submitBtn.click();

    await page.waitForTimeout(1000);
    const errorBanner = page.locator('text=/Invalid credentials|check your password|incorrect|Unauthorized/i').first();
    const errorVisible = await errorBanner.isVisible();
    const stayedOnLogin = page.url().includes('/auth/login');

    const pass = errorVisible && stayedOnLogin;
    results.push({
      id: 'FE-AUTH-002',
      title: 'Patient login with incorrect password',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'Login does not succeed, clear error message displayed, user remains on login screen',
      actual: `errorVisible=${errorVisible}, stayedOnLogin=${stayedOnLogin}, errorText=${errorVisible ? await errorBanner.innerText() : 'none'}`,
      evidence: { errorText: errorVisible ? await errorBanner.innerText() : null, url: page.url() },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-AUTH-002 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-AUTH-002 Error:', err.message);
    results.push({
      id: 'FE-AUTH-002',
      title: 'Patient login with incorrect password',
      status: 'FAIL',
      expected: 'Clear error message displayed, user remains on login screen',
      actual: `Error: ${err.message}`,
      evidence: { error: err.stack },
      classification: 'REAL_BUG'
    });
  }

  // ---------------------------------------------------------------------------
  // FE-AUTH-003: Patient registration
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-AUTH-003: Patient registration ---');
  try {
    const regUnique = Date.now().toString().slice(-8);
    const regPhone = `88${regUnique}`;
    const regEmail = `reg_patient_${regUnique}@vizito.test`;
    const regName = `PW Reg Patient ${regUnique}`;
    const regPassword = 'Password123!';

    await page.goto('http://localhost:5174/auth/register', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });

    // Step 1: Verification
    const phoneInput = page.locator('input[placeholder*="mobile" i], input[placeholder*="phone" i], input[type="tel"]').first();
    await phoneInput.fill(regPhone);

    const sendOtpBtn = page.locator('button', { hasText: /Send OTP/i }).first();
    await sendOtpBtn.click();

    await page.waitForTimeout(1500);

    const conn = await getDbConnection();
    const bcrypt = require('bcryptjs');
    const testOtp = '123456';
    const testOtpHash = await bcrypt.hash(testOtp, 10);
    await conn.execute(
      `UPDATE registration_otps SET otp_hash = ? WHERE identifier = ? ORDER BY created_at DESC LIMIT 1`,
      [testOtpHash, regPhone]
    );
    await conn.end();

    const otpInput = page.locator('input[placeholder*="OTP" i], input[placeholder*="code" i], input[maxlength="6"]').first();
    await otpInput.fill(testOtp);

    const verifyOtpBtn = page.locator('button', { hasText: /Verify OTP/i }).first();
    await verifyOtpBtn.click();

    // Step 2: Personal Info
    await page.waitForSelector('text=Personal Info', { timeout: 5000 });
    const nameInput = page.locator('input[placeholder*="Full Name" i], input[placeholder*="Name" i]').first();
    await nameInput.fill(regName);

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(regEmail);
    }

    const passInput = page.locator('input[placeholder*="Create Password" i], input[type="password"]').first();
    await passInput.fill(regPassword);

    const confirmPassInput = page.locator('input[placeholder*="Confirm Password" i]').first();
    await confirmPassInput.fill(regPassword);

    const nextStepBtn = page.locator('button', { hasText: /Continue to Address|Next|Proceed/i }).first();
    await nextStepBtn.click();

    // Step 3: Address Info
    await page.waitForSelector('text=Address Info', { timeout: 5000 });
    const streetInput = page.locator('input[placeholder*="Street" i], input[placeholder*="Address" i]').first();
    await streetInput.fill('123 Health Ave');

    const cityInput = page.locator('input[placeholder*="City" i]').first();
    await cityInput.fill('Mumbai');

    const stateInput = page.locator('input[placeholder*="State" i]').first();
    await stateInput.fill('Maharashtra');

    const pinInput = page.locator('input[placeholder*="PIN" i], input[placeholder*="Postal" i]').first();
    await pinInput.fill('400001');

    const saveAddressBtn = page.locator('button', { hasText: /Save Address/i }).first();
    await saveAddressBtn.click();

    await page.waitForTimeout(500);
    const completeRegBtn = page.locator('button', { hasText: /Complete Registration/i }).first();
    await completeRegBtn.click();

    await page.waitForURL('**/dashboard', { timeout: 8000 });
    const isDashboard = page.url().includes('/dashboard');

    const pass = isDashboard;
    results.push({
      id: 'FE-AUTH-003',
      title: 'Patient registration',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'Registration progresses through each step, leads to dashboard',
      actual: `Final URL=${page.url()}, isDashboard=${isDashboard}`,
      evidence: { url: page.url(), registeredPhone: regPhone, registeredEmail: regEmail },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-AUTH-003 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-AUTH-003 Error:', err.message);
    results.push({
      id: 'FE-AUTH-003',
      title: 'Patient registration',
      status: 'FAIL',
      expected: 'Registration progresses through each step, leads to dashboard',
      actual: `Error: ${err.message}`,
      evidence: { error: err.stack },
      classification: 'REAL_BUG'
    });
  }

  // ---------------------------------------------------------------------------
  // FE-AUTH-004: Invalid registration data
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-AUTH-004: Invalid registration data ---');
  try {
    await page.goto('http://localhost:5174/auth/register', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });

    const phoneInput = page.locator('input[placeholder*="mobile" i], input[placeholder*="phone" i], input[type="tel"]').first();
    await phoneInput.fill('12345');

    const sendOtpBtn = page.locator('button', { hasText: /Send OTP/i }).first();
    await sendOtpBtn.click();

    await page.waitForTimeout(500);
    const errorBanner = page.locator('text=/Please enter a valid 10-digit mobile number/i').first();
    const errorVisible = await errorBanner.isVisible();

    const pass = errorVisible;
    results.push({
      id: 'FE-AUTH-004',
      title: 'Invalid registration data',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'Appropriate field-level validation appears, invalid data not silently accepted',
      actual: `errorVisible=${errorVisible}, errorText=${errorVisible ? await errorBanner.innerText() : 'none'}`,
      evidence: { errorText: errorVisible ? await errorBanner.innerText() : null },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-AUTH-004 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-AUTH-004 Error:', err.message);
    results.push({
      id: 'FE-AUTH-004',
      title: 'Invalid registration data',
      status: 'FAIL',
      expected: 'Appropriate field-level validation appears',
      actual: `Error: ${err.message}`,
      evidence: { error: err.stack },
      classification: 'REAL_BUG'
    });
  }

  // ---------------------------------------------------------------------------
  // FE-AUTH-005: Google sign-in option
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-AUTH-005: Google sign-in option ---');
  try {
    await page.goto('http://localhost:5174/auth/login', { waitUntil: 'networkidle' });
    
    const googleContainer = page.locator('#google-gis-script, div[class*="google"], div:has(iframe[src*="google"]), div:has-text("Google"), div:has-text("Continue with")').first();
    const googleScript = await page.evaluate(() => !!document.getElementById('google-gis-script') || !!document.querySelector('div[ref="googleBtnRef"]'));
    const isGooglePresent = await googleContainer.count() > 0 || googleScript;

    const pass = isGooglePresent;
    results.push({
      id: 'FE-AUTH-005',
      title: 'Google sign-in option',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'Google sign-in option is visible/wired in authentication options',
      actual: `isGooglePresent=${isGooglePresent}`,
      evidence: { googleScriptAttached: googleScript },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-AUTH-005 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-AUTH-005 Error:', err.message);
    results.push({
      id: 'FE-AUTH-005',
      title: 'Google sign-in option',
      status: 'FAIL',
      expected: 'Google sign-in option is visible',
      actual: `Error: ${err.message}`,
      evidence: { error: err.stack },
      classification: 'REAL_BUG'
    });
  }

  // ---------------------------------------------------------------------------
  // FE-AUTH-006: Forgot password
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-AUTH-006: Forgot password ---');
  try {
    await page.goto('http://localhost:5174/auth/login', { waitUntil: 'networkidle' });
    const forgotBtn = page.locator('button', { hasText: /Forgot Password/i }).first();
    await forgotBtn.click();

    await page.waitForTimeout(500);
    const forgotTitle = page.locator('text=/Reset Password|Forgot Password|Account Recovery/i').first();
    const isForgotOpen = await forgotTitle.isVisible();

    const sendRecoveryBtn = page.locator('button', { hasText: /Send OTP|Send Recovery|Continue/i }).first();
    if (await sendRecoveryBtn.isVisible()) {
      await sendRecoveryBtn.click();
      await page.waitForTimeout(500);
    }
    const hasValidation = page.locator('text=/Please enter|required|valid/i').first();
    const validationVisible = await hasValidation.isVisible();

    const pass = isForgotOpen && validationVisible;
    results.push({
      id: 'FE-AUTH-006',
      title: 'Forgot password',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'Forgot-password screen opens, required validation works, user receives feedback',
      actual: `isForgotOpen=${isForgotOpen}, validationVisible=${validationVisible}`,
      evidence: { isForgotOpen, validationVisible },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-AUTH-006 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-AUTH-006 Error:', err.message);
    results.push({
      id: 'FE-AUTH-006',
      title: 'Forgot password',
      status: 'FAIL',
      expected: 'Forgot password screen opens and validation works',
      actual: `Error: ${err.message}`,
      evidence: { error: err.stack },
      classification: 'REAL_BUG'
    });
  }

  // ---------------------------------------------------------------------------
  // FE-AUTH-007: Logout
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-AUTH-007: Logout ---');
  try {
    await page.goto('http://localhost:5174/dashboard', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.setItem('vizito_user', JSON.stringify({ patient_id: 'test-patient-id', fullName: 'Test Patient', role: 'patient' }));
      localStorage.setItem('vizito_token', 'test-token');
    });
    await page.reload({ waitUntil: 'networkidle' });

    const logoutBtn = page.locator('button, a', { hasText: /Logout|Sign Out/i }).first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    } else {
      const profileMenu = page.locator('button[aria-label*="user" i], button:has(img), div[class*="avatar"]').first();
      if (await profileMenu.isVisible()) {
        await profileMenu.click();
        await page.waitForTimeout(300);
        const menuLogout = page.locator('button, a', { hasText: /Logout|Sign Out/i }).first();
        if (await menuLogout.isVisible()) {
          await menuLogout.click();
        }
      }
    }

    await page.waitForTimeout(1000);
    await page.goto('http://localhost:5174/dashboard', { waitUntil: 'networkidle' });
    const isRedirectedToLogin = page.url().includes('/auth/login') || !page.url().includes('/dashboard');

    const pass = isRedirectedToLogin;
    results.push({
      id: 'FE-AUTH-007',
      title: 'Logout',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'User is logged out, protected screens are no longer accessible, redirected to login',
      actual: `Final URL after accessing dashboard=${page.url()}, isRedirectedToLogin=${isRedirectedToLogin}`,
      evidence: { url: page.url() },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-AUTH-007 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-AUTH-007 Error:', err.message);
    results.push({
      id: 'FE-AUTH-007',
      title: 'Logout',
      status: 'FAIL',
      expected: 'User is logged out and protected screens redirect to login',
      actual: `Error: ${err.message}`,
      evidence: { error: err.stack },
      classification: 'REAL_BUG'
    });
  }

  // ---------------------------------------------------------------------------
  // FE-NAV-001: Home button
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-NAV-001: Home button ---');
  try {
    await page.goto('http://localhost:5174/dashboard', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.setItem('vizito_user', JSON.stringify({ patient_id: 'test-patient-id', fullName: 'Test Patient', role: 'patient' }));
      localStorage.setItem('vizito_token', 'test-token');
    });
    await page.reload({ waitUntil: 'networkidle' });

    await page.goto('http://localhost:5174/records', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const homeBtn = page.locator('a[href="/dashboard"], a[href="/"], button:has-text("Home"), button:has-text("Dashboard")').first();
    if (await homeBtn.isVisible()) {
      await homeBtn.click();
    } else {
      const logo = page.locator('img[alt*="logo" i], a:has(img)').first();
      await logo.click();
    }

    await page.waitForTimeout(1000);
    const returnedToDashboard = page.url().includes('/dashboard') || page.url().endsWith(':5174/');

    const pass = returnedToDashboard;
    results.push({
      id: 'FE-NAV-001',
      title: 'Home button',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'User returns to correct home/dashboard screen from deeper levels, no broken screen',
      actual: `Final URL=${page.url()}, returnedToDashboard=${returnedToDashboard}`,
      evidence: { url: page.url() },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-NAV-001 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-NAV-001 Error:', err.message);
    results.push({
      id: 'FE-NAV-001',
      title: 'Home button',
      status: 'FAIL',
      expected: 'Returns to dashboard screen',
      actual: `Error: ${err.message}`,
      evidence: { error: err.stack },
      classification: 'REAL_BUG'
    });
  }

  // ---------------------------------------------------------------------------
  // FE-NAV-002: Back button
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-NAV-002: Back button ---');
  try {
    await page.goto('http://localhost:5174/dashboard', { waitUntil: 'networkidle' });
    await page.goto('http://localhost:5174/services', { waitUntil: 'networkidle' });
    await page.goto('http://localhost:5174/booking', { waitUntil: 'networkidle' });

    const backBtn = page.locator('button:has-text("Back"), button[aria-label*="back" i], button:has(svg.lucide-arrow-left)').first();
    let backWorked = false;
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await page.waitForTimeout(500);
      backWorked = page.url().includes('/services') || page.url().includes('/dashboard');
    } else {
      await page.goBack();
      backWorked = page.url().includes('/services');
    }

    const pass = backWorked;
    results.push({
      id: 'FE-NAV-002',
      title: 'Back button',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'Back returns from Screen C to Screen B, navigation history behaves naturally',
      actual: `URL after back=${page.url()}, backWorked=${backWorked}`,
      evidence: { url: page.url() },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-NAV-002 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-NAV-002 Error:', err.message);
    results.push({
      id: 'FE-NAV-002',
      title: 'Back button',
      status: 'FAIL',
      expected: 'Back returns to previous screen',
      actual: `Error: ${err.message}`,
      evidence: { error: err.stack },
      classification: 'REAL_BUG'
    });
  }

  // ---------------------------------------------------------------------------
  // FE-NAV-003: Browser back button
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-NAV-003: Browser back button ---');
  try {
    await page.goto('http://localhost:5174/dashboard', { waitUntil: 'networkidle' });
    await page.goto('http://localhost:5174/consultations', { waitUntil: 'networkidle' });
    await page.goto('http://localhost:5174/records', { waitUntil: 'networkidle' });

    await page.goBack();
    const atConsultations = page.url().includes('/consultations');

    await page.goBack();
    const atDashboard = page.url().includes('/dashboard');

    const authUser = await page.evaluate(() => localStorage.getItem('vizito_user'));
    const notLoggedOut = !!authUser;

    const pass = atDashboard && notLoggedOut;
    results.push({
      id: 'FE-NAV-003',
      title: 'Browser back button',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'Handles browser navigation correctly, no unexpected logout, no blank page',
      actual: `atConsultations=${atConsultations}, atDashboard=${atDashboard}, notLoggedOut=${notLoggedOut}`,
      evidence: { finalUrl: page.url(), loggedIn: notLoggedOut },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-NAV-003 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-NAV-003 Error:', err.message);
    results.push({
      id: 'FE-NAV-003',
      title: 'Browser back button',
      status: 'FAIL',
      expected: 'Handles browser navigation correctly without unexpected logout',
      actual: `Error: ${err.message}`,
      evidence: { error: err.stack },
      classification: 'REAL_BUG'
    });
  }

  await browser.close();

  // Merge results
  for (const r of results) {
    const idx = allResults.results.findIndex(existing => existing.id === r.id);
    if (idx >= 0) {
      allResults.results[idx] = r;
    } else {
      allResults.results.push(r);
    }
  }

  allResults.totalExecuted = allResults.results.length;
  allResults.summary.pass = allResults.results.filter(r => r.status === 'PASS').length;
  allResults.summary.fail = allResults.results.filter(r => r.status === 'FAIL').length;
  allResults.summary.blocked = allResults.results.filter(r => r.status === 'BLOCKED').length;
  allResults.summary.real_bugs = allResults.results.filter(r => r.classification === 'REAL_BUG').map(r => r.id);

  fs.mkdirSync(path.dirname(RESULTS_PATH), { recursive: true });
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(allResults, null, 2), 'utf8');

  console.log('\n===============================================================');
  console.log(`BATCH 1 COMPLETE: ${results.filter(r => r.status === 'PASS').length}/10 PASSED`);
  console.log('===============================================================');
}

runBatch1().catch(console.error);
