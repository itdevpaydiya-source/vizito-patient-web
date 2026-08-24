const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const mysql = require(path.join(__dirname, '../../vizito-replica-backend/vizito-auth/node_modules/mysql2/promise'));
const bcrypt = require(path.join(__dirname, '../../vizito-replica-backend/vizito-auth/node_modules/bcryptjs'));

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

async function createPatientFixture(email, phone, password, fullName) {
  const conn = await getDbConnection();
  const hash = await bcrypt.hash(password, 10);
  
  const [userRes] = await conn.execute(
    `INSERT INTO users (first_name, last_name, email, phone, is_active, created_at, updated_at)
     VALUES (?, '', ?, ?, 1, NOW(), NOW())`,
    [fullName, email, phone]
  );
  const userId = userRes.insertId;

  await conn.execute(
    `INSERT INTO user_passwords (user_id, password_hash, is_active, created_at, updated_at)
     VALUES (?, ?, 1, NOW(), NOW())`,
    [userId, hash]
  );

  const [roles] = await conn.execute(`SELECT id FROM roles WHERE name = 'patient' LIMIT 1`);
  const roleId = roles[0]?.id || 6;
  await conn.execute(
    `INSERT INTO user_roles (user_id, role_id, created_at, updated_at)
     VALUES (?, ?, NOW(), NOW())`,
    [userId, roleId]
  );

  await conn.execute(
    `INSERT INTO patient_profiles (id, user_id, patient_code, created_at, updated_at)
     VALUES (UUID(), ?, ?, NOW(), NOW())`,
    [userId, `VIZITO-PT-${String(userId).padStart(6, '0')}`]
  );

  await conn.end();
  return { userId, email, phone, password, fullName };
}

