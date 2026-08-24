const path = require('path');
const mysql = require(path.join(__dirname, '../../vizito-replica-backend/vizito-auth/node_modules/mysql2/promise'));

async function ensureBookingFixtures() {
  const authConn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'vizito_auth' });
  const bookConn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'vizito_booking' });
  const catConn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'vizito_catalogue' });

  // 1. Ensure active verified doctor partner
  const doctorPartnerId = '11111111-2222-3333-4444-555555555555';
  await authConn.execute(
    `INSERT INTO partners (id, partner_code, user_id, partner_type, business_name, display_name, email, phone, status, verification_status, profile_completed, created_at, updated_at)
     VALUES (?, 'VIZITO-DR-TEST01', 101, 'doctor', 'Dr. Aris Thorne', 'Dr. Aris Thorne', 'dr.thorne@vizito.test', '9888888888', 'Active', 'Verified', 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE status='Active', verification_status='Verified', display_name='Dr. Aris Thorne'`,
    [doctorPartnerId]
  );

  const [existingDoc] = await authConn.execute('SELECT id FROM doctor_profiles WHERE partner_id = ?', [doctorPartnerId]);
  if (existingDoc.length === 0) {
    await authConn.execute(
      `INSERT INTO doctor_profiles (id, partner_id, full_name, primary_specialization, qualification, years_of_experience, in_clinic_fee, video_consultation_fee, created_at, updated_at)
       VALUES (UUID(), ?, 'Dr. Aris Thorne', 'Cardiology', 'MBBS, MD (Cardiology)', 12, 500, 600, NOW(), NOW())`,
      [doctorPartnerId]
    );
  } else {
    await authConn.execute(
      `UPDATE doctor_profiles SET full_name='Dr. Aris Thorne', primary_specialization='Cardiology', in_clinic_fee=500, video_consultation_fee=600 WHERE partner_id=?`,
      [doctorPartnerId]
    );
  }

  // 2. Ensure doctor availability in vizito_booking for today and next 14 days
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);

    const [rows] = await bookConn.execute(
      `SELECT id FROM doctor_availabilities WHERE doctor_id = ? AND start_date = ?`,
      [doctorPartnerId, dateStr]
    );

    if (rows.length === 0) {
      await bookConn.execute(
        `INSERT INTO doctor_availabilities (id, doctor_id, clinic_id, consultation_types, slot_duration, availability_type, selected_days, start_date, end_date, start_time, end_time, is_blocked, created_at, updated_at)
         VALUES (UUID(), ?, 1, 'IN_PERSON,VIDEO', 30, 'SINGLE_DATE', '', ?, ?, '09:00:00', '18:00:00', 0, NOW(), NOW())`,
        [doctorPartnerId, dateStr, dateStr]
      );
    }
  }

  // 3. Ensure Hospital partner and facility
  const hospitalPartnerId = '22222222-3333-4444-5555-666666666666';
  await authConn.execute(
    `INSERT INTO partners (id, partner_code, user_id, partner_type, business_name, display_name, email, phone, status, verification_status, profile_completed, created_at, updated_at)
     VALUES (?, 'VIZITO-HOSP-TEST01', 102, 'hospital', 'Apollo City Hospital', 'Apollo City Hospital', 'apollo@vizito.test', '9777777777', 'Active', 'Verified', 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE status='Active', verification_status='Verified', display_name='Apollo City Hospital'`,
    [hospitalPartnerId]
  );

  console.log('Booking fixtures seeded successfully!');
  await authConn.end();
  await bookConn.end();
  await catConn.end();
}

ensureBookingFixtures().catch(console.error);
