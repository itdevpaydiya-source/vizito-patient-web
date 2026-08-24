import type { APIRequestContext } from '@playwright/test';

export interface TestDoctor {
  fullName: string;
  partnerId: string;
  numericId: number;
  token: string;
  facilityId: number;
  consultationFee: number;
}

// Activates a freshly-registered partner directly via the database — bypassing the admin-approval
// gate, which is unrelated to what's under test here (the booking/payment flow, not the approval
// workflow). This mirrors the identical DB shortcut already used throughout this project's
// scratchpad live-test scripts this session, not a new pattern.
async function activatePartner(partnerId: string): Promise<void> {
  const mysql = await import('file:///c:/Users/battu/Downloads/Vizito-latest3/Vizito-latest3/vizito-replica-backend/vizito-auth/node_modules/mysql2/promise.js');
  const conn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'vizito_auth' });
  await conn.execute("UPDATE partners SET status = 'Active' WHERE id = ?", [partnerId]);
  await conn.end();
}

// Registers a real doctor with a real clinic and real availability tomorrow — everything the
// booking flow actually needs to show a genuinely bookable slot, built the same way this
// session's backend live-test scripts have throughout (register -> activate -> add clinic ->
// add availability), just wrapped for reuse from a Playwright spec via the `request` fixture.
export async function createTestDoctorWithAvailability(request: APIRequestContext): Promise<TestDoctor> {
  const unique = Date.now() + Math.floor(Math.random() * 1000);
  const fullName = `PW Booking Test Doctor ${unique}`;
  const consultationFee = 650;

  const regRes = await request.post('http://localhost:3000/auth/register', {
    data: {
      full_name: fullName,
      phone: `9${String(unique).slice(-9)}`,
      email: `pw-booking-doc-${unique}@vizito.test`,
      date_of_birth: '1990-01-01',
      gender: 'male',
      provider_type_id: 5, // doctor
      password: 'PlaywrightTest123!',
      medicalRegNo: `PW-BOOK-${unique}`,
      qualification: 'MBBS',
      specialization: 'General Medicine',
      experience: 6,
    },
  });
  if (!regRes.ok()) throw new Error(`doctor register failed: ${regRes.status()} ${await regRes.text()}`);
  const reg = await regRes.json();
  const token = reg.access_token;
  const partnerId = reg.current_account.partner_id;
  const numericId = reg.user.id;

  await activatePartner(partnerId);

  const clinicRes = await request.post('http://localhost:3000/partners/clinics/me', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      branch_name: `PW Booking Test Clinic ${unique}`,
      address_line: '1 Playwright St',
      city: 'Testville',
      pincode: '500001',
      consultation_type: 'IN_PERSON',
      consultation_fee: consultationFee,
    },
  });
  if (!clinicRes.ok()) throw new Error(`clinic create failed: ${clinicRes.status()} ${await clinicRes.text()}`);

  const facilitiesRes = await request.get(`http://localhost:3000/facility/doctor/${numericId}/facilities`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!facilitiesRes.ok()) throw new Error(`facilities lookup failed: ${facilitiesRes.status()} ${await facilitiesRes.text()}`);
  const facilitiesBody = await facilitiesRes.json();
  const facilityRows = Array.isArray(facilitiesBody) ? facilitiesBody : (facilitiesBody.data ?? []);
  const facilityId = facilityRows[0]?.facility_id ?? facilityRows[0]?.facility?.id;
  if (!facilityId) throw new Error('Could not resolve created facility id');

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const availRes = await request.post('http://localhost:3000/doctor/availability', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      clinic_id: facilityId,
      consultation_types: ['IN_PERSON'],
      availability_type: 'SINGLE_DATE',
      start_date: tomorrow,
      end_date: tomorrow,
      start_time: '09:00:00',
      end_time: '11:00:00',
      slot_duration: 15,
    },
  });
  if (!availRes.ok()) throw new Error(`availability create failed: ${availRes.status()} ${await availRes.text()}`);

  return { fullName, partnerId, numericId, token, facilityId, consultationFee };
}
