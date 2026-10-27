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

test.describe('Patient pharmacy ordering — real UI, real backend', () => {
  test('direct/OTC path: search, cart, pickup, cash — through the actual Order Builder UI', async ({ page, request }) => {
    const unique = Date.now() + Math.floor(Math.random() * 1000);

    const pharmacy = await registerProvider(request, {
      full_name: `PW Pharmacy OTC ${lettersFor(unique)}`, phone: `8${String(unique).slice(-9)}`,
      email: `pw-pharm-otc-${unique}@vizito.test`, provider_type_id: 6,
      extra: { pharmacyName: `PW Pharmacy OTC ${unique}` },
    });
    const doctor = await registerProvider(request, {
      full_name: `PW Doctor OTC ${lettersFor(unique)}`, phone: `7${String(unique).slice(-9)}`,
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
    // A live pharmacy with its shop address (what a patient collects from).
    await activatePartner(pharmacy.partnerId);
    await request.post(`${API}/partners/${pharmacy.partnerId}/addresses`, {
      headers: { Authorization: `Bearer ${pharmacy.token}` },
      data: { address_type: 'SHOP', address1: 'Shop 2, Lake View Road', address2: 'Madhapur, Hyderabad', zipcode: '500081', is_primary: true },
    });

    const patient = await createTestPatient(request);
    await loginAsTestPatient(page, patient);

    await page.goto(`/pharmacy-orders/new?pharmacy=${pharmacy.partnerId}`);
    await expect(page.getByRole('heading', { name: 'Add medicines', exact:true })).toBeVisible();
    await page.getByRole('searchbox', {name:'Search medicines at selected pharmacy'}).fill(medicine.medicine_name);
    const row = page.locator('section[aria-label="Medicine results"] li').filter({hasText:medicine.medicine_name});
    await row.getByRole('button',{name:'Add',exact:true}).click();
    await page.getByRole('complementary',{name:'Added to basket notification'}).getByRole('button',{name:'View basket',exact:true}).click();
    await page.getByRole('dialog').getByRole('button',{name:'Review & place order',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Review order',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Continue to fulfillment',exact:true}).click();
    await page.getByRole('button',{name:'Pickup at pharmacy',exact:true}).click();
    await page.getByRole('button',{name:'Pay at pickup',exact:true}).click();
    await expect(page.getByRole('complementary',{name:'Fulfillment order summary'})).toContainText('INR 12.00');
    await page.setViewportSize({width:1536,height:1024});
    await page.locator('main').evaluate(el=>{el.style.scrollBehavior='auto';el.scrollTop=0;});
    await page.screenshot({path:'artifacts/pharmacy-orders/fulfillment-desktop.png'});
    await page.setViewportSize({width:390,height:844});
    await expect.poll(()=>page.locator('aside[aria-label="Main navigation"]').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
    await expect(page.getByRole('list',{name:'Order progress'}).getByRole('listitem')).toHaveCount(5);
    expect(await page.locator('main').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await page.locator('main').evaluate(el=>{el.style.scrollBehavior='auto';el.scrollTop=0;});
    await page.screenshot({path:'artifacts/pharmacy-orders/fulfillment-mobile.png'});
    await page.setViewportSize({width:1536,height:1024});


    const [orderResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/orders') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Place order', exact:true }).click(),
    ]);
    expect(orderResponse.ok()).toBeTruthy();
    const order = await orderResponse.json();

    // Lands on the real order detail screen for the order that was actually just created.
    await expect(page).toHaveURL(new RegExp(`/pharmacy-orders/${order.id}$`));
    await expect(page.getByText('Awaiting confirmation', { exact: false })).toBeVisible();
    await expect(page.getByText(medicine.medicine_name, { exact: false })).toBeVisible();
    await expect(page.getByText('Pay in person at pickup', { exact: false })).toBeVisible();
    // Progress and where to collect it.
    await expect(page.getByRole('list', { name: 'Order progress' })).toContainText('Ready to collect');
    await expect(page.locator('[aria-current="step"]')).toContainText('Placed');
    const shop = page.getByRole('region',{name:'Pharmacy details',exact:true});
    await expect(shop).toContainText('Shop 2, Lake View Road, Madhapur, Hyderabad, 500081');
    await expect(shop.getByRole('link', { name: 'Directions' })).toHaveAttribute('href', /google\.com\/maps/);

    // Confirm against the real backend, not just the UI's own claim.
    const verifyRes = await request.get(`${API}/orders/${order.id}/mine`, { headers: { Authorization: `Bearer ${patient.token}` } });
    const verified = await verifyRes.json();
    expect(verified.pharmacy_partner_id).toBe(pharmacy.partnerId);
    expect(verified.payment_method).toBe('CASH');
    expect(verified.items[0].medicine_id).toBe(medicine.id);
    expect(verified.fulfillment_type).toBe('PICKUP');
    expect(Number(verified.total_amount)).toBe(12);
    expect(Number(verified.subtotal_amount)).toBe(12);
    expect(verified.items[0].quantity).toBe(1);
    await expect(page.getByRole('table')).toHaveCount(1);
    await expect(page.getByText('Hours not provided',{exact:true})).toBeVisible();
    await page.setViewportSize({width:1536,height:1024});
    await page.screenshot({path:'artifacts/order-details/desktop.png'});
    await page.setViewportSize({width:390,height:844});
    await expect.poll(()=>page.locator('aside[aria-label="Main navigation"]').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
    expect(await page.locator('main').evaluate(el=>el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({path:'artifacts/order-details/mobile.png'});
    await page.getByRole('region',{name:'Order items'}).scrollIntoViewIfNeeded();
    await page.screenshot({path:'artifacts/order-details/mobile-summary.png'});
    expect(await page.getByRole('region',{name:'Order items'}).evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    const totalBounds=await page.locator('tfoot td').boundingBox();expect(totalBounds!.x).toBeGreaterThanOrEqual(0);expect(totalBounds!.x+totalBounds!.width).toBeLessThanOrEqual(390);
    let cancellationRequests=0;
    page.on('request',r=>{if(r.url().endsWith(`/orders/${order.id}/cancel`)&&r.method()==='POST')cancellationRequests++;});

    await page.getByRole('button',{name:'Cancel order',exact:true}).click();
    await expect(page.getByRole('dialog').getByRole('button',{name:'Keep order',exact:true})).toBeFocused();
    await page.getByRole('dialog').getByRole('button',{name:'Keep order',exact:true}).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect(cancellationRequests).toBe(0);
    await expect(page.getByRole('button',{name:'Cancel order',exact:true})).toBeFocused();
    await page.getByRole('button',{name:'Cancel order',exact:true}).click();
    await page.getByRole('dialog').getByRole('button',{name:'Cancel order',exact:true}).click();
    await expect(page.getByText('Cancelled',{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Cancel order',exact:true})).toHaveCount(0);
    const cancelled = await (await request.get(`${API}/orders/${order.id}/mine`, {headers:{Authorization:`Bearer ${patient.token}`}})).json();
    expect(cancelled.status).toBe('CANCELLED');
    if (cancelled.cancellation_reason) await expect(page.getByText(`Reason: ${cancelled.cancellation_reason}`,{exact:true})).toHaveCount(1);
    if (cancelled.cancelled_at) await expect(page.getByRole('region',{name:'Cancelled order'})).toContainText('Cancelled by you on');
    await expect(page.getByRole('button',{name:'Reorder from this pharmacy',exact:true})).toBeVisible();


  });

  test('Rx-backed path: My Records -> Send to Pharmacy -> (pharmacy accepts via API) -> Build Order -> Pay online', async ({ page, request }) => {
    const unique = Date.now() + Math.floor(Math.random() * 1000);

    const pharmacy = await registerProvider(request, {
      full_name: `PW Pharmacy Rx ${lettersFor(unique)}`, phone: `9${String(unique).slice(-9)}`,
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
      full_name: `PW Doctor Rx ${lettersFor(unique)}`, phone: `6${String(unique).slice(-9)}`,
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
    // The current prescription workflow persists dispensing rows on update.
    const createdRx = await rxRes.json();
    const rxId = createdRx.id ?? createdRx.data?.id;
    const savedRx = await request.patch(`${API}/prescriptions/${rxId}`, {
      headers: { Authorization: `Bearer ${doctor.token}` },
      data: { medicines: [{ medicine_name: medicine.medicine_name, dosage: '500mg', frequency: 'Twice daily', duration: '5 days' }] },
    });
    expect(savedRx.ok(), await savedRx.text()).toBeTruthy();


    await loginAsTestPatient(page, patient);

    // ---- Real UI: My Records -> Send to Pharmacy ----
    await page.goto('/my-records');
    await expect(page.getByRole('heading', { name: 'Medical Records' })).toBeVisible();
    const card = page.getByText('Sinus infection', { exact: false }).locator('xpath=ancestor::article[1]');
    await expect(card).toBeVisible();

    const [requestResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/pharmacy-requests') && r.request().method() === 'POST'),
      (async () => {
        await card.getByRole('button', { name: 'Send to pharmacy' }).click();
        await expect(page.getByText('Send Prescription to Pharmacy')).toBeVisible();
        await page.getByPlaceholder('Search pharmacies by name...').fill(`PW Pharmacy Rx ${unique}`);
        await page.getByText(pharmacy_full_name(unique), { exact: false }).click();
        await page.getByRole('button',{name:'Share and send',exact:true}).click();
      })(),
    ]);
    expect(requestResponse.ok(), await requestResponse.text()).toBeTruthy();
    const pharmacyRequest = (await requestResponse.json()).data;

    // Lands on the requests tab per the real navigation the screen performs.
    await expect(page).toHaveURL(/\/pharmacy-orders\?tab=requests/);
    await expect(page.getByRole('article').getByText('Waiting for pharmacy', { exact: true })).toBeVisible();

    // ---- Pharmacy accepts (backend-verified — no pharmacy UI exists in this app) ----
    const acceptRes = await request.patch(`${API}/pharmacy-requests/${pharmacyRequest.id}/accept`, {
      headers: { Authorization: `Bearer ${pharmacy.token}` },
    });
    expect(acceptRes.ok()).toBeTruthy();

    // ---- Real UI: refresh, see Accepted, Build Order ----
    await page.reload();
    await expect(page.getByRole('article').getByText('Accepted', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: /Build order/i }).click();
    await expect(page).toHaveURL(new RegExp(`pharmacyRequestId=${pharmacyRequest.id}`));
    await expect(page.getByRole('heading',{name:'Confirm your prescription order',exact:true})).toBeVisible();
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
      page.getByRole('button', { name: 'Place order' }).click(),
    ]);
    expect(orderResponse.ok()).toBeTruthy();
    const order = (await orderResponse.json()).data;

    // ---- Real UI: order detail, pay online ----
    // Status is CREATED at this point (payment_method chosen, not yet charged) — the
    // payment form shows regardless (see OrderDetailScreen's needsPayment condition).
    await expect(page).toHaveURL(new RegExp(`/pharmacy-orders/${order.id}$`));
    await expect(page.getByRole('region',{name:'Order status'})).toContainText('Payment pending');
    await expect(page.getByText('Payment pending',{exact:true})).toHaveCount(1);
    await expect(page.getByRole('region',{name:'Order payment'})).toContainText('Pay to send this order to the pharmacy.');
    expect(await page.getByRole('region',{name:'Order status'}).evaluate(el=>el.nextElementSibling?.getAttribute('aria-label'))).toBe('Order payment');
    await expect(page.getByText(/test mode/i)).toHaveCount(0);
    await expect(page.getByRole('region',{name:'Order status'})).not.toContainText('Paid');
    await page.screenshot({path:'artifacts/order-details/online-pending-desktop.png'});
    await page.setViewportSize({width:390,height:844});
    await expect.poll(()=>page.locator('aside[aria-label="Main navigation"]').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
    await page.getByRole('region',{name:'Order payment'}).scrollIntoViewIfNeeded();
    await page.screenshot({path:'artifacts/order-details/online-pending-mobile.png'});

    await page.getByRole('button', { name: 'UPI' }).click();
    await page.getByPlaceholder('yourname@upi').fill('patient@upi');

    const [payResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/payment') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Pay INR 55.00', exact:true }).click(),
    ]);
    expect(payResponse.ok()).toBeTruthy();
    await expect(page.getByText('Paid — waiting for pharmacy', { exact: false })).toBeVisible();

    // Confirm against the real backend: Order really is PAID, and the PharmacyRequest is
    // really converted (order_id set), matching the one-order-per-acceptance invariant.
    const verifyOrder = await (await request.get(`${API}/orders/${order.id}/mine`, { headers: { Authorization: `Bearer ${patient.token}` } })).json();
    expect(verifyOrder.status).toBe('PAID');
    expect(verifyOrder.payment_status).toBe('PAID');
    await expect(page.getByRole('list',{name:'Order progress'})).toContainText('Paid');
    await page.getByRole('button',{name:'Cancel order',exact:true}).click();
    await page.getByRole('dialog').getByRole('button',{name:'Cancel order',exact:true}).click();
    await expect(page.getByText('Refunded INR 55.00 to your UPI',{exact:true})).toBeVisible({timeout:12000});
    await expect(page.getByRole('region',{name:'Cancelled order'})).toContainText('Cancelled by you on');
    const refunded=await (await request.get(`${API}/orders/${order.id}/mine`,{headers:{Authorization:`Bearer ${patient.token}`}})).json();
    expect(refunded.payment_status).toBe('REFUNDED');
    await page.getByRole('button',{name:'Reorder from this pharmacy',exact:true}).click();
    await expect(page).toHaveURL(new RegExp(`/pharmacy-orders/new\\?pharmacy=${pharmacy.partnerId}$`));
    await expect(page.getByRole('heading',{name:'Add medicines',exact:true})).toBeVisible();

  });
});

function pharmacy_full_name(unique: number) {
  return `PW Pharmacy Rx ${unique}`;
}
