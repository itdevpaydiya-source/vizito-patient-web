import { test, expect, type APIRequestContext } from '@playwright/test';
import { createTestPatient, loginAsTestPatient } from './helpers/testAccount';
import { activatePartner } from './helpers/testDoctor';
import { standardCategoryResponse } from './helpers/catalog';
import { registerProviderAccount, lettersFor } from './helpers/providerAccount';

const API = 'http://localhost:3000';

async function registerProvider(request: APIRequestContext, opts: {
  full_name: string; phone: string; email: string; provider_type_id: number; extra?: Record<string, unknown>;
}) {
  const json = await registerProviderAccount(request, API, {
    full_name: opts.full_name, phone: opts.phone, email: opts.email,
    date_of_birth: '1990-01-01', gender: 'male', provider_type_id: opts.provider_type_id,
    password: 'PlaywrightTest123!', ...opts.extra,
  });
  return { token: json.access_token as string, partnerId: json.current_account.partner_id as string };
}

test.describe('Audit P1: Up-front prescription required notice in pharmacy order builder', () => {
  test('Rx-required medicine shows notice UP FRONT before adding to cart, with button to My Records flow', async ({ page, request }) => {
    const unique = Date.now() + Math.floor(Math.random() * 1000);

    const pharmacy = await registerProvider(request, {
      full_name: `PW Pharmacy RxNotice ${lettersFor(unique)}`, phone: `8${String(unique).slice(-9)}`,
      email: `pw-pharm-rx-${unique}@vizito.test`, provider_type_id: 6,
      extra: { pharmacyName: `PW Pharmacy RxNotice ${unique}` },
    });
    const doctor = await registerProvider(request, {
      full_name: `PW Doctor RxNotice ${lettersFor(unique)}`, phone: `7${String(unique).slice(-9)}`,
      email: `pw-doc-rx-${unique}@vizito.test`, provider_type_id: 5,
      extra: { medicalRegNo: `PW-RXN-${unique}`, qualification: 'MBBS', specialization: 'General Medicine', experience: 5 },
    });

    const catRes = await standardCategoryResponse(request);
    const category = await catRes.json();

    // 1. Create an Rx-required medicine
    const rxMedRes = await request.post(`${API}/medicines`, {
      headers: { Authorization: `Bearer ${doctor.token}` },
      data: {
        medicine_name: `PW Rx Antibiotic ${unique}`, generic_name: 'Amoxicillin', strength: '500', dosage_form: 'Capsule',
        category_id: category.id, mrp: 85, requires_prescription: true,
      },
    });
    const rxMedicine = await rxMedRes.json();

    // 2. Stock it at the pharmacy
    const stockRes = await request.post(`${API}/medicine-stock`, {
      headers: { Authorization: `Bearer ${pharmacy.token}` },
      data: { medicine_id: rxMedicine.id, batch_number: `PWRX${unique}`, expiry_date: '2028-06-01', quantity_received: 40 },
    });
    expect(stockRes.ok()).toBeTruthy();

    await activatePartner(pharmacy.partnerId);
    await request.post(`${API}/partners/${pharmacy.partnerId}/addresses`, {
      headers: { Authorization: `Bearer ${pharmacy.token}` },
      data: { address_type: 'SHOP', address1: 'Shop 10, Main Road', address2: 'Hitech City, Hyderabad', zipcode: '500081', is_primary: true },
    });

    const patient = await createTestPatient(request);
    await loginAsTestPatient(page, patient);

    // 3. Open Order Builder directly for this pharmacy
    await page.goto(`/pharmacy-orders/new?pharmacy=${pharmacy.partnerId}`);
    const searchInput = page.getByRole('textbox', { name: 'Search medicines' });
    await expect(searchInput).toBeVisible({ timeout: 15000 });

    // 4. Search for the prescription medicine
    await searchInput.fill(`PW Rx Antibiotic ${unique}`);

    // 5. Verify the up-front notice is shown BEFORE adding to cart
    await expect(page.getByText("Needs a doctor's prescription — send your prescription to a pharmacy")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Rx required')).toBeVisible();

    // 6. Verify cart is still empty (it cannot be added to cart)
    await expect(page.getByText('Your cart ·')).toHaveCount(0);

    // 7. Verify the button navigates to the prescription flow (My records -> prescription -> Send to pharmacy)
    const sendBtn = page.getByRole('button', { name: 'Send to pharmacy' });
    await expect(sendBtn).toBeVisible();
    await sendBtn.click();

    // Should navigate to /my-records
    await expect(page).toHaveURL(/\/my-records/);
    await expect(page.getByRole('heading', { name: 'Medical records' })).toBeVisible({ timeout: 10000 });
  });
});
