const path = require('path');
const mysql = require(path.join(__dirname, '../../vizito-replica-backend/vizito-auth/node_modules/mysql2/promise'));

async function descBranches() {
  const authConn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'vizito_auth' });
  const [cols] = await authConn.execute('DESCRIBE partner_branches');
  console.log('partner_branches cols:', cols.map(c => c.Field));
  await authConn.end();
}

descBranches().catch(console.error);
