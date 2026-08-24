const path = require('path');
const mysql = require(path.join(__dirname, '../../vizito-replica-backend/vizito-auth/node_modules/mysql2/promise'));

async function descTables() {
  const authConn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'vizito_auth' });
  const [pCols] = await authConn.execute('DESCRIBE partners');
  console.log('partners cols:', pCols.map(c => c.Field));

  const [partners] = await authConn.execute('SELECT * FROM partners LIMIT 5');
  console.log('partners rows:', partners);

  const bookConn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'vizito_booking' });
  const [aCols] = await bookConn.execute('DESCRIBE doctor_availabilities');
  console.log('doctor_availabilities cols:', aCols.map(c => c.Field));

  const [availRows] = await bookConn.execute('SELECT * FROM doctor_availabilities LIMIT 5');
  console.log('doctor_availabilities rows:', availRows);

  await authConn.end();
  await bookConn.end();
}

descTables().catch(console.error);
