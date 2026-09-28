import { test, expect } from '@playwright/test';
import { createTestPatient, loginAsTestPatient } from './helpers/testAccount';
import { createTestDoctorWithAvailability } from './helpers/testDoctor';

// A patient moves their paid visit to another time with the same doctor: twice allowed, the third
// time refused; the old slot opens up for others and the doctor sees the new time.
test.describe.configure({ timeout: 240000 });
const api = 'http://localhost:3000';
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const shots = process.env.UX_SHOTS_DIR;

test('patient reschedules a visit, within the rules', async ({ page, request }) => {
  const doctor = await createTestDoctorWithAvailability(request);
  const patient = await createTestPatient(request);
  const P = { Authorization: `Bearer ${patient.token}` };
  const tomorrow = iso(new Date(Date.now() + 86400000));
  const slotsFor = async () => (await (await request.get(`${api}/patients/providers/${doctor.partnerId}/slots`, { headers: P, params: { date: tomorrow } })).json()).data;
  const slots = await slotsFor();
  const first = slots.find((s: any) => s.start_time === '09:00:00');
  const booking = (await (await request.post(`${api}/patients/bookings`, { headers: P, data: {
    partner_id: doctor.partnerId, service_type: 'In Person', booking_date: tomorrow, time_slot_id: first.time_slot_id,
    time_slot: '09:00', payment_mode: 'UPI', payment: { payment_method: 'UPI', upi_id: 'resched@upi' },
  } })).json()).data;

  // Someone else can't move it.
  const stranger = await createTestPatient(request);
  const later = slots.find((s: any) => s.start_time === '10:00:00');
  expect((await request.post(`${api}/bookings/patient/${booking.id}/reschedule`, { headers: { Authorization: `Bearer ${stranger.token}` }, data: { time_slot_id: later.time_slot_id } })).status()).toBe(404);

  await loginAsTestPatient(page, patient);
  await page.goto('/my-consultations');
  await page.getByText(`Ref: ${booking.booking_number}`).click();
  await page.getByRole('button', { name: 'Reschedule' }).click();
  const panel = page.getByRole('group', { name: 'Reschedule this visit' });
  const day = new Date(Date.now() + 86400000).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
  await panel.getByRole('radio', { name: day }).click();
  await panel.getByRole('radio', { name: '9:30 AM' }).click();
  if (shots) await page.screenshot({ path: `${shots}/reschedule_panel.png` });
  await panel.getByRole('button', { name: /Move to/ }).click();
  await expect(page.getByRole('status')).toContainText(`${booking.booking_number} moved to`);
  await expect(page.getByRole('status')).toContainText('9:30 AM');
  await expect(page.getByRole('status')).toContainText('You can reschedule 1 more time.');

  // The old time is free again; the doctor sees the new time and was told.
  const after = await slotsFor();
  expect(after.find((s: any) => s.time_slot_id === first.time_slot_id)?.is_booked).toBeFalsy();
  const docAppts = await (await request.get(`${api}/appointments?date=${tomorrow}`, { headers: { Authorization: `Bearer ${doctor.token}` } })).json();
  const mine = (Array.isArray(docAppts) ? docAppts : docAppts.data || []).find((a: any) => a.booking_number === booking.booking_number || a.appointment_number === booking.booking_number || a.booking_id === booking.id);
  expect(String(mine?.time_slot || mine?.timeSlot)).toContain('09:30');
  expect(JSON.stringify(await (await request.get(`${api}/notifications`, { headers: { Authorization: `Bearer ${doctor.token}` } })).json())).toContain('Rescheduled');

  // Second move allowed, third refused.
  const s2 = after.find((s: any) => s.start_time === '10:15:00');
  expect((await request.post(`${api}/bookings/patient/${booking.id}/reschedule`, { headers: P, data: { time_slot_id: s2.time_slot_id } })).ok()).toBeTruthy();
  const s3 = after.find((s: any) => s.start_time === '10:30:00');
  const third = await request.post(`${api}/bookings/patient/${booking.id}/reschedule`, { headers: P, data: { time_slot_id: s3.time_slot_id } });
  expect(third.status()).toBe(400);
  expect(await third.text()).toContain('already been rescheduled twice');
});
