const path = require('path');
const mysql = require(path.join(__dirname, '../../vizito-replica-backend/vizito-auth/node_modules/mysql2/promise'));

async function listAllTables() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root'
  });

  const [dbs] = await conn.execute('SHOW DATABASES');
  console.log('Databases:', dbs.map(d => Object.values(d)[0]));

  for (const db of ['vizito_auth', 'vizito_booking', 'vizito_catalogue']) {
    try {
      const [tbls] = await conn.execute(`SHOW TABLES FROM ${db}`);
      console.log(`\nTables in ${db}:`, tbls.map(t => Object.values(t)[0]));
    } catch (e) {
      console.log(`Error reading ${db}:`, e.message);
    }
  }

  await conn.end();
}

listAllTables().catch(console.error);
