const path = require('path');
const mysql = require(path.join(__dirname, '../../vizito-replica-backend/vizito-auth/node_modules/mysql2/promise'));

async function checkRoles() {
  const authConn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'vizito_auth' });
  const [roles] = await authConn.execute('SELECT * FROM roles');
  console.log('Roles:', roles);
  await authConn.end();
}

checkRoles().catch(console.error);