async function loginPatientInBrowser(page, email, password) {
  await page.goto('http://localhost:5174/auth/login', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  const emailPassTab = page.locator('button:has-text("Email + Pass")').first();
  await emailPassTab.click();
  await page.waitForTimeout(300);

  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.fill(email);

  const passInput = page.locator('input[type="password"]').first();
  await passInput.fill(password);

  const submitBtn = page.locator('button:has-text("Log In with Password"), button[type="submit"]').first();
  await submitBtn.click();

  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

async function runBatch1() {
  console.log('===============================================================');
  console.log('STARTING BATCH 1: FE-AUTH-001 through FE-NAV-003 (10 Tests)');
  console.log('===============================================================');

  const results = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

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
  let fixtureUser = null;
  try {
    const unique = Date.now().toString().slice(-8);
    const testPhone = `98${unique}`;
    const testEmail = `pw_patient_${unique}@vizito.test`;
    const testPassword = 'Password123!';
    const testName = `PW Patient ${unique}`;

    fixtureUser = await createPatientFixture(testEmail, testPhone, testPassword, testName);

    await loginPatientInBrowser(page, testEmail, testPassword);
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

    const emailPassTab = page.locator('button:has-text("Email + Pass")').first();
    await emailPassTab.click();
    await page.waitForTimeout(300);

    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('pw_patient_test@vizito.test');

    const passInput = page.locator('input[type="password"]').first();
    await passInput.fill('WrongPassword123!');

    const submitBtn = page.locator('button:has-text("Log In with Password"), button[type="submit"]').first();
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
    const regName = `Sarah Connor`;
    const regPassword = 'Password123!';

    await page.goto('http://localhost:5174/auth/register', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });

    // Step 1: Verification
    const phoneInput = page.locator('input[type="tel"]').first();
    await phoneInput.fill(regPhone);

    const sendOtpBtn = page.locator('button:has-text("Send Verification OTP"), button:has-text("Send OTP")').first();
    await sendOtpBtn.click();

    await page.waitForTimeout(1000);

    const conn = await getDbConnection();
    const testOtp = '123456';
    const testOtpHash = await bcrypt.hash(testOtp, 10);
    await conn.execute(
      `UPDATE registration_otps SET otp_hash = ? WHERE identifier = ? ORDER BY created_at DESC LIMIT 1`,
      [testOtpHash, regPhone]
    );
    await conn.end();

    const otpInput = page.locator('input[maxlength="6"], input[placeholder*="OTP" i], input[placeholder*="code" i]').first();
    await otpInput.fill(testOtp);

    const verifyOtpBtn = page.locator('button:has-text("Verify OTP")').first();
    await verifyOtpBtn.click();

    // Step 2: Personal Info
    await page.waitForSelector('input[placeholder*="Sarah Connor" i], input[placeholder*="Full Name" i]', { timeout: 10000 });
    const nameInput = page.locator('input[placeholder*="Sarah Connor" i], input[placeholder*="Full Name" i]').first();
    await nameInput.fill(regName);

    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(regEmail);
    }

    const passInput = page.locator('input[placeholder*="Minimum 6 characters" i], input[type="password"]').first();
    await passInput.fill(regPassword);

    const confirmPassInput = page.locator('input[placeholder*="Re-enter password" i], input[placeholder*="Confirm" i]').first();
    await confirmPassInput.fill(regPassword);

    const nextStepBtn = page.locator('button:has-text("Proceed to Address Information"), button:has-text("Continue")').first();
    await nextStepBtn.click();

    // Step 3: Address Info
    await page.waitForSelector('input[placeholder*="House" i], input[placeholder*="Street" i]', { timeout: 8000 });
    const streetInput = page.locator('input[placeholder*="House" i], input[placeholder*="Street" i]').first();
    await streetInput.fill('123 Health Ave');

    const cityInput = page.locator('input[placeholder="City"]').first();
    await cityInput.fill('Mumbai');

    const stateInput = page.locator('input[placeholder="State"]').first();
    await stateInput.fill('Maharashtra');

    const pinInput = page.locator('input[placeholder*="Pincode" i], input[placeholder*="PIN" i]').first();
    await pinInput.fill('400001');

    const saveAddressBtn = page.locator('button:has-text("Save Address")').first();
    await saveAddressBtn.click();
    await page.waitForTimeout(500);

    const proceedToReviewBtn = page.locator('button:has-text("Proceed to Review")').first();
    await proceedToReviewBtn.click();

    // Step 4: Review & Complete
    await page.waitForSelector('button:has-text("Complete Registration")', { timeout: 8000 });
    const completeRegBtn = page.locator('button:has-text("Complete Registration")').first();
    await completeRegBtn.click();

    await page.waitForURL('**/dashboard', { timeout: 10000 });
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

    const phoneInput = page.locator('input[type="tel"]').first();
    await phoneInput.fill('12345');

    const sendOtpBtn = page.locator('button:has-text("Send Verification OTP"), button:has-text("Send OTP")').first();
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
    
    const googleScript = await page.evaluate(() => !!document.getElementById('google-gis-script') || !!window.google);
    const googleBtnOrContainer = page.locator('div[class*="google"], #google-gis-script, div:has(iframe[src*="google"]), div:has-text("Google"), div:has-text("Continue with")').first();
    const isGooglePresent = (await googleBtnOrContainer.count() > 0) || googleScript;

    const pass = isGooglePresent;
    results.push({
      id: 'FE-AUTH-005',
      title: 'Google sign-in option',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'Google sign-in option is visible/wired in authentication options',
      actual: `isGooglePresent=${isGooglePresent}, googleScriptAttached=${googleScript}`,
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
    
    const forgotBtn = page.locator('button:has-text("Forgot Password?"), button:has-text("Forgot")').first();
    await forgotBtn.click();

    await page.waitForTimeout(500);
    const forgotTitle = page.locator('text=/Forgot Password/i').first();
    const isForgotOpen = await forgotTitle.isVisible();

    const recoveryInput = page.locator('input[type="tel"]').first();
    await recoveryInput.fill('12345');

    const sendRecoveryBtn = page.locator('button:has-text("Send Recovery OTP")').first();
    await sendRecoveryBtn.click();
    await page.waitForTimeout(500);

    const errorBanner = page.locator('text=/Please enter a valid 10-digit mobile number/i').first();
    const validationVisible = await errorBanner.isVisible();

    const pass = isForgotOpen && validationVisible;
    results.push({
      id: 'FE-AUTH-006',
      title: 'Forgot password',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'Forgot-password screen opens, required validation works, user receives feedback',
      actual: `isForgotOpen=${isForgotOpen}, validationVisible=${validationVisible}`,
      evidence: { isForgotOpen, validationVisible, errorText: validationVisible ? await errorBanner.innerText() : null },
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
  // FE-NAV-001: Home button
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-NAV-001: Home button ---');
  try {
    if (!fixtureUser) {
      const u = Date.now().toString().slice(-8);
      fixtureUser = await createPatientFixture(`nav_doc_${u}@vizito.test`, `97${u}`, 'Password123!', `Nav Patient ${u}`);
    }
    await loginPatientInBrowser(page, fixtureUser.email, fixtureUser.password);

    await page.goto('http://localhost:5174/my-records', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const homeBtn = page.locator('button[aria-label="Home"]').first();
    if (await homeBtn.isVisible()) {
      await homeBtn.click();
    }

    await page.waitForTimeout(1000);
    const returnedToDashboard = page.url().includes('/dashboard');

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
    if (!fixtureUser) {
      const u = Date.now().toString().slice(-8);
      fixtureUser = await createPatientFixture(`nav_doc_${u}@vizito.test`, `97${u}`, 'Password123!', `Nav Patient ${u}`);
    }
    await loginPatientInBrowser(page, fixtureUser.email, fixtureUser.password);

    const servicesLink = page.locator('a[href="/services"], a[href="/healthcare-services"]').first();
    if (await servicesLink.isVisible()) {
      await servicesLink.click();
      await page.waitForTimeout(500);
    } else {
      await page.goto('http://localhost:5174/services', { waitUntil: 'networkidle' });
    }

    const bookingLink = page.locator('a[href="/booking"], button:has-text("Book Appointment")').first();
    if (await bookingLink.isVisible()) {
      await bookingLink.click();
      await page.waitForTimeout(500);
    } else {
      await page.goto('http://localhost:5174/booking', { waitUntil: 'networkidle' });
    }

    const backBtn = page.locator('button[aria-label="Back"]').first();
    let backWorked = false;
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await page.waitForTimeout(500);
      backWorked = page.url().includes('/services') || page.url().includes('/dashboard');
    } else {
      await page.goBack();
      backWorked = page.url().includes('/services') || page.url().includes('/dashboard');
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
    if (!fixtureUser) {
      const u = Date.now().toString().slice(-8);
      fixtureUser = await createPatientFixture(`nav_doc_${u}@vizito.test`, `97${u}`, 'Password123!', `Nav Patient ${u}`);
    }
    await loginPatientInBrowser(page, fixtureUser.email, fixtureUser.password);

    const servicesLink = page.locator('a[href="/services"], a[href="/healthcare-services"]').first();
    if (await servicesLink.isVisible()) {
      await servicesLink.click();
      await page.waitForTimeout(500);
    } else {
      await page.goto('http://localhost:5174/services', { waitUntil: 'networkidle' });
    }

    const recordsLink = page.locator('a[href="/my-records"], a[href="/records"]').first();
    if (await recordsLink.isVisible()) {
      await recordsLink.click();
      await page.waitForTimeout(500);
    } else {
      await page.goto('http://localhost:5174/my-records', { waitUntil: 'networkidle' });
    }

    await page.goBack();
    await page.waitForTimeout(500);
    const atServices = page.url().includes('/services') || page.url().includes('/healthcare-services');

    await page.goBack();
    await page.waitForTimeout(500);
    const atDashboard = page.url().includes('/dashboard');

    const authUser = await page.evaluate(() => localStorage.getItem('vizito_user'));
    const notLoggedOut = !!authUser;

    const pass = atDashboard && notLoggedOut;
    results.push({
      id: 'FE-NAV-003',
      title: 'Browser back button',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'Handles browser navigation correctly, no unexpected logout, no blank page',
      actual: `atServices=${atServices}, atDashboard=${atDashboard}, notLoggedOut=${notLoggedOut}`,
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

  // ---------------------------------------------------------------------------
  // FE-AUTH-007: Logout
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-AUTH-007: Logout ---');
  try {
    if (!fixtureUser) {
      const u = Date.now().toString().slice(-8);
      fixtureUser = await createPatientFixture(`nav_doc_${u}@vizito.test`, `97${u}`, 'Password123!', `Nav Patient ${u}`);
    }
    await loginPatientInBrowser(page, fixtureUser.email, fixtureUser.password);

    // Open profile menu dropdown in header
    const profileDropdownTrigger = page.locator('header div:has-text("Patient Profile"), header div.cursor-pointer:has(.w-8.h-8)').first();
    let logoutSuccess = false;
    let urlAfterLogout = '';

    await profileDropdownTrigger.waitFor({ state: 'visible', timeout: 5000 });
    await profileDropdownTrigger.click();
    await page.waitForTimeout(500);

    const signoutBtn = page.locator('button:has-text("Sign Out")').first();
    await signoutBtn.waitFor({ state: 'visible', timeout: 5000 });
    await signoutBtn.click();
    await page.waitForTimeout(1000);

    urlAfterLogout = page.url();
    const storageCleared = await page.evaluate(() => !localStorage.getItem('vizito_user') && !localStorage.getItem('vizito_token'));
    logoutSuccess = urlAfterLogout.includes('/auth/login') && storageCleared;

    const pass = logoutSuccess;
    results.push({
      id: 'FE-AUTH-007',
      title: 'Logout',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'User is logged out, tokens removed, login screen is displayed',
      actual: `logoutSuccess=${logoutSuccess}, urlAfterLogout=${urlAfterLogout}`,
      evidence: { urlAfterLogout },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-AUTH-007 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-AUTH-007 Error:', err.message);
    results.push({
      id: 'FE-AUTH-007',
      title: 'Logout',
      status: 'FAIL',
      expected: 'User is logged out and redirected to login',
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
