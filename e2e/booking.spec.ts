import { test, expect, type Page } from '@playwright/test';
import { createTestPatient, loginAsTestPatient } from './helpers/testAccount';
import { createTestDoctorWithAvailability, type TestDoctor } from './helpers/testDoctor';

// #22 redesign: the patient must pick a date (department/specialization left as "All") BEFORE any
// doctor is shown — the doctor list itself only contains doctors with a real bookable slot on that
// date. Tomorrow is selected in this gate (matching the test doctor's real availability window,
// created for tomorrow), then "Show Available Doctors" fetches the real, date-filtered list.
async function goToTomorrowAndSelectDoctor(page: Page, doctorName: string, slotTime: string): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Find a Doctor' })).toBeVisible();

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrowLabel = tomorrow.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  await page.getByText(tomorrowLabel, { exact: true }).click();

  const availableDoctorsResponse = page.waitForResponse((res) => res.url().includes('/available-doctors') && res.request().method() === 'GET');
  await page.getByRole('button', { name: 'Show Available Doctors' }).click();
  await availableDoctorsResponse;

  await expect(page.getByRole('heading', { name: 'Select a Doctor' })).toBeVisible();
  const slotsResponse = page.waitForResponse((res) => res.url().includes('/slots') && res.request().method() === 'GET');
  await page.getByText(doctorName, { exact: true }).click({ timeout: 30000 });
  await slotsResponse;

  await page.getByRole('button', { name: slotTime }).click();
}

// Real, end-to-end tests against the actual running backend — no mocked API responses. A doctor
// with a real clinic and real generated slots is created via the API before these run, and each
// test drives the actual rendered UniversalBookingScreen UI through the real booking + payment
// flow built in this session's Phase A work.
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

    await page.getByRole('button', { name: /Proceed to Payment/ }).click();

    // Booking is created here (a real API call) — the payment page renders once that resolves.
    await expect(page.getByText('Simulated payment for demonstration')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(`₹${doctor.consultationFee}`).first()).toBeVisible();

    // UPI is the default-selected method (no form fields required for the non-custom app option),
    // so the happy path doesn't need to touch the payment-method sub-form at all.
    await page.getByRole('button', { name: /Pay ₹\d+ & Confirm/ }).click();

    await expect(page.getByRole('heading', { name: 'Appointment Confirmed!' })).toBeVisible({ timeout: 15000 });

    // Real backend-issued values, not fabricated confirmation-page content.
    await expect(page.getByText('Booking Reference')).toBeVisible();
    await expect(page.getByText(/^BK-/)).toBeVisible();
    await expect(page.getByText('Transaction Ref (simulated)')).toBeVisible();
    await expect(page.getByText(/VZT-SIM-/)).toBeVisible();
    await expect(page.getByText('Paid', { exact: true })).toBeVisible();
  });

  test('a declined payment (deterministic test card) does not confirm the booking, and a retry with real details succeeds', async ({ page, request }) => {
    const patient = await createTestPatient(request);
    await loginAsTestPatient(page, patient);

    await page.goto('/booking?service=doctor');
    // A different slot than the previous test used (9:00 AM is already booked).
    await goToTomorrowAndSelectDoctor(page, doctor.fullName, '9:15 AM');
    await page.getByRole('button', { name: /Proceed to Payment/ }).click();
    await expect(page.getByText('Simulated payment for demonstration')).toBeVisible({ timeout: 15000 });

    // Switch to Card and enter the deterministic-decline test number (mirrors the real gateway
    // sandbox convention this session's SimulatedPaymentProvider follows — card ending 0002).
    await page.getByRole('button', { name: 'Credit / Debit Card' }).click();
    await page.getByPlaceholder('Card Number (16 digits)').fill('4111111111110002');
    await page.getByPlaceholder('MM / YY').fill('12/30');
    await page.getByPlaceholder('CVV (3 digits)').fill('123');
    await page.getByPlaceholder('Cardholder Name').fill(patient.fullName);

    await page.getByRole('button', { name: /Pay ₹\d+ & Confirm/ }).click();

    // Declined — stays on the payment page, booking must NOT be confirmed.
    await expect(page.getByText('Payment Declined')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Card declined by issuing bank (simulated).')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Appointment Confirmed!' })).not.toBeVisible();

    // Retry with a real (non-decline) card number against the SAME booking — must succeed.
    await page.getByPlaceholder('Card Number (16 digits)').fill('4111111111111111');
    await page.getByRole('button', { name: /Try Again · Pay ₹\d+/ }).click();
    await expect(page.getByRole('heading', { name: 'Appointment Confirmed!' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Paid', { exact: true })).toBeVisible();
  });

  test('selecting "Pay at Clinic" confirms the booking without charging anything online', async ({ page, request }) => {
    const patient = await createTestPatient(request);
    await loginAsTestPatient(page, patient);

    await page.goto('/booking?service=doctor');
    await goToTomorrowAndSelectDoctor(page, doctor.fullName, '9:30 AM');
    await page.getByRole('button', { name: /Proceed to Payment/ }).click();
    await expect(page.getByText('Simulated payment for demonstration')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Pay at Clinic' }).click();
    await page.getByRole('button', { name: /Confirm & Pay ₹\d+ at Clinic/ }).click();

    await expect(page.getByRole('heading', { name: 'Appointment Confirmed!' })).toBeVisible({ timeout: 15000 });
    // Cash-at-clinic is never marked Paid online — the booking is confirmed, payment is not.
    await expect(page.getByText('Amount Due')).toBeVisible();
  });
});
