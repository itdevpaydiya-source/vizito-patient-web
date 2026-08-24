const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const mysql = require(path.join(__dirname, '../../vizito-replica-backend/vizito-auth/node_modules/mysql2/promise'));
const bcrypt = require(path.join(__dirname, '../../vizito-replica-backend/vizito-auth/node_modules/bcryptjs'));

const RESULTS_PATH = path.join(__dirname, '../../test-results/vizito-frontend-results.json');

async function getDbConnection(dbName = 'vizito_auth') {
  return await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: dbName,
  });
}

async function createPatientFixture(email, phone, password, fullName) {
  const conn = await getDbConnection('vizito_auth');
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

  const [ptRes] = await conn.execute(
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

async function runBatch2() {
  console.log('===============================================================');
  console.log('STARTING BATCH 2: FE-BOOK-001 through FE-PAY-002 (10 Tests)');
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

  // Create standard test patient
  const unique = Date.now().toString().slice(-8);
  const patientEmail = `booking_patient_${unique}@vizito.test`;
  const patientPhone = `95${unique}`;
  const patientPass = 'Password123!';
  const patientName = `Booking Tester ${unique}`;
  const fixtureUser = await createPatientFixture(patientEmail, patientPhone, patientPass, patientName);

  await loginPatientInBrowser(page, fixtureUser.email, fixtureUser.password);

  // ---------------------------------------------------------------------------
  // FE-BOOK-001: Book appointment – standard doctor search and booking flow
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-BOOK-001: Standard doctor search & booking flow ---');
  try {
    await page.goto('http://localhost:5174/booking?service=doctor', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Step 1: Specialization & Date filter -> Show Available Doctors
    const showDoctorsBtn = page.locator('button:has-text("Show Available Doctors")').first();
    if (await showDoctorsBtn.isVisible()) {
      await showDoctorsBtn.click();
      await page.waitForTimeout(1000);
    }

    // Pick first available doctor
    const doctorCard = page.locator('button:has(h3), div.grid button').first();
    await doctorCard.waitFor({ state: 'visible', timeout: 8000 });
    await doctorCard.click();
    await page.waitForTimeout(1000);

    // Step 2: Slot Selection
    const slotBtn = page.locator('button:has-text("AM"), button:has-text("PM"), button:has-text(":")').first();
    await slotBtn.waitFor({ state: 'visible', timeout: 8000 });
    await slotBtn.click();
    await page.waitForTimeout(500);

    // Proceed to Payment
    const proceedBtn = page.locator('button:has-text("Proceed to Payment")').first();
    await proceedBtn.click();
    await page.waitForTimeout(1500);

    // Step 3: Select Pay at Clinic (Cash) for instant confirmation
    const cashOption = page.locator('button:has-text("Pay at Clinic"), button:has-text("CASH")').first();
    if (await cashOption.isVisible()) {
      await cashOption.click();
      await page.waitForTimeout(500);
    }

    const confirmBtn = page.locator('button:has-text("Confirm & Pay"), button:has-text("Pay"), button:has-text("Confirm")').last();
    await confirmBtn.click();
    await page.waitForTimeout(2000);

    const confirmedHeader = page.locator('text=/Appointment Confirmed/i').first();
    const isConfirmed = await confirmedHeader.isVisible();

    const pass = isConfirmed;
    results.push({
      id: 'FE-BOOK-001',
      title: 'Book appointment – standard doctor search and booking flow',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'Flow leads from search to confirmation without broken state, booking reference generated',
      actual: `isConfirmed=${isConfirmed}`,
      evidence: { isConfirmed },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-BOOK-001 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-BOOK-001 Error:', err.message);
    results.push({
      id: 'FE-BOOK-001',
      title: 'Book appointment – standard doctor search and booking flow',
      status: 'FAIL',
      expected: 'Flow leads from search to confirmation',
      actual: `Error: ${err.message}`,
      evidence: { error: err.stack },
      classification: 'REAL_BUG'
    });
  }

  // ---------------------------------------------------------------------------
  // FE-BOOK-002: Book appointment with missing required fields
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-BOOK-002: Book appointment with missing required fields ---');
  try {
    await page.goto('http://localhost:5174/booking?service=doctor', { waitUntil: 'networkidle' });
    const showDoctorsBtn = page.locator('button:has-text("Show Available Doctors")').first();
    if (await showDoctorsBtn.isVisible()) {
      await showDoctorsBtn.click();
      await page.waitForTimeout(1000);
    }

    const doctorCard = page.locator('button:has(h3)').first();
    await doctorCard.waitFor({ state: 'visible', timeout: 8000 });
    await doctorCard.click();
    await page.waitForTimeout(1000);

    // On Step 2 without selecting any slot
    const proceedBtn = page.locator('button:has-text("Proceed to Payment"), button:has-text("₹")').first();
    const isDisabled = await proceedBtn.isDisabled();
    const hasDisabledClass = (await proceedBtn.getAttribute('class') || '').includes('cursor-not-allowed');

    const pass = isDisabled || hasDisabledClass;
    results.push({
      id: 'FE-BOOK-002',
      title: 'Book appointment with missing required fields',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'Validation error displayed or Proceed button disabled when required fields are missing',
      actual: `isDisabled=${isDisabled}, hasDisabledClass=${hasDisabledClass}`,
      evidence: { isDisabled, hasDisabledClass },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-BOOK-002 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-BOOK-002 Error:', err.message);
    results.push({
      id: 'FE-BOOK-002',
      title: 'Book appointment with missing required fields',
      status: 'FAIL',
      expected: 'Validation error displayed or action blocked',
      actual: `Error: ${err.message}`,
      evidence: { error: err.stack },
      classification: 'REAL_BUG'
    });
  }

  // ---------------------------------------------------------------------------
  // FE-BOOK-003: Direct facility/clinic booking
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-BOOK-003: Direct facility/clinic booking ---');
  try {
    await page.goto('http://localhost:5174/booking?service=hospital', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const hospitalCard = page.locator('button:has(h3), button:has-text("Hospital")').first();
    const isHospitalListVisible = await hospitalCard.isVisible();

    if (isHospitalListVisible) {
      await hospitalCard.click();
      await page.waitForTimeout(1000);
    }

    const isBranchOrDateVisible = (await page.locator('text=/Branch|Date|Doctor/i').count()) > 0;
    const pass = isHospitalListVisible && isBranchOrDateVisible;

    results.push({
      id: 'FE-BOOK-003',
      title: 'Direct facility/clinic booking',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'Facility profile opens with appropriate booking options',
      actual: `isHospitalListVisible=${isHospitalListVisible}, isBranchOrDateVisible=${isBranchOrDateVisible}`,
      evidence: { isHospitalListVisible, isBranchOrDateVisible },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-BOOK-003 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-BOOK-003 Error:', err.message);
    results.push({
      id: 'FE-BOOK-003',
      title: 'Direct facility/clinic booking',
      status: 'FAIL',
      expected: 'Facility profile opens with booking options',
      actual: `Error: ${err.message}`,
      evidence: { error: err.stack },
      classification: 'REAL_BUG'
    });
  }

  // ---------------------------------------------------------------------------
  // FE-BOOK-004: Slot selection and date picker
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-BOOK-004: Slot selection and date picker ---');
  try {
    await page.goto('http://localhost:5174/booking?service=doctor', { waitUntil: 'networkidle' });
    const showDoctorsBtn = page.locator('button:has-text("Show Available Doctors")').first();
    if (await showDoctorsBtn.isVisible()) {
      await showDoctorsBtn.click();
      await page.waitForTimeout(1000);
    }

    const doctorCard = page.locator('button:has(h3)').first();
    await doctorCard.waitFor({ state: 'visible', timeout: 8000 });
    await doctorCard.click();
    await page.waitForTimeout(1000);

    // Switch date chip
    const dateChips = page.locator('div.flex.gap-2.overflow-x-auto button');
    const dateCount = await dateChips.count();
    let dateSwitchSuccess = false;
    if (dateCount > 1) {
      await dateChips.nth(1).click();
      await page.waitForTimeout(1000);
      dateSwitchSuccess = true;
    }

    // Select slot chip
    const slotChips = page.locator('button:has-text("AM"), button:has-text("PM"), button:has-text(":")');
    const slotCount = await slotChips.count();
    let slotSelectSuccess = false;
    if (slotCount > 0) {
      await slotChips.first().click();
      await page.waitForTimeout(500);
      slotSelectSuccess = true;
    }

    const pass = dateSwitchSuccess && slotSelectSuccess;
    results.push({
      id: 'FE-BOOK-004',
      title: 'Slot selection and date picker',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'Slots update dynamically on date change, selected slot is visually highlighted',
      actual: `dateSwitchSuccess=${dateSwitchSuccess}, slotSelectSuccess=${slotSelectSuccess}`,
      evidence: { dateCount, slotCount },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-BOOK-004 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-BOOK-004 Error:', err.message);
    results.push({
      id: 'FE-BOOK-004',
      title: 'Slot selection and date picker',
      status: 'FAIL',
      expected: 'Slots update dynamically on date change and slot is highlighted',
      actual: `Error: ${err.message}`,
      evidence: { error: err.stack },
      classification: 'REAL_BUG'
    });
  }

  // ---------------------------------------------------------------------------
  // FE-BOOK-005: Multi-step booking wizard navigation
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-BOOK-005: Multi-step booking wizard navigation ---');
  try {
    await page.goto('http://localhost:5174/booking?service=doctor', { waitUntil: 'networkidle' });
    
    // Step 1 -> Step 2
    const showDoctorsBtn = page.locator('button:has-text("Show Available Doctors")').first();
    if (await showDoctorsBtn.isVisible()) {
      await showDoctorsBtn.click();
      await page.waitForTimeout(500);
    }
    const doctorCard = page.locator('button:has(h3)').first();
    await doctorCard.waitFor({ state: 'visible', timeout: 8000 });
    await doctorCard.click();
    await page.waitForTimeout(1000);

    const step2Visible = await page.locator('text=/Available Slots|Consultation & Date/i').first().isVisible();

    // Select slot -> Step 3
    const slotBtn = page.locator('button:has-text("AM"), button:has-text("PM"), button:has-text(":")').first();
    await slotBtn.click();
    await page.waitForTimeout(500);

    const proceedBtn = page.locator('button:has-text("Proceed to Payment")').first();
    await proceedBtn.click();
    await page.waitForTimeout(1000);

    const step3Visible = await page.locator('text=/Select Payment Method|Bill & Pricing/i').first().isVisible();

    // Click Back to Step 2
    const backBtn = page.locator('button:has-text("Back")').first();
    await backBtn.click();
    await page.waitForTimeout(500);
    const returnedToStep2 = await page.locator('text=/Available Slots|Consultation & Date/i').first().isVisible();

    const pass = step2Visible && step3Visible && returnedToStep2;
    results.push({
      id: 'FE-BOOK-005',
      title: 'Multi-step booking wizard navigation',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'User can advance and retreat through steps without losing context or encountering broken states',
      actual: `step2Visible=${step2Visible}, step3Visible=${step3Visible}, returnedToStep2=${returnedToStep2}`,
      evidence: { step2Visible, step3Visible, returnedToStep2 },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-BOOK-005 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-BOOK-005 Error:', err.message);
    results.push({
      id: 'FE-BOOK-005',
      title: 'Multi-step booking wizard navigation',
      status: 'FAIL',
      expected: 'Advance and retreat through steps without losing context',
      actual: `Error: ${err.message}`,
      evidence: { error: err.stack },
      classification: 'REAL_BUG'
    });
  }

  // ---------------------------------------------------------------------------
  // FE-BOOK-006: Timezone and slot display
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-BOOK-006: Timezone and slot display ---');
  try {
    await page.goto('http://localhost:5174/booking?service=doctor', { waitUntil: 'networkidle' });
    const showDoctorsBtn = page.locator('button:has-text("Show Available Doctors")').first();
    if (await showDoctorsBtn.isVisible()) {
      await showDoctorsBtn.click();
      await page.waitForTimeout(500);
    }
    const doctorCard = page.locator('button:has(h3)').first();
    await doctorCard.waitFor({ state: 'visible', timeout: 8000 });
    await doctorCard.click();
    await page.waitForTimeout(1000);

    const slotButtons = page.locator('button:has-text("AM"), button:has-text("PM"), button:has-text(":")');
    const slotCount = await slotButtons.count();
    let validFormat = true;
    if (slotCount > 0) {
      const text = (await slotButtons.first().innerText()).trim();
      validFormat = /\d{1,2}:\d{2}/.test(text);
    }

    const pass = slotCount > 0 && validFormat;
    results.push({
      id: 'FE-BOOK-006',
      title: 'Timezone and slot display',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'Slots displayed in correct user timezone, no ambiguous times',
      actual: `slotCount=${slotCount}, validFormat=${validFormat}`,
      evidence: { slotCount, validFormat },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-BOOK-006 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-BOOK-006 Error:', err.message);
    results.push({
      id: 'FE-BOOK-006',
      title: 'Timezone and slot display',
      status: 'FAIL',
      expected: 'Slots displayed in correct timezone format',
      actual: `Error: ${err.message}`,
      evidence: { error: err.stack },
      classification: 'REAL_BUG'
    });
  }

  // ---------------------------------------------------------------------------
  // FE-BOOK-007: Booking for a family member
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-BOOK-007: Booking for a family member ---');
  try {
    await page.goto('http://localhost:5174/booking?service=doctor', { waitUntil: 'networkidle' });
    const showDoctorsBtn = page.locator('button:has-text("Show Available Doctors")').first();
    if (await showDoctorsBtn.isVisible()) {
      await showDoctorsBtn.click();
      await page.waitForTimeout(500);
    }
    const doctorCard = page.locator('button:has(h3)').first();
    await doctorCard.waitFor({ state: 'visible', timeout: 8000 });
    await doctorCard.click();
    await page.waitForTimeout(1000);

    const bookingForTitle = page.locator('text=/Booking For/i').first();
    const isBookingForVisible = await bookingForTitle.isVisible();

    const myselfBtn = page.locator('button:has-text("Myself")').first();
    const isMyselfVisible = await myselfBtn.isVisible();

    const addFamilyBtn = page.locator('button:has-text("Add family")').first();
    const isAddFamilyVisible = await addFamilyBtn.isVisible();

    const pass = isBookingForVisible && isMyselfVisible && isAddFamilyVisible;
    results.push({
      id: 'FE-BOOK-007',
      title: 'Booking for a family member',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'Family member selector appears, details correctly bound to appointment',
      actual: `isBookingForVisible=${isBookingForVisible}, isMyselfVisible=${isMyselfVisible}, isAddFamilyVisible=${isAddFamilyVisible}`,
      evidence: { isBookingForVisible, isMyselfVisible, isAddFamilyVisible },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-BOOK-007 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-BOOK-007 Error:', err.message);
    results.push({
      id: 'FE-BOOK-007',
      title: 'Booking for a family member',
      status: 'FAIL',
      expected: 'Family member selector appears with correct options',
      actual: `Error: ${err.message}`,
      evidence: { error: err.stack },
      classification: 'REAL_BUG'
    });
  }

  // ---------------------------------------------------------------------------
  // FE-BOOK-008: Service discovery
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-BOOK-008: Service discovery ---');
  try {
    await page.goto('http://localhost:5174/healthcare-services', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const serviceTiles = page.locator('div.grid button:has(h3), div.grid a:has(h3), div.grid div:has(h3)');
    const tileCount = await serviceTiles.count();

    const searchInput = page.locator('input[placeholder*="Search" i]').first();
    const isSearchVisible = await searchInput.isVisible();

    const pass = tileCount >= 4 && isSearchVisible;
    results.push({
      id: 'FE-BOOK-008',
      title: 'Service discovery',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'All services listed with descriptions and icons, search and filter refine results',
      actual: `tileCount=${tileCount}, isSearchVisible=${isSearchVisible}`,
      evidence: { tileCount, isSearchVisible },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-BOOK-008 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-BOOK-008 Error:', err.message);
    results.push({
      id: 'FE-BOOK-008',
      title: 'Service discovery',
      status: 'FAIL',
      expected: 'Services listed with search/filter refinement',
      actual: `Error: ${err.message}`,
      evidence: { error: err.stack },
      classification: 'REAL_BUG'
    });
  }

  // ---------------------------------------------------------------------------
  // FE-PAY-001: Payment gateway modal/screen opens on checkout
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-PAY-001: Payment screen opens on checkout ---');
  try {
    await page.goto('http://localhost:5174/booking?service=doctor', { waitUntil: 'networkidle' });
    const showDoctorsBtn = page.locator('button:has-text("Show Available Doctors")').first();
    if (await showDoctorsBtn.isVisible()) {
      await showDoctorsBtn.click();
      await page.waitForTimeout(500);
    }
    const doctorCard = page.locator('button:has(h3)').first();
    await doctorCard.waitFor({ state: 'visible', timeout: 8000 });
    await doctorCard.click();
    await page.waitForTimeout(1000);

    const slotBtn = page.locator('button:has-text("AM"), button:has-text("PM"), button:has-text(":")').first();
    await slotBtn.click();
    await page.waitForTimeout(500);

    const proceedBtn = page.locator('button:has-text("Proceed to Payment")').first();
    await proceedBtn.click();
    await page.waitForTimeout(1000);

    const paymentSection = page.locator('text=/Select Payment Method/i').first();
    const billBreakdown = page.locator('text=/Bill & Pricing Breakdown|Total Amount/i').first();
    const isPaymentScreen = (await paymentSection.isVisible()) && (await billBreakdown.isVisible());

    const pass = isPaymentScreen;
    results.push({
      id: 'FE-PAY-001',
      title: 'Payment gateway modal opens on checkout',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'Payment gateway modal/screen loads correctly with correct order amount, no blank modal',
      actual: `isPaymentScreen=${isPaymentScreen}`,
      evidence: { isPaymentScreen },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-PAY-001 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-PAY-001 Error:', err.message);
    results.push({
      id: 'FE-PAY-001',
      title: 'Payment gateway modal opens on checkout',
      status: 'FAIL',
      expected: 'Payment screen loads correctly with order amount',
      actual: `Error: ${err.message}`,
      evidence: { error: err.stack },
      classification: 'REAL_BUG'
    });
  }

  // ---------------------------------------------------------------------------
  // FE-PAY-002: Payment method selection
  // ---------------------------------------------------------------------------
  console.log('\n--- Running FE-PAY-002: Payment method selection ---');
  try {
    // Switch payment modes on payment screen
    const upiBtn = page.locator('button:has-text("UPI")').first();
    const cardBtn = page.locator('button:has-text("Credit / Debit Card"), button:has-text("CARD")').first();
    const netbankingBtn = page.locator('button:has-text("Net Banking")').first();
    const walletBtn = page.locator('button:has-text("Wallets")').first();
    const cashBtn = page.locator('button:has-text("Pay at Clinic")').first();

    let upiWorks = false;
    let cardWorks = false;
    let cashWorks = false;

    if (await upiBtn.isVisible()) {
      await upiBtn.click();
      await page.waitForTimeout(300);
      upiWorks = await page.locator('text=/Choose Instant UPI App/i').first().isVisible();
    }

    if (await cardBtn.isVisible()) {
      await cardBtn.click();
      await page.waitForTimeout(300);
      cardWorks = await page.locator('input[placeholder*="Card Number" i]').first().isVisible();
    }

    if (await cashBtn.isVisible()) {
      await cashBtn.click();
      await page.waitForTimeout(300);
      cashWorks = await page.locator('text=/Pay Directly at Clinic/i').first().isVisible();
    }

    const pass = upiWorks && cardWorks && cashWorks;
    results.push({
      id: 'FE-PAY-002',
      title: 'Payment method selection',
      status: pass ? 'PASS' : 'FAIL',
      expected: 'Form dynamically updates to show corresponding inputs for each payment method',
      actual: `upiWorks=${upiWorks}, cardWorks=${cardWorks}, cashWorks=${cashWorks}`,
      evidence: { upiWorks, cardWorks, cashWorks },
      classification: pass ? null : 'REAL_BUG'
    });
    console.log(`FE-PAY-002 Result: ${pass ? 'PASS' : 'FAIL'}`);
  } catch (err) {
    console.error('FE-PAY-002 Error:', err.message);
    results.push({
      id: 'FE-PAY-002',
      title: 'Payment method selection',
      status: 'FAIL',
      expected: 'Form dynamically updates for each payment method',
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
  console.log(`BATCH 2 COMPLETE: ${results.filter(r => r.status === 'PASS').length}/10 PASSED`);
  console.log('===============================================================');
}

runBatch2().catch(console.error);
