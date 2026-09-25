import { test, expect, type APIRequestContext } from '@playwright/test';
import { createTestPatient } from './helpers/testAccount';
import { standardCategoryResponse } from './helpers/catalog';

// Backend-only (no UI driving) — these prove the Order payment/refund LIFECYCLE itself
// (P-01: REFUND_PENDING actually reaching REFUNDED; P-02: pay()/processRefund() not
// holding a DB lock across the simulated provider's 900ms call), not any particular
// screen. pharmacy-ordering.spec.ts already covers the real UI for placing/paying an
// order; this file picks up exactly where that leaves off.
const API = 'http://localhost:3000';

async function registerPharmacy(request: APIRequestContext, unique: number) {
  const res = await request.post(`${API}/auth/register`, {
    data: {
      full_name: `PW Refund Pharmacy ${unique}`, phone: `8${String(unique).slice(-9)}`,
      email: `pw-refund-pharm-${unique}@vizito.test`, date_of_birth: '1990-01-01', gender: 'male',
      provider_type_id: 6, password: 'PlaywrightTest123!', pharmacyName: `PW Refund Pharmacy ${unique}`,
    },
  });
  if (!res.ok()) throw new Error(`registerPharmacy failed: ${res.status()} ${await res.text()}`);
  const json = await res.json();
  return { token: json.access_token as string, partnerId: json.current_account.partner_id as string };
}

async function registerDoctor(request: APIRequestContext, unique: number) {
  const res = await request.post(`${API}/auth/register`, {
    data: {
      full_name: `PW Refund Doctor ${unique}`, phone: `7${String(unique).slice(-9)}`,
      email: `pw-refund-doc-${unique}@vizito.test`, date_of_birth: '1990-01-01', gender: 'male',
      provider_type_id: 5, password: 'PlaywrightTest123!',
      medicalRegNo: `PW-REFUND-${unique}`, qualification: 'MBBS', specialization: 'General Medicine', experience: 4,
    },
  });
  if (!res.ok()) throw new Error(`registerDoctor failed: ${res.status()} ${await res.text()}`);
  const json = await res.json();
  return { token: json.access_token as string };
}

async function makeMedicine(request: APIRequestContext, doctorToken: string, pharmacyToken: string, unique: number, mrp: number) {
  const catRes = await standardCategoryResponse(request);
  if (!catRes.ok()) throw new Error(`create category failed: ${catRes.status()} ${await catRes.text()}`);
  const category = await catRes.json();
  const medRes = await request.post(`${API}/medicines`, {
    headers: { Authorization: `Bearer ${doctorToken}` },
    data: {
      medicine_name: `PW Refund Med ${unique}`, generic_name: 'Paracetamol', strength: '500', dosage_form: 'Tablet',
      category_id: category.id, mrp, requires_prescription: false,
    },
  });
  if (!medRes.ok()) throw new Error(`create medicine failed: ${medRes.status()} ${await medRes.text()}`);
  const medicine = await medRes.json();
  const stockRes = await request.post(`${API}/medicine-stock`, {
    headers: { Authorization: `Bearer ${pharmacyToken}` },
    data: { medicine_id: medicine.id, batch_number: `PWRF${unique}`, expiry_date: '2028-01-01', quantity_received: 50 },
  });
  if (!stockRes.ok()) throw new Error(`stock-in failed: ${stockRes.status()} ${await stockRes.text()}`);
  return medicine;
}

async function createAndPayOrder(
  request: APIRequestContext,
  patientToken: string,
  pharmacyPartnerId: string,
  medicineId: string,
) {
  const orderRes = await request.post(`${API}/orders`, {
    headers: { Authorization: `Bearer ${patientToken}` },
    data: {
      pharmacy_partner_id: pharmacyPartnerId,
      fulfillment_type: 'PICKUP',
      payment_method: 'UPI',
      items: [{ medicine_id: medicineId, quantity: 1 }],
    },
  });
  if (!orderRes.ok()) throw new Error(`create order failed: ${orderRes.status()} ${await orderRes.text()}`);
  const order = await orderRes.json();

  const payRes = await request.post(`${API}/orders/${order.id}/payment`, {
    headers: { Authorization: `Bearer ${patientToken}` },
    data: { payment_method: 'UPI', upi_id: 'patient@upi' },
  });
  if (!payRes.ok()) throw new Error(`pay failed: ${payRes.status()} ${await payRes.text()}`);
  const payResult = await payRes.json();
  expect(payResult.payment_status).toBe('PAID');

  return order.id as string;
}

