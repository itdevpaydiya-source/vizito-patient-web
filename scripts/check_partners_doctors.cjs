const path = require('path');
const mysql = require(path.join(__dirname, '../../vizito-replica-backend/vizito-auth/node_modules/mysql2/promise'));

async function checkPartnersAndDoctors() {
  const authConn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'vizito_auth' });
  const [partners] = await authConn.execute('SELECT id, name, partner_type, verification_status, status FROM partners LIMIT 10');
  console.log('Auth Partners:', partners);

  const [docProfiles] = await authConn.execute('SELECT id, partner_id, full_name, specialization, experience_years, in_clinic_fee, video_consultation_fee FROM doctor_profiles LIMIT 10');
  console.log('Doctor Profiles:', docProfiles);

  const [branches] = await authConn.execute('SELECT id, partner_id, name, is_active FROM partner_branches LIMIT 10');
  console.log('Partner Branches:', branches);

  const bookConn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'vizito_booking' });
  const [avail] = await bookConn.execute('SELECT id, partner_id, slot_date, start_time, end_time, is_available FROM doctor_availabilities LIMIT 10');
  console.log('Doctor Availabilities:', avail);

  await authConn.end();
  await bookConn.end();
}

checkPartnersAndDoctors().catch(console.error);
