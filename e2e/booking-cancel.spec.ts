import { test, expect } from '@playwright/test';
import { createTestPatient, loginAsTestPatient } from './helpers/testAccount';
import { createTestDoctorWithAvailability } from './helpers/testDoctor';

// A patient cancels a paid online booking from Bookings: reason required, full refund, slot freed
// for other patients, doctor told, and nobody else can cancel it.
test.describe.configure({ timeout: 240000 });
const api = 'http://localhost:3000';
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const shots = process.env.UX_SHOTS_DIR;

test('patient cancels a paid booking and is refunded', async ({ page, request }) => {
  const doctor = await createTestDoctorWithAvailability(request);
  const patient = await createTestPatient(request);
  const P = { Authorization: `Bearer ${patient.token}` };
  const tomorrow = iso(new Date(Date.now() + 86400000));

  const slots = (await (await request.get(`${api}/patients/providers/${doctor.partnerId}/slots`, { headers: P, params: { date: tomorrow } })).json()).data;
  const slot = slots.find((s: any) => !s.is_booked);
  const book = await request.post(`${api}/patients/bookings`, { headers: P, data: {
    partner_id: doctor.partnerId, service_type: 'In Person', booking_date: tomorrow, time_slot_id: slot.time_slot_id,
    time_slot: String(slot.start_time).slice(0, 5), payment_mode: 'UPI', payment: { payment_method: 'UPI', upi_id: 'cancel@upi' },
  } });
  expect(book.status()).toBe(201);
  const booking = (await book.json()).data;
  // The booking belongs to the patient's account, so their own bell says it's confirmed.
  const mine = await (await request.get(`${api}/notifications`, { headers: P, params: { recipient_type: 'patient' } })).json();
  expect(JSON.stringify(mine)).toContain('Appointment Confirmed');

  // Someone else can't cancel it.
  const stranger = await createTestPatient(request);
  const denied = await request.post(`${api}/bookings/patient/${booking.id}/cancel`, { headers: { Authorization: `Bearer ${stranger.token}` }, data: { reason: 'x' } });
  expect(denied.status()).toBe(404);

  await loginAsTestPatient(page, patient);
  await page.goto('/my-consultations');
  // Opens on Upcoming (the only non-empty tab), card shows the doctor.
  await expect(page.getByRole('button', { name: /Upcoming/ })).toHaveClass(/bg-slate-900/);
  const card = page.getByText(booking.booking_number).locator('xpath=ancestor::div[contains(@class,"cursor-pointer")][1]');
  await expect(card).toContainText('Dr. PW Booking Test Doctor');
  await card.click();

  await page.getByRole('button', { name: 'Cancel booking' }).click();
  const panel = page.getByRole('group', { name: 'Cancel this booking' });
  await expect(panel).toContainText('The full amount is refunded');
  await panel.getByRole('button', { name: 'Yes, cancel booking' }).click();
  await expect(panel.getByRole('alert')).toHaveText('Choose a reason.');
  await panel.getByRole('radio', { name: "Can't make it at this time" }).click();
  if (shots) await page.screenshot({ path: `${shots}/cancel_panel.png` });
  await panel.getByRole('button', { name: 'Yes, cancel booking' }).click();

  await expect(page.getByRole('status')).toContainText(`${booking.booking_number} is cancelled. ₹650 is being refunded`);
  await expect(page.getByRole('button', { name: /Cancelled/ })).toHaveClass(/bg-slate-900/);
  await expect(page.getByText(`Ref: ${booking.booking_number}`)).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/cancel_done.png` });

  // Opening the cancelled booking: no cancel button any more, help link still there.
  await page.getByText(`Ref: ${booking.booking_number}`).click();
  await expect(page.getByRole('button', { name: 'Cancel booking' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Get help with this booking' })).toBeVisible();

  // Twice is refused; the slot is free again; the doctor was told.
  const again = await request.post(`${api}/bookings/patient/${booking.id}/cancel`, { headers: P, data: { reason: 'again' } });
  expect(again.status()).toBe(400);
  const after = (await (await request.get(`${api}/patients/providers/${doctor.partnerId}/slots`, { headers: P, params: { date: tomorrow } })).json()).data;
  expect(after.find((s: any) => s.time_slot_id === slot.time_slot_id)?.is_booked).toBeFalsy();
  const docNotes = await (await request.get(`${api}/notifications`, { headers: { Authorization: `Bearer ${doctor.token}` }, params: { recipient_type: 'doctor' } })).json();
  const list = Array.isArray(docNotes) ? docNotes : docNotes.data || [];
  expect(JSON.stringify(list)).toContain('Cancelled by patient');
});
