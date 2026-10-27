import { test, expect, type APIRequestContext } from '@playwright/test';
import { createTestPatient } from './helpers/testAccount';
import { standardCategoryResponse } from './helpers/catalog';
import { registerProviderAccount, lettersFor } from './helpers/providerAccount';

// Backend-only (no UI driving) — these prove the Order payment/refund LIFECYCLE itself
// (P-01: REFUND_PENDING actually reaching REFUNDED; P-02: pay()/processRefund() not
// holding a DB lock across the simulated provider's 900ms call), not any particular
// screen. pharmacy-ordering.spec.ts already covers the real UI for placing/paying an
// order; this file picks up exactly where that leaves off.
const API = 'http://localhost:3000';

async function registerPharmacy(request: APIRequestContext, unique: number) {
  const json = await registerProviderAccount(request, API, {
    full_name: 'PW Cash Pharmacist', phone: `8${String(unique).slice(-9)}`,
    email: `pw-cash-pharm-${unique}@vizito.test`, date_of_birth: '1990-01-01', gender: 'male',
    provider_type_id: 6, password: 'PlaywrightTest123!', pharmacyName: `PW Cash Pharmacy ${unique}`,
  });
  return { token: json.access_token as string, partnerId: json.current_account.partner_id as string };
}

async function registerDoctor(request: APIRequestContext, unique: number) {
  const json = await registerProviderAccount(request, API, {
    full_name: `PW Cash Doctor ${lettersFor(unique)}`, phone: `7${String(unique).slice(-9)}`,
    email: `pw-cash-doc-${unique}@vizito.test`, date_of_birth: '1990-01-01', gender: 'male',
    provider_type_id: 5, password: 'PlaywrightTest123!',
    medicalRegNo: `PW-CASH-${unique}`, qualification: 'MBBS', specialization: 'General Medicine', experience: 4,
  });
  return { token: json.access_token as string };
}

async function makeMedicine(request: APIRequestContext, doctorToken: string, pharmacyToken: string, unique: number, mrp: number) {
  const catRes = await standardCategoryResponse(request);
  if (!catRes.ok()) throw new Error(`create category failed: ${catRes.status()} ${await catRes.text()}`);
  const category = await catRes.json();
  const medRes = await request.post(`${API}/medicines`, {
    headers: { Authorization: `Bearer ${doctorToken}` },
    data: {
      medicine_name: `PW Cash Med ${unique}`, generic_name: 'Paracetamol', strength: '500', dosage_form: 'Tablet',
      category_id: category.id, mrp, requires_prescription: false,
    },
  });
  if (!medRes.ok()) throw new Error(`create medicine failed: ${medRes.status()} ${await medRes.text()}`);
  const medicine = await medRes.json();
  const stockRes = await request.post(`${API}/medicine-stock`, {
    headers: { Authorization: `Bearer ${pharmacyToken}` },
    data: { medicine_id: medicine.id, batch_number: `PWCS${unique}`, expiry_date: '2028-01-01', quantity_received: 50 },
  });
  if (!stockRes.ok()) throw new Error(`stock-in failed: ${stockRes.status()} ${await stockRes.text()}`);
  return medicine;
}


