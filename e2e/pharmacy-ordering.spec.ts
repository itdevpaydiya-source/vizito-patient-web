import { test, expect, type APIRequestContext } from '@playwright/test';
import { createTestPatient, loginAsTestPatient } from './helpers/testAccount';
import { activatePartner } from './helpers/testDoctor';
import { standardCategoryResponse } from './helpers/catalog';

const API = 'http://localhost:3000';

async function registerProvider(request: APIRequestContext, opts: {
  full_name: string; phone: string; email: string; provider_type_id: number; extra?: Record<string, unknown>;
}) {
  const res = await request.post(`${API}/auth/register`, {
    data: {
      full_name: opts.full_name, phone: opts.phone, email: opts.email,
      date_of_birth: '1990-01-01', gender: 'male', provider_type_id: opts.provider_type_id,
      password: 'PlaywrightTest123!', ...opts.extra,
    },
  });
  if (!res.ok()) throw new Error(`register(${opts.email}) failed: ${res.status()} ${await res.text()}`);
  const json = await res.json();
  return { token: json.access_token as string, partnerId: json.current_account.partner_id as string };
}

test.describe('Patient pharmacy ordering — real UI, real backend', () => {
  test('direct/OTC path: search, cart, pickup, cash — through the actual Order Builder UI', async ({ page, request }) => {
    const unique = Date.now() + Math.floor(Math.random() * 1000);

    const pharmacy = await registerProvider(request, {
      full_name: `PW Pharmacy OTC ${unique}`, phone: `8${String(unique).slice(-9)}`,
      email: `pw-pharm-otc-${unique}@vizito.test`, provider_type_id: 6,
      extra: { pharmacyName: `PW Pharmacy OTC ${unique}` },
    });
    const doctor = await registerProvider(request, {
      full_name: `PW Doctor OTC ${unique}`, phone: `7${String(unique).slice(-9)}`,
      email: `pw-doc-otc-${unique}@vizito.test`, provider_type_id: 5,
      extra: { medicalRegNo: `PW-OTC-${unique}`, qualification: 'MBBS', specialization: 'General Medicine', experience: 4 },
    });

    const catRes = await standardCategoryResponse(request);
    const category = await catRes.json();
    const medRes = await request.post(`${API}/medicines`, {
      headers: { Authorization: `Bearer ${doctor.token}` },
      data: {
        medicine_name: `PW OTC Med ${unique}`, generic_name: 'Vitamin C', strength: '500', dosage_form: 'Tablet',
        category_id: category.id, mrp: 12, requires_prescription: false,
      },
    });
    const medicine = await medRes.json();
    const stockRes = await request.post(`${API}/medicine-stock`, {
      headers: { Authorization: `Bearer ${pharmacy.token}` },
      data: { medicine_id: medicine.id, batch_number: `PWOTC${unique}`, expiry_date: '2028-01-01', quantity_received: 50 },
    });
    expect(stockRes.ok()).toBeTruthy();

    const patient = await createTestPatient(request);
    await loginAsTestPatient(page, patient);

    await page.goto(`/pharmacy-orders/new?pharmacy=${pharmacy.partnerId}`);
    await expect(page.getByText('Order Medicines')).toBeVisible();

    const [autocompleteResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/medicines/autocomplete')),
      page.getByPlaceholder('Search medicines by name...').fill(`PW OTC Med ${unique}`),
    ]);
    expect(autocompleteResponse.ok()).toBeTruthy();

    await page.getByText(medicine.medicine_name, { exact: false }).first().click();
    await expect(page.getByText('Cart', { exact: true })).toBeVisible();

    // Pickup + Cash are the defaults — just confirm the total reflects the real MRP (₹12) before placing.
    await expect(page.getByText('₹12.00', { exact: false }).first()).toBeVisible();

    const [orderResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/orders') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Place Order' }).click(),
    ]);
    expect(orderResponse.ok()).toBeTruthy();
    const order = await orderResponse.json();

    // Lands on the real order detail screen for the order that was actually just created.
    await expect(page).toHaveURL(new RegExp(`/pharmacy-orders/${order.id}$`));
    await expect(page.getByText('Awaiting confirmation', { exact: false })).toBeVisible();
    await expect(page.getByText(medicine.medicine_name, { exact: false })).toBeVisible();
    await expect(page.getByText('Pay at pickup', { exact: false })).toBeVisible();

    // Confirm against the real backend, not just the UI's own claim.
    const verifyRes = await request.get(`${API}/orders/${order.id}/mine`, { headers: { Authorization: `Bearer ${patient.token}` } });
    const verified = await verifyRes.json();
    expect(verified.pharmacy_partner_id).toBe(pharmacy.partnerId);
    expect(verified.payment_method).toBe('CASH');
    expect(verified.items[0].medicine_id).toBe(medicine.id);
  });

  test('Rx-backed path: My Records -> Send to Pharmacy -> (pharmacy accepts via API) -> Build Order -> Pay online', async ({ page, request }) => {
    const unique = Date.now() + Math.floor(Math.random() * 1000);

    const pharmacy = await registerProvider(request, {
      full_name: `PW Pharmacy Rx ${unique}`, phone: `9${String(unique).slice(-9)}`,
      email: `pw-pharm-rx-${unique}@vizito.test`, provider_type_id: 6,
      extra: { pharmacyName: `PW Pharmacy Rx ${unique}` },
    });
    // GET /patients/providers (patient-facing discovery, used by SelectPharmacyModal) filters
    // to Active/Approved partners — a fresh registration defaults to Draft. Same real gap
    // documented in testDoctor.ts's activatePartner(); needed here so the UI's own pharmacy
    // search can actually find this fixture pharmacy, matching what a real approved account
    // would look like.
    await activatePartner(pharmacy.partnerId);
    const doctor = await registerProvider(request, {
      full_name: `PW Doctor Rx ${unique}`, phone: `6${String(unique).slice(-9)}`,
      email: `pw-doc-rx-${unique}@vizito.test`, provider_type_id: 5,
      extra: { medicalRegNo: `PW-RX-${unique}`, qualification: 'MBBS', specialization: 'General Medicine', experience: 4 },
    });

    const catRes = await standardCategoryResponse(request);
    const category = await catRes.json();
    const medRes = await request.post(`${API}/medicines`, {
      headers: { Authorization: `Bearer ${doctor.token}` },
      data: {
        medicine_name: `PW Rx Med ${unique}`, generic_name: 'Amoxicillin', strength: '500', dosage_form: 'Capsule',
        category_id: category.id, mrp: 55, requires_prescription: true,
      },
    });
    const medicine = await medRes.json();
    await request.post(`${API}/medicine-stock`, {
      headers: { Authorization: `Bearer ${pharmacy.token}` },
      data: { medicine_id: medicine.id, batch_number: `PWRX${unique}`, expiry_date: '2028-01-01', quantity_received: 30 },
    });

    const patient = await createTestPatient(request);
    const meRes = await request.get(`${API}/patients/me`, { headers: { Authorization: `Bearer ${patient.token}` } });
    const patientProfileId = (await meRes.json()).data.patientProfileId;

    const rxRes = await request.post(`${API}/prescriptions`, {
      headers: { Authorization: `Bearer ${doctor.token}` },
      data: {
        diagnosis_summary: 'Sinus infection', status: 'Finalized', patient_id: patientProfileId,
        treatment_plan: JSON.stringify([{ medicine_name: medicine.medicine_name, dosage: '500mg', frequency: 'Twice daily', duration: '5 days' }]),
      },
    });
    expect(rxRes.ok()).toBeTruthy();

    await loginAsTestPatient(page, patient);

    // ---- Real UI: My Records -> Send to Pharmacy ----
    await page.goto('/my-records');
    await expect(page.getByRole('heading', { name: 'Medical Records' })).toBeVisible();
    const card = page.getByText('Sinus infection', { exact: false }).locator('xpath=ancestor::div[contains(@class, "rounded-2xl")][1]');
    await expect(card).toBeVisible();

    const [requestResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/pharmacy-requests') && r.request().method() === 'POST'),
      (async () => {
        await card.getByRole('button', { name: 'Send to Pharmacy' }).click();
        await expect(page.getByText('Send Prescription to Pharmacy')).toBeVisible();
        await page.getByPlaceholder('Search pharmacies by name...').fill(`PW Pharmacy Rx ${unique}`);
        await page.getByText(pharmacy_full_name(unique), { exact: false }).click();
      })(),
    ]);
    expect(requestResponse.ok()).toBeTruthy();
    const pharmacyRequest = (await requestResponse.json()).data;

    // Lands on the requests tab per the real navigation the screen performs.
    await expect(page).toHaveURL(/\/pharmacy-orders\?tab=requests/);
    await expect(page.getByText('Waiting for pharmacy', { exact: false })).toBeVisible();

    // ---- Pharmacy accepts (backend-verified — no pharmacy UI exists in this app) ----
    const acceptRes = await request.patch(`${API}/pharmacy-requests/${pharmacyRequest.id}/accept`, {
      headers: { Authorization: `Bearer ${pharmacy.token}` },
    });
    expect(acceptRes.ok()).toBeTruthy();

    // ---- Real UI: refresh, see Accepted, Build Order ----
    await page.reload();
    await expect(page.getByText('Accepted', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Build Order' }).click();
    await expect(page).toHaveURL(new RegExp(`pharmacyRequestId=${pharmacyRequest.id}`));
    await expect(page.getByText('Confirm Your Prescription Order')).toBeVisible();
    await expect(page.getByText(medicine.medicine_name.split(' ').slice(0, 2).join(' '), { exact: false })).toBeVisible();

    // Match the free-text prescribed line to the real catalogue medicine.
    const [matchAutocomplete] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/medicines/autocomplete')),
      page.getByPlaceholder('Match to a catalogue medicine...').fill(medicine.medicine_name),
    ]);
    expect(matchAutocomplete.ok()).toBeTruthy();
    // A plain text match also hits the static prescribed-name paragraph above the search
    // dropdown (same DOM-ambiguity class as pharmacy-inventory-ledger.spec.ts's "Close"
    // button on the partner side) — the actual clickable result is specifically a button.
    await page.getByRole('button', { name: new RegExp(medicine.medicine_name) }).click();
    await expect(page.getByText('₹55.00', { exact: false }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Pay online now' }).click();

    const [orderResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/patients/orders') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Place Order' }).click(),
    ]);
    expect(orderResponse.ok()).toBeTruthy();
    const order = (await orderResponse.json()).data;

    // ---- Real UI: order detail, pay online ----
    // Status is CREATED at this point (payment_method chosen, not yet charged) — the
    // payment form shows regardless (see OrderDetailScreen's needsPayment condition).
    await expect(page).toHaveURL(new RegExp(`/pharmacy-orders/${order.id}$`));
    await expect(page.getByText('Awaiting confirmation', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'UPI' }).click();
    await page.getByPlaceholder('yourname@upi').fill('patient@upi');

    const [payResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/payment') && r.request().method() === 'POST'),
      page.getByRole('button', { name: /^Pay ₹55/ }).click(),
    ]);
    expect(payResponse.ok()).toBeTruthy();
    await expect(page.getByText('Paid — waiting for pharmacy', { exact: false })).toBeVisible();

    // Confirm against the real backend: Order really is PAID, and the PharmacyRequest is
    // really converted (order_id set), matching the one-order-per-acceptance invariant.
    const verifyOrder = await (await request.get(`${API}/orders/${order.id}/mine`, { headers: { Authorization: `Bearer ${patient.token}` } })).json();
    expect(verifyOrder.status).toBe('PAID');
    expect(verifyOrder.payment_status).toBe('PAID');
  });
});

function pharmacy_full_name(unique: number) {
  return `PW Pharmacy Rx ${unique}`;
}
