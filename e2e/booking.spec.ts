import { test, expect, type Page } from '@playwright/test';
import { createTestPatient, loginAsTestPatient } from './helpers/testAccount';
import { createTestDoctorWithAvailability, type TestDoctor } from './helpers/testDoctor';

// Current flow: find the doctor in the list and choose Book Appointment, then pick tomorrow's date
// (the test doctor's real availability) and a real generated slot.
async function goToTomorrowAndSelectDoctor(page: Page, doctorName: string, slotTime: string): Promise<void> {
  await expect(page.getByRole('heading', { name: /Find Doctors & Clinics/ })).toBeVisible();
  await page.getByPlaceholder(/Search by doctor/).fill(doctorName);
  const card = page.locator('div.rounded-2xl', { hasText: doctorName }).filter({ has: page.getByRole('button', { name: /Book Appointment/ }) }).first();
  await card.getByRole('button', { name: /Book Appointment/ }).click();

  await page.getByRole('button', { name: 'Tomorrow' }).click();
  await page.getByRole('button', { name: slotTime }).click();
}

test.describe.serial('Doctor consultation booking (real backend)', () => {
  let doctor: TestDoctor;

  test.beforeAll(async ({ request }) => {
    doctor = await createTestDoctorWithAvailability(request);
  });

  test('a patient can book a real doctor consultation and pay successfully via UPI', async ({ page, request }) => {
    const patient = await createTestPatient(request);
    await loginAsTestPatient(page, patient);

    await page.goto('/booking?service=doctor');

    // First real generated slot (09:00-11:00 in 15-min steps -> first slot is 9:00 AM).
    await goToTomorrowAndSelectDoctor(page, doctor.fullName, '9:00 AM');

    await page.getByRole('button', { name: 'Pay Online (UPI)' }).click();
    await page.getByPlaceholder(/Enter UPI ID/).fill('patient@okaxis');
    await page.getByRole('button', { name: /Confirm & Book/ }).click();

    await expect(page.getByRole('heading', { name: 'Appointment Confirmed!' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Your consultation reference is')).toBeVisible();
    await expect(page.getByText(/BK-/)).toBeVisible();
    await expect(page.getByText(`₹${doctor.consultationFee}`)).toBeVisible();
  });

  test('an invalid UPI ID is refused with error, and retry with valid UPI succeeds', async ({ page, request }) => {
    const patient = await createTestPatient(request);
    await loginAsTestPatient(page, patient);

    await page.goto('/booking?service=doctor');
    // A different slot than the previous test used (9:00 AM is already booked).
    await goToTomorrowAndSelectDoctor(page, doctor.fullName, '9:15 AM');

    await page.getByRole('button', { name: 'Pay Online (UPI)' }).click();
    await page.getByPlaceholder(/Enter UPI ID/).fill('invalid_upi');
    await page.getByRole('button', { name: /Confirm & Book/ }).click();

    // Blocked with validation error
    await expect(page.getByText('Enter a valid UPI ID, e.g. name@okaxis.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Appointment Confirmed!' })).not.toBeVisible();

    // Retry with valid UPI ID
    await page.getByPlaceholder(/Enter UPI ID/).fill('patient@okaxis');
    await page.getByRole('button', { name: /Confirm & Book/ }).click();
    await expect(page.getByRole('heading', { name: 'Appointment Confirmed!' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/BK-/)).toBeVisible();
  });

  test('selecting "Pay at Clinic" confirms the booking without charging anything online', async ({ page, request }) => {
    const patient = await createTestPatient(request);
    await loginAsTestPatient(page, patient);

    await page.goto('/booking?service=doctor');
    await goToTomorrowAndSelectDoctor(page, doctor.fullName, '9:30 AM');

    await page.getByRole('button', { name: 'Pay at Clinic' }).click();
    await page.getByRole('button', { name: /Confirm & Book/ }).click();

    await expect(page.getByRole('heading', { name: 'Appointment Confirmed!' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Your consultation reference is')).toBeVisible();
    await expect(page.getByText(/BK-/)).toBeVisible();
    await expect(page.getByText(`₹${doctor.consultationFee}`)).toBeVisible();
  });
});
