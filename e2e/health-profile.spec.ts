import { test, expect } from '@playwright/test';
import { createTestPatient, loginAsTestPatient } from './helpers/testAccount';
import { createTestDoctorWithAvailability } from './helpers/testDoctor';

// The patient fills their Health Profile once; the doctor they book sees it as patient-reported.
test.describe.configure({ timeout: 240000 });
const api = 'http://localhost:3000';
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const shots = process.env.UX_SHOTS_DIR;

test('health profile is saved and reaches the treating doctor', async ({ page, request }) => {
  const doctor = await createTestDoctorWithAvailability(request);
  const patient = await createTestPatient(request);
  const P = { Authorization: `Bearer ${patient.token}` };

  await loginAsTestPatient(page, patient);
  // A new patient is nudged from the dashboard straight to the form.
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Complete health profile' }).click();
  await expect(page).toHaveURL(/section=health/);
  await expect(page.getByRole('heading', { name: 'Health Profile' })).toBeVisible();

  await page.getByLabel('Blood group').selectOption('B+');
  await page.getByLabel('Height (cm)').fill('300');
  await page.getByRole('button', { name: 'Save health profile' }).click();
  await expect(page.getByRole('alert')).toHaveText(/Height must be between 30 and 250 cm/);
  await page.getByLabel('Height (cm)').fill('165');
  await page.getByLabel('Weight (kg)').fill('62');
  await expect(page.getByText('22.8')).toBeVisible();

  await page.getByLabel('Allergic to').fill('Sulfa drugs');
  await page.getByLabel('Reaction').fill('Rash');
  await page.getByLabel('Severity').selectOption('Moderate');
  await page.getByRole('button', { name: 'Add allergy' }).click();
  await expect(page.getByRole('list', { name: 'Your allergies' })).toContainText('Sulfa drugs · Rash (Moderate)');
  await page.getByRole('checkbox', { name: 'Diabetes' }).click();
  await page.getByLabel('Medicine').fill('Metformin 500 mg');
  await page.getByLabel('How you take it').fill('1-0-1 after food');
  await page.getByRole('button', { name: 'Add medicine' }).click();
  await page.getByLabel('Name').fill('Ravi Kumar');
  await page.getByLabel('Relationship').fill('Spouse');
  await page.getByLabel('Mobile').fill('9876501234');
  await page.getByRole('button', { name: 'Save health profile' }).click();
  await expect(page.getByRole('status')).toContainText('Saved');
  if (shots) await page.screenshot({ path: `${shots}/health_profile.png`, fullPage: true });

  // Persists.
  await page.reload();
  await expect(page.getByRole('list', { name: 'Your allergies' })).toContainText('Sulfa drugs');
  await expect(page.getByLabel('Blood group')).toHaveValue('B+');
  await expect(page.getByRole('checkbox', { name: 'Diabetes' })).toHaveAttribute('aria-checked', 'true');
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /Hello/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Complete health profile' })).toHaveCount(0);

  // Book this doctor, then open the visit as the doctor.
  const tomorrow = iso(new Date(Date.now() + 86400000));
  const slots = (await (await request.get(`${api}/patients/providers/${doctor.partnerId}/slots`, { headers: P, params: { date: tomorrow } })).json()).data;
  const slot = slots.find((s: any) => !s.is_booked);
  const booking = (await (await request.post(`${api}/patients/bookings`, { headers: P, data: {
    partner_id: doctor.partnerId, service_type: 'In Person', booking_date: tomorrow, time_slot_id: slot.time_slot_id,
    time_slot: String(slot.start_time).slice(0, 5), payment_mode: 'UPI', payment: { payment_method: 'UPI', upi_id: 'hp@upi' },
  } })).json()).data;
  const rx = await (await request.get(`${api}/appointments/${booking.booking_number}/prescription`, { headers: { Authorization: `Bearer ${doctor.token}` } })).json();
  const reported = rx.patient_reported || rx.data?.patient_reported;
  expect(reported).toMatchObject({ blood_group: 'B+', bmi: 22.8, conditions: ['Diabetes'] });
  expect(reported.allergies[0]).toMatchObject({ allergen: 'Sulfa drugs', severity: 'Moderate' });
  expect(reported.medications[0]).toMatchObject({ name: 'Metformin 500 mg' });

  // The internal read is never reachable through the public gateway.
  const probe = await request.get(`${api}/patients/internal/health-profile/${reported.user_id}`, { headers: { Authorization: `Bearer ${doctor.token}` } });
  expect(probe.status()).toBe(403);
});
