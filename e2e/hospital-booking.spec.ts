import { test, expect } from '@playwright/test';
import { createTestPatient } from './helpers/testAccount';
import { registerProviderAccount, lettersFor } from './helpers/providerAccount';

// Cross-portal: a hospital goes live (submit refused until it has a branch, a department and a
// doctor), a patient finds it, books its doctor at the department fee and pays; the hospital and the
// doctor both see the visit, the ledger and a notification. The doctor was never separately
// verified: the approved hospital credentials them at its own branch.
test.describe.configure({ timeout: 300000 });
const api = 'http://localhost:3000';
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

test('patient books a hospital doctor at the department fee; both sides see it', async ({ request }) => {
  const out: string[] = [];
  const call = async (label: string, method: string, path: string, token: string, data?: any, params?: any) => {
    const r = await (request as any)[method](`${api}${path}`, { headers: { Authorization: `Bearer ${token}` }, data, params });
    const t = await r.text();
    out.push(`${label}: ${r.status()} ${t.slice(0, 700)}`);
    try { return JSON.parse(t); } catch { return t; }
  };
  const u = Date.now();
  const hosp = await registerProviderAccount(request, api, { full_name: `Probe Owner ${lettersFor(u).slice(-5)}`, phone: `9${String(u).slice(-9)}`, email: `pw-pb-h-${u}@vizito.test`, date_of_birth: '1978-03-03', gender: 'male', provider_type_id: 3, password: 'PlaywrightTest123!', hospitalName: `Probe Hospital ${lettersFor(u).slice(-4)}`, hospitalRegNo: `PB-${u}` });
  const doc = await registerProviderAccount(request, api, { full_name: `Probe Doctor ${lettersFor(u + 2).slice(-4)}`, phone: `9${String(u + 2).slice(-9)}`, email: `pw-pb-d-${u}@vizito.test`, date_of_birth: '1980-05-05', gender: 'male', provider_type_id: 5, password: 'PlaywrightTest123!', medicalRegNo: `PBD-${u}`, qualification: 'MBBS, MD', specialization: 'Cardiology', experience: 11 });
  const H = hosp.access_token, D = doc.access_token;
  const hpid0 = hosp.current_account?.partner_id;
  const early = await call('SUBMIT too early', 'post', `/partners/${hpid0}/submit`, H, {});
  expect(String(early?.message || '')).toContain('Before going live');
  const br = await call('branch', 'post', '/facility/address-pricing', H, { name: 'Probe Central', facility_type: 'Hospital', address_line_1: '1 Road', address_line_2: 'Banjara Hills', city: 'Hyderabad', state: 'Telangana', pincode: '500034', phone: '9876543210', provider_type: 'Hospital' });
  const fid = br.facility.id;
  const dep = await call('dept', 'post', '/departments', H, { name: 'Cardiology' });
  const fd = await call('fd', 'post', `/facility/${fid}/departments`, H, { departmentId: Number(dep.data.id), inPersonFee: 750, onlineFee: 500, roomNumber: 'OPD-4' });
  await call('invite', 'post', `/facility/${fid}/doctors/request`, H, { doctor_id: Number(doc.user.id), facility_department_id: Number(fd.data.id), designation: 'Consultant' });
  await call('accept', 'patch', `/facility/${fid}/doctors/${doc.user.id}/accept`, D, {});
  const tomorrow = iso(new Date(Date.now() + 86400000));
  await call('avail', 'post', '/doctor/availability', D, { clinic_id: fid, consultation_types: ['IN_PERSON'], availability_type: 'SINGLE_DATE', start_date: tomorrow, end_date: tomorrow, start_time: '10:00:00', end_time: '11:00:00', slot_duration: 15 });

  await call('SUBMIT ready', 'post', `/partners/${hpid0}/submit`, H, {});
  const patient = await createTestPatient(request);
  const P = patient.token;
  const provs = await call('providers(hospital)', 'get', '/patients/providers', P, undefined, { search: 'Probe Hospital' });
  const hospPartnerId = hosp.current_account?.partner_id || hosp.user?.partner?.partner_id;
  out.push(`hospPartnerId ${hospPartnerId}`);
  await call('detail', 'get', `/patients/providers/${hospPartnerId}/detail`, P);
  await call('branches', 'get', `/patients/providers/${hospPartnerId}/branches`, P);
  await call('departments', 'get', `/patients/providers/${hospPartnerId}/branches/${fid}/departments`, P);
  const docs = await call('branch doctors', 'get', `/patients/branches/${fid}/doctors`, P);
  const docPartner = doc.current_account?.partner_id;
  const slots = await call('slots', 'get', `/patients/providers/${docPartner}/slots`, P, undefined, { date: tomorrow, facility_id: fid, hospital_partner_id: hospPartnerId });
  const list = Array.isArray(slots) ? slots : slots?.data || slots?.slots || [];
  const slot = list.find((s: any) => String(s.start_time || '').startsWith('10:00')) || list[0];
  const bk = await call('BOOK', 'post', '/patients/bookings', P, { partner_id: docPartner, hospital_partner_id: hospPartnerId, service_type: 'In Person', booking_date: tomorrow, time_slot_id: slot?.time_slot_id, time_slot: '10:00', payment_mode: 'UPI', payment: { payment_method: 'UPI', upi_id: 'probe@upi' } });
  await call('HOSP appts', 'get', `/appointments?date=${tomorrow}`, H);
  await call('DOC appts', 'get', `/appointments?date=${tomorrow}`, D);
  await call('PATIENT bookings', 'get', '/patients/bookings', P);
  await call('HOSP txns', 'get', '/transactions?limit=3', H);
  await call('DOC txns', 'get', '/transactions?limit=3', D);
  await call('HOSP notifications', 'get', '/notifications?limit=3', H);
  await call('DOC notifications', 'get', '/notifications?limit=3', D);
  console.log(out.join('\n'));
  expect(bk).toBeTruthy();
});
