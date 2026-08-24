const path = require('path');
const mysql = require(path.join(__dirname, '../../vizito-replica-backend/vizito-auth/node_modules/mysql2/promise'));

async function descNotifs() {
  const bookConn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'vizito_booking' });
  const [cols] = await bookConn.execute('DESCRIBE notifications');
  console.log('notifications cols:', cols.map(c => c.Field));
  await bookConn.end();
}

descNotifs().catch(console.error);
