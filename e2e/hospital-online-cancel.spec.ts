import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { hospitalAppointmentsFixture } from './helpers/hospitalAppointmentsFixture';
import { createTestPatient, loginAsTestPatient } from './helpers/testAccount';
import { createTestDoctorWithAvailability } from './helpers/testDoctor';

test.describe.configure({ timeout: 240000 });
test.use({ baseURL: 'http://localhost:5173' });
const API = 'http://localhost:3000';
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const db = async () => {
  const env = Object.fromEntries(readFileSync('../vizito-replica-backend/vizito-booking/.env', 'utf8').split(/\r?\n/).filter((l) => /^DATABASE_/.test(l)).map((l) => [l.split('=')[0], l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]));
  const mysql = createRequire('D:/Vizito-latest6/vizito-replica-backend/vizito-booking/package.json')('mysql2/promise');
  return mysql.createConnection({ host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT), user: env.DATABASE_USER, password: env.DATABASE_PASSWORD, database: env.DATABASE_NAME });
};

test('patient cancel closes 2 hours before the visit', async ({ page, request }) => {
  const doctor = await createTestDoctorWithAvailability(request);
  const patient = await createTestPatient(request);
  const P = { Authorization: `Bearer ${patient.token}` };
  const day = iso(new Date(Date.now() + 86400000));
  const slots = (await (await request.get(`${API}/patients/providers/${doctor.partnerId}/slots`, { headers: P, params: { date: day } })).json()).data.filter((s: any) => !s.is_booked);
  const book = async (slot: any) => {
    const r = await request.post(`${API}/patients/bookings`, { headers: P, data: { partner_id: doctor.partnerId, service_type: 'In Person', booking_date: day, time_slot_id: slot.time_slot_id, time_slot: String(slot.start_time).slice(0, 5), payment_mode: 'CASH' } });
    expect(r.status(), await r.text()).toBe(201);
    return (await r.json()).data;
  };
  const early = await book(slots[0]), late = await book(slots[1]);
  const c = await db();
  await c.query('UPDATE appointments SET start_time = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE booking_id = ?', [late.id]);
  await c.end();
  const blocked = await request.post(`${API}/bookings/patient/${late.id}/cancel`, { headers: P, data: { reason: 'Test' } });
  const text = await blocked.text();
  expect(blocked.status(), text).toBe(400);
  expect(text).toContain('2 hours');
  await loginAsTestPatient(page, patient);
  await page.goto(`/my-consultations?type=Doctor&open=${late.id}`);
  await expect(page.getByRole('link', { name: 'WhatsApp' }).first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('button', { name: /^Cancel( appointment| booking)?$/ })).toHaveCount(0);
  await page.goto(`/my-consultations?type=Doctor&open=${early.id}`);
  await expect(page.getByRole('button', { name: /^Cancel( appointment| booking)?$/ }).first()).toBeVisible({ timeout: 20000 });
  expect((await request.post(`${API}/bookings/patient/${early.id}/cancel`, { headers: P, data: { reason: 'Test' } })).ok()).toBeTruthy();
});

test('hospital booking: no side panels, online only, share after payment', async ({ page, request }) => {
  const f = await hospitalAppointmentsFixture(request, { bookings: false });
  const slot = f.slots[0];
  const cash = await request.post(`${API}/patients/bookings`, { headers: f.P, data: { partner_id: f.doctor.partnerId, hospital_partner_id: f.hospital, service_type: 'In Person', booking_date: f.day, time_slot_id: slot.time_slot_id, time_slot: String(slot.start_time).slice(0, 5), payment_mode: 'CASH' } });
  expect(cash.status()).toBe(400);
  expect(await cash.text()).toContain('paid online');
  const after = (await f.get(`/patients/providers/${f.doctor.partnerId}/slots?date=${f.day}&facility_id=${f.fid}&hospital_partner_id=${f.hospital}`)).data;
  expect(after.find((row: any) => row.time_slot_id === slot.time_slot_id).is_booked).toBeFalsy();

  // Only the Razorpay window and the final save are stubbed: a test cannot pay real Razorpay.
  await page.addInitScript(() => { (window as any).Razorpay = function (o: any) { return { on() {}, open() { o.handler({ razorpay_order_id: 'order_t', razorpay_payment_id: 'pay_t', razorpay_signature: 'sig' }); } }; }; });
  await page.route('**/bookings/payments/**', async (route) => { if (route.request().method() === 'POST') await route.fulfill({ json: { order_id: 'order_t', id: 'order_t', key_id: 'rzp_test', key: 'rzp_test', amount: 80000, currency: 'INR' } }); else await route.continue(); });
  await page.route('**/patients/bookings', async (route) => { if (route.request().method() === 'POST') await route.fulfill({ status: 201, json: { data: { id: 'b1', booking_number: 'BK-TEST-1', total_amount: 800 } } }); else await route.continue(); });

  await loginAsTestPatient(page, f.patient);
  await page.goto(`/find-hospitals?provider=${f.hospital}&book=1`);
  await expect(page.getByRole('heading', { name: 'Book an OPD appointment' })).toBeVisible({ timeout: 30000 });
  await expect(page.getByLabel('Booking summary')).toHaveCount(0);
  await page.getByRole('radiogroup', { name: 'Doctor' }).getByRole('radio').first().click();
  await page.getByRole('button', { name: /^Continue/ }).click();
  await page.getByRole('button', { name: new RegExp(f.day) }).click();
  await page.locator('.hj-book button:not([disabled])').filter({ hasText: /\d{1,2}:\d{2}/ }).first().click({ timeout: 15000 });
  await page.getByRole('button', { name: /^Continue/ }).click();
  await expect(page.getByRole('button', { name: 'Back to Date & time' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to Date & time' }).click();
  await expect(page.getByRole('heading', { name: /Select date/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/hospital-step2.png' });
  await page.getByRole('button', { name: 'Continue to Patient details' }).click();
  await page.getByLabel('Reason for visit').fill('Routine check up');
  await page.getByRole('button', { name: /^Continue/ }).click();
  await expect(page.getByText('Free cancellation up to 2 hours before')).toBeVisible();
  await expect(page.getByText(/Pay at /)).toHaveCount(0);
  await page.screenshot({ path: 'test-results/hospital-review.png', fullPage: true });
  await page.getByRole('button', { name: /^Pay .* & book/ }).click();
  await expect(page.getByRole('heading', { name: /confirmed/ })).toBeVisible();
  const href = decodeURIComponent(await page.getByRole('link', { name: 'WhatsApp' }).getAttribute('href') || '');
  expect(href).toContain('wa.me');
  expect(href).toContain('BK-TEST-1');
  expect(href).not.toContain('General Medicine');
  expect(href).not.toContain('Routine check up');
  await page.screenshot({ path: 'test-results/hospital-confirm.png', fullPage: true });
});
