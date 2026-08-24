const path = require('path');
const mysql = require(path.join(__dirname, '../../vizito-replica-backend/vizito-auth/node_modules/mysql2/promise'));

async function checkBranchId() {
  const authConn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'vizito_auth' });
  const [rows] = await authConn.execute('SELECT id, partner_id, branch_name FROM partner_branches LIMIT 5');
  console.log('partner_branches rows:', rows);
  await authConn.end();
}

checkBranchId().catch(console.error);
