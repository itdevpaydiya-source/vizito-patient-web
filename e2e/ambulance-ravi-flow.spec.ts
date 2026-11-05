import { test, expect, type Page } from '@playwright/test';
import { loginAsTestPatient } from './helpers/testAccount';

// Urgent ambulance booking, end to end, watched in a headed browser with a 4 s pause between steps:
// patient Anil (9876512345) books → driver Ravi (Sri Sai Ambulance, TS08UD3456) accepts → start → arrive →
// patient on board → complete → cash. Accounts: vizito-dev-credentials.md. Run with ambulance-ravi.config.ts.
const API = 'http://localhost:13000';
const PARTNER_APP = 'http://localhost:5173';
const PASSWORD = 'PlaywrightTest123!';
const PICKUP = { latitude: 17.4697, longitude: 78.3575, accuracy: 20 };
const pause = (p: Page) => p.waitForTimeout(4000);

test('patient books an urgent ambulance; Ravi runs it to completion', async ({ page, browser, request }) => {
  test.setTimeout(600000);

  // ---- Patient: sign in ----
  const pa = await (await request.post(API + '/patient/auth/login', { data: { phone: '9876512345', password: PASSWORD } })).json();
  const pToken = pa.access_token || pa.token;
  expect(pToken, 'patient login').toBeTruthy();
  await page.context().grantPermissions(['geolocation']);
  await page.context().setGeolocation(PICKUP);
  await loginAsTestPatient(page, { fullName: pa.full_name || 'Anil Patient', mobile: '9876512345', email: pa.email || '', password: '', patientId: String(pa.patient_id || ''), token: pToken });

  // ---- Driver: sign in, open Driver mode, go online near the pickup ----
  const da = await (await request.post(API + '/auth/login', { data: { email: 'driver.ravi@srisaiambulance.test', password: PASSWORD } })).json();
  expect(da.access_token, 'driver login').toBeTruthy();
  const dc = await browser.newContext({ permissions: ['geolocation'], geolocation: { latitude: 17.4675, longitude: 78.3610, accuracy: 15 }, viewport: { width: 1280, height: 900 } });
  const driver = await dc.newPage();
  await driver.goto(PARTNER_APP + '/');
  await driver.evaluate((a) => {
    const u = a.user, ca = a.current_account;
    localStorage.setItem('vizito_user', JSON.stringify({ id: u.id, user_id: u.id, partner_id: ca.partner_id, email: u.email, role: ca.provider_type, partner_type: ca.provider_type, fullName: u.full_name, current_account: ca, is_staff: true, staff_role: u.role, staff_permissions: u.permissions, token: a.access_token }));
    localStorage.setItem('vizito_token', a.access_token);
  }, da);
  await driver.goto(PARTNER_APP + '/ambulance-driver');
  await expect(driver.getByText('Ravi Driver').first()).toBeVisible({ timeout: 30000 });
  await pause(driver);
  const goOnline = driver.getByRole('switch', { name: 'Go online' });
  if (await goOnline.isVisible().catch(() => false)) await goOnline.click();
  await expect(driver.getByRole('switch', { name: 'Go offline' })).toBeVisible({ timeout: 30000 });
  await pause(driver);

  // ---- Patient: urgent request ----
  await page.bringToFront();
  await page.goto('/urgent-ambulance');
  await pause(page);
  await page.getByRole('button', { name: 'Use current location / choose pickup' }).click();
  await page.getByRole('button', { name: 'Allow location access', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Apply location', exact: true })).toBeEnabled({ timeout: 30000 });
  await page.getByRole('button', { name: 'Apply location', exact: true }).click();
  await page.getByLabel('Confirm pickup location').check();
  await page.getByLabel('Pickup address', { exact: true }).fill('Kondapur Main Road, Kondapur, Hyderabad, Telangana 500084');
  await page.getByRole('button', { name: 'Conscious', exact: true }).click();
  await page.getByLabel('Landmark / pickup instructions', { exact: true }).fill('Near Kondapur bus stop. Test booking.');
  await pause(page);
  await page.getByRole('button', { name: 'Continue to vehicle type' }).click();
  await page.getByRole('button', { name: /Basic life support/ }).click();
  await pause(page);
  await page.getByRole('button', { name: 'Continue to review', exact: true }).click();
  await pause(page);
  await page.getByRole('button', { name: 'Request ambulance now', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Finding your ambulance' })).toBeVisible({ timeout: 30000 });
  await pause(page);

  // ---- Driver: accept the offer ----
  await driver.bringToFront();
  const accept = driver.getByRole('button', { name: 'Accept', exact: true });
  await expect(accept).toBeVisible({ timeout: 90000 });
  await pause(driver);
  await accept.click();
  await pause(driver);
  await driver.goto(PARTNER_APP + '/ambulance-driver?tab=trip');
  const trip = driver.getByRole('region', { name: 'Active trip' });
  await expect(trip).toBeVisible({ timeout: 30000 });
  await pause(driver);

  // ---- Patient sees the ambulance assigned ----
  await page.bringToFront();
  await expect(page.getByRole('heading', { name: 'Your ambulance is assigned' })).toBeVisible({ timeout: 30000 });
  await pause(page);

  // ---- Driver: start → arrive → on board → complete → cash; patient follows each step ----
  const step = async (button: string | RegExp, patientHeading: string) => {
    await driver.bringToFront();
    await driver.getByRole('button', { name: button }).click();
    await pause(driver);
    await page.bringToFront();
    await expect(page.getByRole('heading', { name: patientHeading, exact: true })).toBeVisible({ timeout: 30000 });
    await pause(page);
  };
  await step(/Start — going to pickup/, 'Ambulance on the way');
  await step('Arrived at pickup', 'Ambulance at pickup');
  await step('Patient picked up', 'Patient onboard');

  await driver.bringToFront();
  await driver.getByLabel('Distance (km, odometer)').fill('12');
  await pause(driver);
  await step('Complete trip', 'Trip completed');

  await driver.bringToFront();
  driver.once('dialog', (d) => d.accept());
  await driver.getByRole('button', { name: /Cash collected/ }).click();
  await pause(driver);

  await page.bringToFront();
  await expect(page.getByRole('button', { name: 'View receipt', exact: true })).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'View receipt', exact: true }).click();
  await pause(page);

  await driver.getByRole('switch', { name: 'Go offline' }).click().catch(() => {});
  await dc.close();
});
