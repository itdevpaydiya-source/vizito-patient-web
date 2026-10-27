import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { loginAsTestPatient } from './helpers/testAccount';
const api = 'http://localhost:3000'; test.use({ actionTimeout: 15000 }); test.describe.configure({ timeout: 90000 });
async function shot(page: any, name: string) { await mkdir('artifacts/ui-audit-20261025', { recursive: true }); await page.screenshot({ path: `artifacts/ui-audit-20261025/${name}.png`, fullPage: true }); }
test('patient signup displays the test code supplied by the real registration API', async ({ page }) => {
 await page.goto('/auth/register'); const phone = `8${String(Date.now()).slice(-9)}`;
 await page.getByPlaceholder('10-digit mobile number', { exact: true }).fill(phone);
 const response = page.waitForResponse(r => r.url().includes('/patient/auth/register/send-otp') && r.request().method() === 'POST');
 await page.getByRole('button', { name: 'Send Verification OTP', exact: true }).click();
 const body = await (await response).json(); expect(body.dev_otp || body.otp).toBeTruthy();
 await expect(page.getByText(`Test mode: your code is ${body.dev_otp || body.otp}`, { exact: false })).toBeVisible();
 await shot(page, 'patient-signup-test-code');
});
test('real pharmacy order address avoids duplicate Near', async ({ page, request }) => {
 const phone = '9753113579'; const sent = await (await request.post(`${api}/patient/auth/send-otp`, { data: { phone } })).json();
 expect(sent.dev_otp || sent.otp).toBeTruthy();
 const verified = await request.post(`${api}/patient/auth/verify-otp`, { data: { phone, otp: sent.dev_otp || sent.otp } }); expect(verified.ok()).toBeTruthy(); const session = await verified.json();
 const token = session.access_token || session.token, headers = { Authorization: `Bearer ${token}` };
 await loginAsTestPatient(page, { patientId: session.patient_id, fullName: session.full_name, mobile: session.mobile || phone, email: session.email || '', password: '', token });
 const response = await request.get(`${api}/orders/mine`, { headers }); expect(response.ok()).toBeTruthy(); const raw = await response.json(), orders = raw.data || raw; expect(orders.length).toBeGreaterThan(0);
 await page.goto(`/pharmacy-orders/${orders[0].id}`);
 await expect(page.getByRole('heading', { name: /Pharmacy details|Fulfilled by/ })).toBeVisible();
 await expect(page.locator('main')).not.toContainText(/Near\s+Near/i); await shot(page, 'patient-pharmacy-order-address');
});
