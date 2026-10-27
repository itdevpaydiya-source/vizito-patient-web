import { test, expect } from '@playwright/test';
import { registerProviderAccount, lettersFor } from './helpers/providerAccount';
import { createTestPatient } from './helpers/testAccount';

// Lab slot capacity end to end, real backend: the lab sets 1 patient per slot; availability shows
// the real places left; a full slot refuses a second booking; cancelling frees it; a reschedule into
// a full slot keeps the original; two patients racing for the last place → exactly one booking.
test.describe.configure({ timeout: 240000 });
const api = 'http://localhost:3000';
const H = (t: string) => ({ Authorization: `Bearer ${t}` });
async function ok(r: any, what: string) {
  if (!r.ok()) throw new Error(`${what}: ${r.status()} ${await r.text()}`);
  return r.json().catch(() => ({}));
}
const unwrap = (j: any) => j?.data ?? j;

const created: string[] = [];
test.afterEach(async () => {
  if (!created.length) return;
  const mysql = await import('../../vizito-replica-backend/vizito-auth/node_modules/mysql2/promise.js');
  const conn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'vizito_auth' });
  await conn.query("UPDATE partners SET status = 'Draft' WHERE id IN (?)", [created.splice(0)]);
  await conn.end();
});

test('capacity 1 per slot: availability, full slot, cancel frees it, reschedule into full slot rejected, race for last place', async ({ request }) => {
  const u = Date.now();
  const reg = await registerProviderAccount(request, api, {
    full_name: `Sunita Rao ${lettersFor(u).slice(-4)}`, phone: `6${String(u).slice(-9)}`, email: `pw-labcap-${u}@vizito.test`, date_of_birth: '1980-01-01', gender: 'female', provider_type_id: 7,
    password: 'PlaywrightTest123!', laboratoryName: `Capacity Check Labs ${lettersFor(u).slice(-4)}`, laboratoryRegNo: `TS-CE-LAB-${String(u).slice(-6)}`, authorizedPersonName: 'Sunita Rao',
  });
  const lab = reg.current_account.partner_id as string;
  created.push(lab);
  const L = H(reg.access_token);
  const c = await ok(await request.post(`${api}/facility/address-pricing`, { headers: L, data: { name: 'Capacity Check Gachibowli', facility_type: 'Laboratory', address_line_1: '2 ISB Road', address_line_2: 'Gachibowli', city: 'Hyderabad', state: 'Telangana', pincode: '500032', phone: '9876500088', provider_type: 'Laboratory' } }), 'centre');
  const centre = Number(c.facility?.id || c.data?.facility?.id);
  const master = await ok(await request.get(`${api}/lab-tests`, { headers: L }), 'master');
  await ok(await request.put(`${api}/lab-tests/offerings/me/${master.find((x: any) => x.code === 'FBS').id}`, { headers: L, data: { price: 120 } }), 'offer');
  await ok(await request.post(`${api}/partners/${lab}/submit`, { headers: L, data: {} }), 'live');

  // Capacity: validation, then 1 patient per slot at this centre.
  expect((await request.put(`${api}/lab-tests/capacity/me`, { headers: L, data: { centre: { [centre]: 0 } } })).status()).toBe(400);
  expect(await ok(await request.put(`${api}/lab-tests/capacity/me`, { headers: L, data: { centre: { [centre]: 1 } } }), 'capacity')).toMatchObject({ centre: { [String(centre)]: 1 }, home: null });

  const [a, b, c2, d] = await Promise.all([createTestPatient(request), createTestPatient(request), createTestPatient(request), createTestPatient(request)]);
  const avail = async (who: any) => unwrap(await ok(await request.get(`${api}/lab-orders/availability?lab_partner_id=${lab}&location_id=${centre}&visit_type=LAB_VISIT`, { headers: H(who.token) }), 'availability'));
  const first = await avail(a);
  expect(first).toMatchObject({ timezone: 'Asia/Kolkata', capacity: 1, bookable: true, max_days: 60 });
  expect(first.days).toHaveLength(61);
  const day = first.days.find((x: any) => x.slots.length >= 3);
  const [s1, s2] = [day.slots[1].time, day.slots[2].time];
  const book = (who: any, time: string) => request.post(`${api}/lab-orders`, { headers: H(who.token), data: { lab_partner_id: lab, location_id: centre, test_codes: ['FBS'], visit_date: day.date, visit_time: time, payment_mode: 'CASH' } });

  const orderA = unwrap(await ok(await book(a, s1), 'book A'));
  const left = async () => (await avail(a)).days.find((x: any) => x.date === day.date).slots.find((s: any) => s.time === s1);
  expect(await left()).toEqual({ time: s1, available: false, left: 0 });

  const full = await book(b, s1);
  expect(full.status()).toBe(409);
  expect((await full.json()).message).toMatch(/full/i);

  // B books the next slot, then tries to move into A's full slot: refused, B keeps their booking.
  const orderB = unwrap(await ok(await book(b, s2), 'book B'));
  const move = await request.post(`${api}/lab-orders/${orderB.id}/reschedule`, { headers: H(b.token), data: { visit_date: day.date, visit_time: s1 } });
  expect(move.status()).toBe(409);
  const bNow = unwrap(await ok(await request.get(`${api}/lab-orders/${orderB.id}`, { headers: H(b.token) }), 'B after'));
  expect(bNow.visit_time).toBe(s2);

  // A cancels → the place frees → B can move in.
  await ok(await request.post(`${api}/lab-orders/${orderA.id}/cancel`, { headers: H(a.token), data: { reason: 'Plans changed' } }), 'cancel A');
  expect(await left()).toEqual({ time: s1, available: true, left: 1 });
  await ok(await request.post(`${api}/lab-orders/${orderB.id}/reschedule`, { headers: H(b.token), data: { visit_date: day.date, visit_time: s1 } }), 'move B');
  expect(await left()).toEqual({ time: s1, available: false, left: 0 });
  const s2Now = (await avail(a)).days.find((x: any) => x.date === day.date).slots.find((s: any) => s.time === s2);
  expect(s2Now).toEqual({ time: s2, available: true, left: 1 }); // B's old place was released

  // Race: two patients book the last place at once → exactly one booking.
  const race = await Promise.all([book(c2, s2), book(d, s2)]);
  expect(race.map((r) => r.status()).sort()).toEqual([201, 409]);
});
