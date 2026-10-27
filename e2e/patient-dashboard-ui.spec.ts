import { test, expect } from '@playwright/test';
import { registerProviderAccount, lettersFor } from './helpers/providerAccount';
import { createTestPatient, loginAsTestPatient } from './helpers/testAccount';

// Owner-reported (2026-10-06): the patient dashboard search had no suggestions; "Your next visit"
// had no time/business; the Lab Tests tile opened a dead "booking not available" page; booking
// cards said "Appointment · Location to be confirmed".
test.describe.configure({ timeout: 300000 });
test.use({ actionTimeout: 20000 });
const created:string[]=[];
test.afterEach(async()=>{
 if(!created.length)return;
 const mysql=await import('../../vizito-replica-backend/vizito-auth/node_modules/mysql2/promise.js');
 const conn=await mysql.createConnection({host:'localhost',port:3306,user:'root',password:'root',database:'vizito_auth'});
 try { await conn.query("UPDATE partners SET status = 'Draft' WHERE id IN (?)",[created.splice(0)]); } finally { await conn.end(); }
});
const api = 'http://localhost:3000';
const shots = process.env.UX_SHOTS_DIR;
const H = (t: string) => ({ Authorization: `Bearer ${t}` });
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
async function ok(r: any, what: string) {
  if (!r.ok()) throw new Error(`${what}: ${r.status()} ${await r.text()}`);
  return r.json().catch(() => ({}));
}

test('dashboard: search suggestions, detailed next visit and cards, service tiles open the right flow', async ({ page, request }) => {
  const u = Date.now();
  const labName = `Lifeline Labs ${lettersFor(u).slice(-4)}`;
  const reg = await registerProviderAccount(request, api, {
    full_name: `Anil Kumar ${lettersFor(u).slice(-4)}`, phone: `6${String(u).slice(-9)}`, email: `pw-dash-${u}@vizito.test`, date_of_birth: '1980-01-01', gender: 'male', provider_type_id: 7,
    password: 'PlaywrightTest123!', laboratoryName: labName, laboratoryRegNo: `TS-CE-LAB-${String(u).slice(-6)}`, authorizedPersonName: 'Anil Kumar',
  });
  created.push(reg.current_account.partner_id);
  const L = H(reg.access_token);
  const c = await ok(await request.post(`${api}/facility/address-pricing`, { headers: L, data: { name: 'Lifeline Kukatpally', facility_type: 'Laboratory', address_line_1: '9 JNTU Road', address_line_2: 'Kukatpally', city: 'Hyderabad', state: 'Telangana', pincode: '500072', phone: '9876500055', provider_type: 'Laboratory' } }), 'centre');
  const centre = Number(c.facility?.id || c.data?.facility?.id);
  const master = await ok(await request.get(`${api}/lab-tests`, { headers: L }), 'master');
  await ok(await request.put(`${api}/lab-tests/offerings/me/${master.find((x: any) => x.code === 'THYROID').id}`, { headers: L, data: { price: 450 } }), 'offer');
  await ok(await request.post(`${api}/partners/${reg.current_account.partner_id}/submit`, { headers: L, data: {} }), 'live');
  const pa = await createTestPatient(request);
  const day = iso(new Date(Date.now() + 86400000));
  const order = await ok(await request.post(`${api}/lab-orders`, { headers: H(pa.token), data: { lab_partner_id: reg.current_account.partner_id, location_id: centre, test_codes: ['THYROID'], visit_date: day, visit_time: '08:30', payment_mode: 'CASH' } }), 'book');

  await loginAsTestPatient(page, pa);
  await page.goto('/dashboard');

  // Next visit: what, with whom, when (with time), where, reference.
  const next = page.getByRole('region', { name: 'Your next visit' });
  await expect(next).toContainText('Lab test');
  await expect(next).toContainText('Thyroid Profile');
  await expect(next).toContainText(`${labName} · Laboratory`);
  await expect(next).toContainText('8:30 AM');
  await expect(next).toContainText('Lifeline Kukatpally');
  await expect(next).toContainText(order.order_number);
  // Upcoming card names the lab test too (no "Appointment · Location to be confirmed").
  await expect(next).toContainText(labName);
  await expect(page.getByText('Location to be confirmed')).toHaveCount(0);
  if (shots) await page.screenshot({ path: `${shots}/dash_next_visit.png`, fullPage: true });

  // Search suggestions while typing.
  await page.getByLabel('Search Vizito').fill('thyr');
  const hit = page.getByRole('banner').getByRole('button', { name: /Thyroid Profile/ });
  await expect(hit).toBeVisible({ timeout: 20000 });
  if (shots) await page.screenshot({ path: `${shots}/dash_search_suggest.png` });
  await hit.click();
  await expect(page).toHaveURL(/\/lab-tests\?test=THYROID/);
  await expect(page.getByRole('region', {name:'Choose tests'}).getByRole('checkbox', {name:/Thyroid Profile/})).toBeChecked();

  // Service tiles: Lab Tests opens lab booking (not "online booking isn't available").
  await page.goto('/dashboard');
  await page.getByRole('region', {name:'Healthcare services'}).getByRole('link', {name:'Lab Tests',exact:true}).click();
  await expect(page).toHaveURL(/\/lab-tests$/);
  await expect(page.getByRole('heading', { name: 'Book lab tests' })).toBeVisible();
});