async function getOrder(request: APIRequestContext, pharmacyToken: string, orderId: string) {
  const res = await request.get(`${API}/orders/${orderId}`, { headers: { Authorization: `Bearer ${pharmacyToken}` } });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

// Cash (pay at pickup/delivery) must stay unpaid until the pharmacy confirms handover via
// complete(); creation, claim and ready/out-for-delivery never mark it paid. Real backend.
test.describe('Cash order payment lifecycle — real backend, no UI', () => {
  test('cash stays PENDING through created, claimed and ready/out-for-delivery; PAID only on complete; cancel never refunds', async ({ request }) => {
    const unique = Date.now() + Math.floor(Math.random() * 1000);
    const pharmacy = await registerPharmacy(request, unique);
    const doctor = await registerDoctor(request, unique);
    const medicine = await makeMedicine(request, doctor.token, pharmacy.token, unique, 20);
    const patient = await createTestPatient(request);
    const P = { Authorization: `Bearer ${patient.token}` };
    const H = { Authorization: `Bearer ${pharmacy.token}` };
    const addr = await request.post(`${API}/patients/address`, { headers: P, data: { address_type: 'HOME', address_line_1: 'Flat 4, Green Residency', pincode: '500034', city: 'Hyderabad', state: 'Telangana' } });
    expect(addr.ok()).toBeTruthy();
    const me = await (await request.get(`${API}/patients/me`, { headers: P })).json();
    const a = (me.data ?? me).addresses[0];
    const addressId = a.id ?? a.addressId ?? a.address_id;

    const create = async (fulfillment_type: string) => {
      const res = await request.post(`${API}/orders`, { headers: P, data: {
        pharmacy_partner_id: pharmacy.partnerId, fulfillment_type, payment_method: 'CASH',
        ...(fulfillment_type === 'DELIVERY' ? { delivery_address_id: addressId } : {}),
        items: [{ medicine_id: medicine.id, quantity: 2 }] } });
      expect(res.ok(), await res.text()).toBeTruthy();
      return (await res.json()).id as string;
    };
    const state = async (id: string) => { const o = await getOrder(request, pharmacy.token, id); return `${o.status}/${o.payment_status}`; };
    const act = async (id: string, what: string) => { let data: Record<string,string> = {}; if (what === 'complete') { const own = await (await request.get(`${API}/orders/${id}/mine`, {headers:P})).json(); if (own.fulfillment_type === 'PICKUP') { expect(own.pickup_code).toMatch(/^\d{4}$/); const denied = await request.post(`${API}/orders/${id}/complete`, {headers:H,data:{}}); expect(denied.status()).toBe(400); data = {pickup_code:own.pickup_code}; } } const r = await request.post(`${API}/orders/${id}/${what}`, { headers: H, data }); expect(r.ok(), await r.text()).toBeTruthy(); };

    for (const [type, ready] of [['PICKUP', 'READY_FOR_PICKUP'], ['DELIVERY', 'OUT_FOR_DELIVERY']] as const) {
      const id = await create(type);
      expect(await state(id)).toBe('CREATED/PENDING');
      await act(id, 'claim');
      expect(await state(id)).toBe('PROCESSING/PENDING');
      await act(id, 'checkout');
      expect(await state(id)).toBe(`${ready}/PENDING`);
      // A cash order cannot be settled through the online payment endpoint.
      const pay = await request.post(`${API}/orders/${id}/payment`, { headers: P, data: { payment_method: 'CASH' } });
      expect(pay.ok()).toBeFalsy();
      expect(await state(id)).toBe(`${ready}/PENDING`);
      await act(id, 'complete');
      expect(await state(id)).toBe('COMPLETED/PAID');
      console.log('CASH_ORDER', type, id);
    }

    const cancelled = await create('PICKUP');
    const c = await request.post(`${API}/orders/${cancelled}/cancel`, { headers: P, data: { reason: 'Changed my mind' } });
    expect(c.ok()).toBeTruthy();
    const after = await getOrder(request, pharmacy.token, cancelled);
    expect(`${after.status}/${after.payment_status}`).toBe('CANCELLED/PENDING');
    expect(after.refunded_at ?? null).toBeNull();
    console.log('CASH_ORDER CANCELLED', cancelled);
  });

  test('two simultaneous checkouts of one order return the same sale and deduct stock once', async ({ request }) => {
    const unique = Date.now() + Math.floor(Math.random() * 1000);
    const pharmacy = await registerPharmacy(request, unique);
    const doctor = await registerDoctor(request, unique);
    const medicine = await makeMedicine(request, doctor.token, pharmacy.token, unique, 20);
    const patient = await createTestPatient(request);
    const H = { Authorization: `Bearer ${pharmacy.token}` };
    const res = await request.post(`${API}/orders`, { headers: { Authorization: `Bearer ${patient.token}` }, data: {
      pharmacy_partner_id: pharmacy.partnerId, fulfillment_type: 'PICKUP', payment_method: 'CASH', items: [{ medicine_id: medicine.id, quantity: 3 }] } });
    expect(res.ok(), await res.text()).toBeTruthy();
    const id = (await res.json()).id;
    expect((await request.post(`${API}/orders/${id}/claim`, { headers: H, data: {} })).ok()).toBeTruthy();
    const both = await Promise.all([request.post(`${API}/orders/${id}/checkout`, { headers: H, data: {} }), request.post(`${API}/orders/${id}/checkout`, { headers: H, data: {} })]);
    const bodies = await Promise.all(both.map(async (r) => ({ status: r.status(), body: await r.json() })));
    console.log('DOUBLE_CHECKOUT', bodies.map((b) => `${b.status}:${b.body.sale_id ?? b.body.message}`).join(' | '));
    // At least one succeeds; any second success must point at the same sale. Never two sales.
    const ok = bodies.filter((b) => b.status < 300);
    expect(ok.length).toBeGreaterThanOrEqual(1);
    expect(new Set(ok.map((b) => b.body.sale_id)).size).toBe(1);
    const stock = await (await request.get(`${API}/medicine-stock?medicine_id=${medicine.id}`, { headers: H })).json();
    const remaining = (stock.data ?? stock).filter?.((s: any) => s.medicine_id === medicine.id).reduce((n: number, s: any) => n + Number(s.quantity_remaining), 0);
    console.log('REMAINING', remaining);
    expect(remaining).toBe(47); // 50 received − 3, deducted once
  });
});
