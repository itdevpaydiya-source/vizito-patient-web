import { test, expect } from '@playwright/test';
import { registerProviderAccount, lettersFor } from './helpers/providerAccount';
import { createTestPatient } from './helpers/testAccount';

// Lab comparison card data, real backend: a lab's uploaded logo, its lab-declared NABL certificate
// (shown only while unexpired, never as "verified"), and the next bookable centre slot.
test.describe.configure({ timeout: 180000 });
const api = 'http://localhost:3000';
const H = (t: string) => ({ Authorization: `Bearer ${t}` });
async function ok(r: any, what: string) {
  if (!r.ok()) throw new Error(`${what}: ${r.status()} ${await r.text()}`);
  return r.json().catch(() => ({}));
}
// 1×1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const created: string[] = [];
test.afterEach(async () => {
  if (!created.length) return;
  // Keep fixture labs out of patient search afterwards.
  const mysql = await import('../../vizito-replica-backend/vizito-auth/node_modules/mysql2/promise.js');
  const conn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'vizito_auth' });
  await conn.query("UPDATE partners SET status = 'Draft' WHERE id IN (?)", [created.splice(0)]);
  await conn.end();
});

test('lab search returns uploaded logo, unexpired lab-declared NABL certificate and next slot', async ({ request }) => {
  const u = Date.now();
  const reg = await registerProviderAccount(request, api, {
    full_name: `Ravi Teja ${lettersFor(u).slice(-4)}`, phone: `6${String(u).slice(-9)}`, email: `pw-labtrust-${u}@vizito.test`, date_of_birth: '1980-01-01', gender: 'male', provider_type_id: 7,
    password: 'PlaywrightTest123!', laboratoryName: `Trust Check Labs ${lettersFor(u).slice(-4)}`, laboratoryRegNo: `TS-CE-LAB-${String(u).slice(-6)}`, authorizedPersonName: 'Ravi Teja',
  });
  const labId = reg.current_account.partner_id as string;
  created.push(labId);
  const L = H(reg.access_token);
  await ok(await request.post(`${api}/facility/address-pricing`, { headers: L, data: { name: 'Trust Check Kondapur', facility_type: 'Laboratory', address_line_1: '4 Botanical Garden Road', address_line_2: 'Kondapur', city: 'Hyderabad', state: 'Telangana', pincode: '500084', phone: '9876500077', provider_type: 'Laboratory' } }), 'centre');
  const master = await ok(await request.get(`${api}/lab-tests`, { headers: L }), 'master');
  await ok(await request.put(`${api}/lab-tests/offerings/me/${master.find((x: any) => x.code === 'FBS').id}`, { headers: L, data: { price: 99 } }), 'offer');
  await ok(await request.post(`${api}/partners/${labId}/submit`, { headers: L, data: {} }), 'live');

  // Logo: the existing image upload returns a stored URL, which the lab saves on its profile.
  const up = await ok(await request.post(`${api}/facility/hospital-profile/logo?type=logo`, { headers: L, multipart: { file: { name: 'logo.png', mimeType: 'image/png', buffer: PNG } } }), 'upload');
  expect(up.url).toBeTruthy();

  // Validation: an expired certificate and a half-filled one are refused.
  expect((await request.put(`${api}/lab-tests/profile/me`, { headers: L, data: { nabl_cert_no: 'MC-1234', nabl_valid_until: '2020-01-01' } })).status()).toBe(400);
  expect((await request.put(`${api}/lab-tests/profile/me`, { headers: L, data: { nabl_cert_no: 'MC-1234' } })).status()).toBe(400);

  const until = `${new Date().getFullYear() + 2}-03-31`;
  const saved = await ok(await request.put(`${api}/lab-tests/profile/me`, { headers: L, data: { logo_url: up.url, nabl_cert_no: 'mc-5678', nabl_valid_until: until } }), 'profile');
  expect(saved).toEqual({ logo_url: up.url, nabl_cert_no: 'MC-5678', nabl_valid_until: until });

  const patient = await createTestPatient(request);
  const labs = await ok(await request.get(`${api}/lab-tests/labs?tests=FBS`, { headers: H(patient.token) }), 'search');
  const mine = labs.find((l: any) => l.id === labId);
  expect(mine, 'fixture lab is searchable').toBeTruthy();
  expect(mine.logo_url).toBe(up.url);
  expect(mine.nabl).toEqual({ cert_no: 'MC-5678', valid_until: until, source: 'lab_declared' });
  expect(mine.settings.profile).toBeUndefined(); // raw profile never leaves the lab's own settings
  expect(mine.next_available).toMatch(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):(00|30)$/);
  expect(mine.locations[0].next_slot).toBe(mine.next_available);
  expect(mine.next_home_slot).toBeNull(); // home collection not enabled for this lab

  // Clearing the certificate removes it from search.
  await ok(await request.put(`${api}/lab-tests/profile/me`, { headers: L, data: { logo_url: up.url, nabl_cert_no: '', nabl_valid_until: '' } }), 'clear');
  const again = (await ok(await request.get(`${api}/lab-tests/labs?tests=FBS`, { headers: H(patient.token) }), 'search2')).find((l: any) => l.id === labId);
  expect(again.nabl).toBeNull();
});
