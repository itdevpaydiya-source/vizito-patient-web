import { test, expect } from '@playwright/test';
import { createTestPatient } from './helpers/testAccount';

// Simultaneous patient sign-ups used to deadlock on the patient code (MAX()+1 inside the sign-up
// transaction) and fail with a 500. Every sign-up must succeed with its own VIZITO-PT code.
test('8 patients signing up at the same moment all succeed with distinct patient codes', async ({ request }) => {
  const patients = await Promise.all(Array.from({ length: 8 }, () => createTestPatient(request)));
  expect(patients.every((p) => p.token)).toBe(true);
  const mysql = await import('../../vizito-replica-backend/vizito-auth/node_modules/mysql2/promise.js');
  const conn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'vizito_auth' });
  const [rows]: any = await conn.query(
    'SELECT pp.patient_code FROM patient_profiles pp JOIN users u ON u.id = pp.user_id WHERE u.phone IN (?)', [patients.map((p: any) => p.mobile)]);
  await conn.end();
  const codes = rows.map((r: any) => r.patient_code);
  expect(codes).toHaveLength(8);
  expect(codes.every((c: string) => /^VIZITO-PT-\d{6,}$/.test(c))).toBe(true);
  expect(new Set(codes).size).toBe(8);
});
