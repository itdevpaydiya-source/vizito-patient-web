import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { createTestPatient, loginAsTestPatient } from './helpers/testAccount';
const api = 'http://localhost:3000';
test.use({ actionTimeout: 15000 });
test.describe.configure({ timeout: 90000 });
async function shot(page: any, name: string) { await mkdir('artifacts/ui-audit-20261025', { recursive: true }); await page.screenshot({ path: `artifacts/ui-audit-20261025/${name}.png`, fullPage: true }); }
test('real rental response shows payable-on-delivery confirmation and survives refresh', async ({ page, request }) => {
 const patient = await createTestPatient(request), headers = { Authorization: `Bearer ${patient.token}` };
 const catalogue = await (await request.get(`${api}/rental/patient/products`, { headers })).json();
 const product = (Array.isArray(catalogue) ? catalogue : catalogue.items).find((p: any) => p.is_available && p.available_quantity > 0);
 expect(product, 'At least one real rentable product is needed').toBeTruthy();
 const start = new Date(Date.now() + 86400000), end = new Date(start.getTime() + Math.max(1, product.min_rental_days) * 86400000);
 const iso = (d: Date) => d.toISOString().slice(0,10);
 const created = await request.post(`${api}/rental/patient/orders`, { headers, data: { product_id: product.id, quantity: 1, start_date: iso(start), end_date: iso(end), delivery_fee: 0, delivery_method: 'doorstep', delivery_address: { recipientName: patient.fullName, phone: patient.mobile, addressLine: 'Audit delivery address', city: 'Hyderabad', pincode: '500081' } } });
 expect(created.ok(), await created.text()).toBeTruthy(); const order = await created.json();
 try {
  await loginAsTestPatient(page, patient); await page.goto(`/equipment-rental/orders/${order.id}/confirmation`);
  await expect(page.getByRole('heading', { name: 'Rental order placed' })).toBeVisible();
  await expect(page.getByText(`Order ${order.order_number}`, { exact: true })).toBeVisible();
  await expect(page.getByText('Nothing charged online.', { exact: true })).toBeVisible();
  await expect(page.getByText('Amount payable on delivery:', { exact: true }).locator('../..')).toContainText(Number(order.total_amount).toLocaleString('en-IN'));
  await expect(page.getByText('Audit delivery address, Hyderabad, 500081')).toBeVisible();
  await expect(page.getByText(product.name, { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByText(`Order ${order.order_number}`, { exact: true })).toBeVisible();
  await shot(page, 'rental-confirmation'); await page.getByRole('link', { name: 'My orders', exact: true }).click(); await expect(page).toHaveURL(/equipment-rental\/orders$/);
 } finally { await request.post(`${api}/rental/patient/orders/${order.id}/cancel`, { headers, data: { reason: 'Local UI audit verification complete' } }); }
});
test('patient login displays only the test code actually returned by the backend', async ({ page, request }) => {
 const patient = await createTestPatient(request); await page.goto('/auth/login');
 await page.getByRole('button', { name: 'Login with OTP instead' }).click();
 await page.getByPlaceholder('Enter mobile number or email').fill(patient.mobile);
 const response = page.waitForResponse(r => r.url().includes('/patient/auth/send-otp') && r.request().method() === 'POST');
 await page.getByRole('button', { name: 'Send OTP', exact: true }).click();
 const result = await (await response).json(); expect(result.dev_otp || result.otp).toBeTruthy();
 await expect(page.getByText(`Test mode: your code is ${result.dev_otp || result.otp}`, { exact: false })).toBeVisible();
 await shot(page, 'patient-test-otp');
});
test('ambulance urgent route is a real link and operator choice is explained', async ({ page, request }) => {
 const patient = await createTestPatient(request); await loginAsTestPatient(page, patient); await page.goto('/book-ambulance');
 await expect(page.getByRole('link', { name: 'Urgent ambulance', exact: true })).toHaveAttribute('href', '/urgent-ambulance');
 const choose = page.getByRole('button', { name: /Prefer to choose an operator/ });
 if (await choose.isVisible()) await choose.click();
 const select = page.getByLabel('Vehicle type', { exact: true });
 await expect(select).toBeVisible();
 const types = await select.locator('option').evaluateAll(options => options.map(o => (o as HTMLOptionElement).value).filter(Boolean));
 expect(types.length).toBeGreaterThan(0); await select.selectOption(types[0]);
 const count = await page.getByRole('radio').count();
 if (count === 1) await expect(page.getByRole('radio')).toBeChecked();
 else { await expect(page.getByRole('button', { name: 'Book ambulance', exact: true })).toBeDisabled(); await expect(page.getByText('Choose an operator', { exact: true })).toBeVisible(); }
 await shot(page, 'ambulance-operator-guidance');
});
