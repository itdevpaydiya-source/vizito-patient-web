const path = require('path');
const mysql = require(path.join(__dirname, '../../vizito-replica-backend/vizito-auth/node_modules/mysql2/promise'));

async function checkCatalogueData() {
  const catConn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'vizito_catalogue'
  });

  const [partners] = await catConn.execute('SELECT id, name, type, is_active FROM partners LIMIT 10');
  console.log('Catalogue Partners:', partners);

  const [facilities] = await catConn.execute('SELECT facility_id, partner_id, name, is_active FROM facilities LIMIT 10');
  console.log('Catalogue Facilities:', facilities);

  const [doctors] = await catConn.execute('SELECT id, full_name, partner_id, is_active FROM doctors LIMIT 10');
  console.log('Catalogue Doctors:', doctors);

  const [slots] = await catConn.execute('SELECT time_slot_id, partner_id, slot_date, start_time, end_time, is_available FROM doctor_time_slots LIMIT 10');
  console.log('Catalogue Slots:', slots);

  await catConn.end();
}

checkCatalogueData().catch(console.error);
