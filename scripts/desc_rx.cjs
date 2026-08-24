const path = require('path');
const mysql = require(path.join(__dirname, '../../vizito-replica-backend/vizito-auth/node_modules/mysql2/promise'));

async function descRx() {
  const bookConn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'vizito_booking' });
  const [rxCols] = await bookConn.execute('DESCRIBE prescriptions');
  console.log('prescriptions cols:', rxCols.map(c => c.Field));
  const [medCols] = await bookConn.execute('DESCRIBE prescription_medicines');
  console.log('prescription_medicines cols:', medCols.map(c => c.Field));
  await bookConn.end();
}

descRx().catch(console.error);
