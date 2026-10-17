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
  await page.getByPlaceholder(/Search by doctor/).fill(doctor.fullName);
  const card = page.locator('div.rounded-2xl', { hasText: doctor.fullName }).filter({ has: page.getByRole('button', { name: /Book Appointment/ }) }).first();
  await expect(card).toContainText('MBBS');
  await expect(card).toContainText('6 years experience');
  if (shots) await page.screenshot({ path: `${shots}/provider_card.png` });

  // Lab tests flow is now live, while unlaunched services (like Scheduled Ambulance) show Coming soon.
  await page.goto('/lab-tests');
  await expect(page.getByRole('heading', { name: /Book lab tests/ })).toBeVisible();
  await page.goto('/healthcare-services');
  const amb = page.getByRole('radio', { name: /Scheduled Ambulance/ });
  await expect(amb).toContainText('Coming soon');
  await expect(amb).toBeDisabled();
  const doc = page.getByRole('radio', { name: /Doctor Consultation/ });
  await expect(doc).toBeEnabled();
});
