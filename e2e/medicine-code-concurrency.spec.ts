import { test, expect } from '@playwright/test';
import { standardCategoryResponse } from './helpers/catalog';
import { registerProviderAccount, lettersFor } from './helpers/providerAccount';

const API = 'http://localhost:3000';

// Medicine codes (MED…) are generated read-max-then-insert; concurrent creates must still all
// succeed with distinct codes, while a genuinely duplicate medicine still gets a conflict.
test('concurrent medicine creates all succeed with unique codes; same-identity duplicates still conflict', async ({ request }) => {
  const unique = Date.now() + Math.floor(Math.random() * 1000);
  const doctor = await registerProviderAccount(request, API, {
    full_name: `PW Code Doctor ${lettersFor(unique)}`, phone: `7${String(unique).slice(-9)}`,
    email: `pw-code-doc-${unique}@vizito.test`, date_of_birth: '1990-01-01', gender: 'male',
    provider_type_id: 5, password: 'PlaywrightTest123!',
    medicalRegNo: `PW-CODE-${unique}`, qualification: 'MBBS', specialization: 'General Medicine', experience: 4,
  });
  const H = { Authorization: `Bearer ${doctor.access_token}` };
  const category = await (await standardCategoryResponse(request)).json();
  const make = (name: string) => request.post(`${API}/medicines`, { headers: H, data: {
    medicine_name: name, generic_name: 'Test generic', strength: '100', dosage_form: 'Tablet', category_id: category.id, mrp: 10, requires_prescription: false } });

  const results = await Promise.all(Array.from({ length: 12 }, (_, i) => make(`PW Code Med ${unique} ${i}`)));
  const bodies = await Promise.all(results.map(async r => ({ status: r.status(), body: await r.json() })));
  console.log('STATUSES', bodies.map(b => b.status).join(','));
  for (const b of bodies) expect(b.status, JSON.stringify(b.body)).toBe(201);
  const codes = bodies.map(b => (b.body.data ?? b.body).code);
  expect(new Set(codes).size).toBe(12);
  for (const c of codes) expect(c).toMatch(/^MED\d{3,}$/);
  console.log('CODES', codes.join(','));

  const same = await Promise.all(Array.from({ length: 4 }, () => make(`PW Code Same ${unique}`)));
  const statuses = same.map(r => r.status()).sort();
  expect(statuses.filter(s => s === 201)).toHaveLength(1);
  expect(statuses.filter(s => s === 409)).toHaveLength(3);
  console.log('SAME', statuses.join(','));
});
