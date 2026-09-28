import { test, expect } from '@playwright/test';
import { createTestPatient, loginAsTestPatient } from './helpers/testAccount';
import { createTestDoctorWithAvailability } from './helpers/testDoctor';

// The doctor list a patient chooses from: enough detail to decide, nothing private, and services
// that can't be booked yet say so instead of dropping the patient into the wrong flow.
test.describe.configure({ timeout: 180000 });
const api = 'http://localhost:3000';
const shots = process.env.UX_SHOTS_DIR;

test('provider list is informative and private-data free', async ({ page, request }) => {
  const doctor = await createTestDoctorWithAvailability(request);
  const patient = await createTestPatient(request);

  const res = await request.get(`${api}/patients/providers`, { headers: { Authorization: `Bearer ${patient.token}` }, params: { service: 'doctor', search: doctor.fullName } });
  const list = (await res.json()).data;
  const me = list.find((p: any) => p.id === doctor.partnerId);
  expect(me).toBeTruthy();
  for (const secret of ['email', 'phone', 'pan_number', 'gst_number', 'user_id', 'created_by', 'registration_number']) {
    expect(me).not.toHaveProperty(secret);
  }
  expect(me.doctor).toMatchObject({ qualification: 'MBBS', years_of_experience: 6 });

  await loginAsTestPatient(page, patient);
  await page.goto('/booking?service=doctor');
  await page.getByPlaceholder(/Search doctors by name or specialty/).fill(doctor.fullName);
  const card = page.locator('div.rounded-2xl', { hasText: doctor.fullName }).filter({ has: page.getByRole('button', { name: /Book Appointment/ }) }).first();
  await expect(card).toContainText('MBBS');
  await expect(card).toContainText('6 yrs experience');
  await expect(card).toContainText('No reviews yet');
  if (shots) await page.screenshot({ path: `${shots}/provider_card.png` });

  // Services that have no providers on Vizito yet.
  await page.goto('/lab-tests');
  await expect(page.getByRole('heading', { name: "Online booking isn't available for this service" })).toBeVisible();
  await expect(page.getByText('Diagnostic Laboratory')).toBeVisible();
  await page.goto('/healthcare-services');
  const lab = page.locator('div.rounded-2xl', { hasText: 'Diagnostic Laboratory' }).first();
  await expect(lab).toContainText('Coming soon');
  await expect(lab.getByRole('button', { name: /Book Now/ })).toHaveCount(0);
  const doc = page.locator('div.rounded-2xl', { hasText: 'Doctor Consultation' }).first();
  await expect(doc.getByRole('button', { name: /Book Now/ })).toBeVisible();
});
