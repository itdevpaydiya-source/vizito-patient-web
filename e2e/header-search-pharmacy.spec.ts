import { test, expect, type APIRequestContext } from '@playwright/test';
import { createTestPatient, loginAsTestPatient } from './helpers/testAccount';
import { activatePartner } from './helpers/testDoctor';

const API = process.env.VITE_API_URL || 'http://localhost:3000';

// Header search: choosing a pharmacy (the service or a specific pharmacy) must open medicine
// ordering, not the appointment booking screen.
test.describe.configure({ timeout: 120000 });

async function registerPharmacy(request: APIRequestContext, name: string) {
  const unique = Date.now();
  const reg = await request.post(`${API}/auth/register`, {
    data: {
      full_name: name, pharmacyName: name, phone: `8${String(unique).slice(-9)}`,
      email: `header-search-pharm-${unique}@vizito.test`, date_of_birth: '1990-01-01', gender: 'male',
      provider_type_id: 6, password: 'PlaywrightTest123!',
    },
  });
  expect(reg.ok()).toBeTruthy();
  return (await reg.json()).current_account.partner_id as string;
}

test('the "Pharmacy" service in header search opens medicine ordering', async ({ page, request }) => {
  const patient = await createTestPatient(request);
  await loginAsTestPatient(page, patient);
  await page.getByPlaceholder(/Search healthcare services, doctors/).fill('pharmacy');
  await page.getByRole('button').filter({ hasText: 'Medicines & Prescription Upload' }).click();
  await expect(page).toHaveURL(/\/pharmacy-orders\/new$/);
  await expect(page.getByText('Select Pharmacy').first()).toBeVisible();
});

test('a specific pharmacy in header search opens ordering from that pharmacy', async ({ page, request }) => {
  const pharmacyName = `Header Search Pharmacy ${Date.now()}`;
  const pharmacyPartnerId = await registerPharmacy(request, pharmacyName);
  // New providers are Draft (hidden from patients) until approved; there is no approval UI yet.
  await activatePartner(pharmacyPartnerId);
  const patient = await createTestPatient(request);
  await loginAsTestPatient(page, patient);
  await page.getByPlaceholder(/Search healthcare services, doctors/).fill(pharmacyName);
  await page.getByRole('button').filter({ hasText: pharmacyName }).filter({ hasNotText: 'View all results' }).first().click();
  await expect(page).toHaveURL(new RegExp(`/pharmacy-orders/new\\?pharmacy=${pharmacyPartnerId}`));
});
