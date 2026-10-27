import { test, expect } from '@playwright/test';
import { createTestPatient } from './helpers/testAccount';

// Lab booking receipt PDF, real backend through the gateway: the patient who booked downloads it;
// another patient can't. Uses the demo lab's live availability and cancels the booking afterwards.
const API = 'http://localhost:3000';

const H = (t: string) => ({ Authorization: `Bearer ${t}` });

test('receipt PDF for the booking patient only (UPI paid)', async ({ request }) => {
  const [p, other] = await Promise.all([createTestPatient(request), createTestPatient(request)]);
  const labs=await (await request.get(`${API}/lab-tests/labs?tests=FBS`,{headers:H(p.token)})).json();const lab=labs.find((l:any)=>l.locations?.length);expect(lab).toBeTruthy();const MEDICARE=lab.id,CENTRE=lab.locations[0].id;
  const av = await (await request.get(`${API}/lab-orders/availability?lab_partner_id=${MEDICARE}&location_id=${CENTRE}&visit_type=LAB_VISIT`, { headers: H(p.token) })).json();
  const d = (av.data ?? av).days.find((x: any) => x.slots.some((s: any) => s.available));
  const slot = d.slots.find((s: any) => s.available).time;
  const b = await request.post(`${API}/lab-orders`, { headers: H(p.token), data: { lab_partner_id: MEDICARE, location_id: CENTRE, test_codes: ['FBS'], visit_date: d.date, visit_time: slot, payment_mode: 'UPI', payment: { payment_method: 'UPI', upi_id: 'kavya@okicici' } } });
  expect(b.ok(), await b.text()).toBeTruthy();
  const body=await b.json();const o=body.data??body;
  try {
    const r = await request.get(`${API}/lab-orders/${o.id}/receipt`, { headers: H(p.token) });
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toContain('application/pdf');
    expect(r.headers()['content-disposition']).toContain(`VIZITO-receipt-${o.order_number}.pdf`);
    const pdf = await r.body();
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
    expect((await request.get(`${API}/lab-orders/${o.id}/receipt`, { headers: H(other.token) })).status()).toBe(404);
  } finally {
    await request.post(`${API}/lab-orders/${o.id}/cancel`, { headers: H(p.token), data: { reason: 'Receipt test' } });
  }
});
