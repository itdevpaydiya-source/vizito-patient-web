import { test, expect } from '@playwright/test';
import { createTestPatient, loginAsTestPatient } from './helpers/testAccount';
import { createTestDoctorWithAvailability } from './helpers/testDoctor';

// A parent books for their child: the child is added once (with date of birth), chosen at booking,
// the doctor sees the child's own name/sex/age, and the prescription lands in the parent's Records
// labelled with the child's name.
test.describe.configure({ timeout: 240000 });
test.use({ actionTimeout: 15000 });
const api = 'http://localhost:3000';
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const shots = process.env.UX_SHOTS_DIR;

test('parent books a visit for their child and receives the prescription', async ({ page, request }) => {
  const doctor = await createTestDoctorWithAvailability(request);
  const parent = await createTestPatient(request);
  await loginAsTestPatient(page, parent);

  // Add the child (date of birth is required).
  await page.goto('/family-profiles');
  await page.getByRole('button', { name: 'Add Member' }).click();
  await page.getByLabel('Full Name').fill('Anika Rao');
  await page.getByLabel('Relationship').selectOption('Child');
  await page.getByLabel('Gender').selectOption('Female');
  await page.getByRole('button', { name: 'Save Profile' }).click();
  await expect(page.getByText('Enter a valid date of birth.')).toBeVisible();
  const dob = `${new Date().getFullYear() - 7}-03-10`;
  await page.getByLabel('Date of Birth').fill(dob);
  await page.getByRole('button', { name: 'Save Profile' }).click();
  await expect(page.getByText('Anika Rao').first()).toBeVisible();

  // Book for her.
  await page.goto('/booking?service=doctor');
  await page.getByPlaceholder(/Search by doctor/).fill(doctor.fullName);
  await page.getByRole('article').filter({ has: page.getByRole('heading', { name: new RegExp(doctor.fullName) }) }).getByRole('button', { name: /Book appointment/ }).click();
  // The directory can finish refreshing and remount the modal after its first paint.
  // Retry only this reversible selection, and assert the actual date and exact real slot.
  await expect(async () => {
    const tomorrow = page.getByRole('button', { name: 'Tomorrow', exact: true });
    await tomorrow.click();
    await expect(tomorrow).toHaveAttribute('aria-pressed', 'true', { timeout: 1000 });
    await expect(page.getByRole('button', { name: '9:00 AM', exact: true })).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 20000 });
  await page.getByRole('button', { name: '9:00 AM', exact: true }).click();
  await page.getByRole('button', { name: /Anika Rao/ }).click();
  await page.getByRole('button', { name: 'Pay at Clinic' }).click();
  await page.getByRole('button', { name: /Confirm & Book/ }).click();
  await expect(page.getByRole('heading', { name: 'Appointment Confirmed!' })).toBeVisible({ timeout: 15000 });
  if (shots) await page.screenshot({ path: `${shots}/family_booked.png`, fullPage: true });

  // It is in the parent's Bookings, for Anika.
  await page.goto('/my-consultations');
  await page.getByRole('button', { name: /^Upcoming \d+$/ }).click();
  await expect(page.getByRole('button', { name: /^Upcoming \d+$/ })).toHaveAttribute('aria-pressed', 'true');
  const card = page.getByRole('button', { name: /View details for.*PW Booking Test Doctor/ });
  await card.click();
  await expect(page.getByText('Anika Rao').first()).toBeVisible();

  // The doctor sees the child, not the parent.
  const D = { Authorization: `Bearer ${doctor.token}` };
  const day = iso(new Date(Date.now() + 86400000));
  const appts = await (await request.get(`${api}/appointments?date=${day}`, { headers: D })).json();
  const a = (Array.isArray(appts) ? appts : appts.data || []).find((x: any) => x.patient_name === 'Anika Rao');
  expect(a, 'doctor sees Anika').toBeTruthy();
  expect(Number(a.patient_age)).toBe(new Date().getMonth() > 2 || (new Date().getMonth() === 2 && new Date().getDate() >= 10) ? 7 : 6);
  expect(String(a.patient_gender).toLowerCase()).toBe('female');

  // Visit + prescription; it reaches the parent's Records under Anika's name.
  const bn = a.appointment_number || a.booking_number;
  expect((await request.post(`${api}/appointments/${bn}/start-consultation`, { headers: D })).ok()).toBeTruthy();
  await request.post(`${api}/appointments/${bn}/consultation`, { headers: D, data: { chief_complaint: 'Fever since yesterday', diagnosis: 'Viral fever' } });
  const rx = await request.post(`${api}/appointments/${bn}/prescription`, { headers: D, data: {
    status: 'Finalized', temperature: 100.6, systolic_bp: 100, diastolic_bp: 65, spo2: 98, pulse: 104,
    medicines: [{ name: 'Paracetamol 250 mg/5 ml syrup', dosage: '5 ml', frequency: '1-1-1', duration: '3 days', instructions: 'If fever above 100°F' }],
    general_advice: 'Plenty of fluids.', no_known_allergies: true, followup_required: true, followup_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0,10),
  } });
  expect(rx.ok(), await rx.text()).toBeTruthy();
  await page.goto('/my-records');
  await expect(page.getByText(/^Follow-up:/).first()).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Follow-up ?');
  await page.screenshot({ path: 'artifacts/ui-audit-20261025/patient-follow-up-label.png', fullPage: true });
  await page.getByRole('button', { name: 'Send to pharmacy', exact: true }).first().click();
  const pharmacyPicker = page.getByRole('dialog');
  await expect(pharmacyPicker).toBeVisible();
  await expect(pharmacyPicker).not.toContainText(/Near\s+Near/i);
  await page.screenshot({ path: 'artifacts/ui-audit-20261025/patient-pharmacy-addresses.png', fullPage: true });
  await page.getByRole('button', { name: 'Close pharmacy selection', exact: true }).click();
  await page.getByRole('button', { name: /View/ }).first().click();
  const view = page.getByRole('dialog', { name: 'Prescription' });
  await expect(view).toContainText(/Anika Rao · \d+ y · F/);
  await expect(view).toContainText('Paracetamol 250 mg/5 ml syrup');
  if (shots) await page.screenshot({ path: `${shots}/family_rx.png` });
});