async function getOrder(request: APIRequestContext, pharmacyToken: string, orderId: string) {
  const res = await request.get(`${API}/orders/${orderId}`, { headers: { Authorization: `Bearer ${pharmacyToken}` } });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function waitForRefunded(request: APIRequestContext, pharmacyToken: string, orderId: string, timeoutMs = 15000) {
  const start = Date.now();
  let last: any;
  while (Date.now() - start < timeoutMs) {
    last = await getOrder(request, pharmacyToken, orderId);
    if (last.payment_status === 'REFUNDED' || last.payment_status !== 'REFUND_PENDING') return last;
    await new Promise((r) => setTimeout(r, 500));
  }
  return last;
}

test.describe('Order payment/refund lifecycle (P-01, P-02) — real backend, no UI', () => {
  // Serial, not parallel: MedicinesService.create()'s `code` generation is a separate,
  // pre-existing non-atomic sequence (same bug class as the invoice-number race this
  // session already fixed for Sale, just not yet fixed for Medicine — out of Workstream
  // 5's scope) that collides under concurrent creation. Running these serially avoids
  // that unrelated race instead of masking it.
  test.describe.configure({ mode: 'serial' });


  test('cancellation after payment automatically drives REFUND_PENDING to REFUNDED (successful refund)', async ({ request }) => {
    const unique = Date.now() + Math.floor(Math.random() * 1000);
    const pharmacy = await registerPharmacy(request, unique);
    const doctor = await registerDoctor(request, unique);
    const medicine = await makeMedicine(request, doctor.token, pharmacy.token, unique, 30);
    const patient = await createTestPatient(request);

    const orderId = await createAndPayOrder(request, patient.token, pharmacy.partnerId, medicine.id);

    const cancelRes = await request.post(`${API}/orders/${orderId}/cancel`, {
      headers: { Authorization: `Bearer ${pharmacy.token}` },
      data: { reason: 'Playwright: successful refund case' },
    });
    expect(cancelRes.ok()).toBeTruthy();
    const cancelled = await cancelRes.json();
    expect(cancelled.status).toBe('CANCELLED');
    // Set synchronously by cancel() itself, before the fire-and-forget refund attempt.
    expect(cancelled.payment_status).toBe('REFUND_PENDING');

    const finalOrder = await waitForRefunded(request, pharmacy.token, orderId);
    expect(finalOrder.payment_status).toBe('REFUNDED');
    expect(finalOrder.refund_reference_id).toMatch(/^VZT-SIM-/);
    expect(finalOrder.refunded_at).toBeTruthy();
    expect(finalOrder.refund_processing_at).toBeNull();

    // Repeated cancellation must be rejected outright, not silently re-processed —
    // proves a second cancel() call can never fire a second refund attempt.
    const secondCancel = await request.post(`${API}/orders/${orderId}/cancel`, {
      headers: { Authorization: `Bearer ${pharmacy.token}` },
      data: { reason: 'Playwright: repeated cancellation attempt' },
    });
    expect(secondCancel.status()).toBe(400);
  });

  test('a provider-declined refund leaves the order retryable at REFUND_PENDING, and retry-refund is safe to call again (failed refund + retry)', async ({ request }) => {
    const unique = Date.now() + Math.floor(Math.random() * 1000);
    const pharmacy = await registerPharmacy(request, unique);
    const doctor = await registerDoctor(request, unique);
    // 4242.42 is SimulatedPaymentProvider's deterministic refund-decline trigger.
    const medicine = await makeMedicine(request, doctor.token, pharmacy.token, unique, 4242.42);
    const patient = await createTestPatient(request);

    const orderId = await createAndPayOrder(request, patient.token, pharmacy.partnerId, medicine.id);

    const cancelRes = await request.post(`${API}/orders/${orderId}/cancel`, {
      headers: { Authorization: `Bearer ${pharmacy.token}` },
      data: { reason: 'Playwright: failed refund case' },
    });
    expect(cancelRes.ok()).toBeTruthy();

    const afterAutoAttempt = await waitForRefunded(request, pharmacy.token, orderId);
    // Deterministically declined — must stay REFUND_PENDING, never silently marked done.
    expect(afterAutoAttempt.payment_status).toBe('REFUND_PENDING');
    expect(afterAutoAttempt.refund_failure_reason).toContain('Refund rejected');
    expect(afterAutoAttempt.refund_processing_at).toBeNull();
    expect(afterAutoAttempt.refund_attempts).toBeGreaterThanOrEqual(1);

    // Manual retry (pharmacy-facing endpoint) — same deterministic decline, so it fails
    // again, but must do so CLEANLY: no crash, no corrupted state, still retryable, and
    // the attempt counter actually advances (proves this was a real second attempt, not
    // a no-op).
    const retryRes = await request.post(`${API}/orders/${orderId}/retry-refund`, {
      headers: { Authorization: `Bearer ${pharmacy.token}` },
    });
    expect(retryRes.ok()).toBeTruthy();
    const retryResult = await retryRes.json();
    expect(retryResult.success).toBe(false);

    const afterRetry = await getOrder(request, pharmacy.token, orderId);
    expect(afterRetry.payment_status).toBe('REFUND_PENDING');
    expect(afterRetry.refund_attempts).toBeGreaterThan(afterAutoAttempt.refund_attempts);
  });

  test('concurrent duplicate refund requests never double-refund (idempotent, no race)', async ({ request }) => {
    const unique = Date.now() + Math.floor(Math.random() * 1000);
    const pharmacy = await registerPharmacy(request, unique);
    const doctor = await registerDoctor(request, unique);
    const medicine = await makeMedicine(request, doctor.token, pharmacy.token, unique, 60);
    const patient = await createTestPatient(request);

    const orderId = await createAndPayOrder(request, patient.token, pharmacy.partnerId, medicine.id);

    const cancelRes = await request.post(`${API}/orders/${orderId}/cancel`, {
      headers: { Authorization: `Bearer ${pharmacy.token}` },
      data: { reason: 'Playwright: concurrent refund race' },
    });
    expect(cancelRes.ok()).toBeTruthy();

    // Fire two manual retry-refund calls at the same moment the fire-and-forget auto-
    // attempt from cancel() is also in flight — three simultaneous callers racing for
    // the same refund. Every one must either succeed, report already_refunded, or be
    // cleanly rejected as already-in-progress; none may throw an unhandled 500, and
    // every terminal reference id seen must be the SAME one.
    const [r1, r2] = await Promise.all([
      request.post(`${API}/orders/${orderId}/retry-refund`, { headers: { Authorization: `Bearer ${pharmacy.token}` } }),
      request.post(`${API}/orders/${orderId}/retry-refund`, { headers: { Authorization: `Bearer ${pharmacy.token}` } }),
    ]);
    // A rejection here must be the expected 409 (already in progress), never a 500.
    for (const r of [r1, r2]) {
      expect([200, 201, 409]).toContain(r.status());
    }

    const finalOrder = await waitForRefunded(request, pharmacy.token, orderId);
    expect(finalOrder.payment_status).toBe('REFUNDED');

    const referenceIds = new Set<string>();
    for (const r of [r1, r2]) {
      if (r.ok()) {
        const body = await r.json();
        if (body.reference_id) referenceIds.add(body.reference_id);
      }
    }
    referenceIds.add(finalOrder.refund_reference_id);
    // Exactly one real refund reference must exist across every caller that saw a
    // successful outcome — never two, which would mean the money was refunded twice.
    expect(referenceIds.size).toBe(1);
  });
});
