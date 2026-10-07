const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_Oativ1kn0EzT@ep-restless-queen-b3gawjvf-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log('--- TABLES CHECK ---');
  const tables = ['acceptance_requests', 'acceptance_request_services', 'contract_services'];
  for (const t of tables) {
    const res = await client.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position;
    `, [t]);
    console.log(`\nTable: ${t} (${res.rows.length} columns)`);
    console.log(res.rows.map(r => `${r.column_name}: ${r.data_type} (${r.udt_name})`).join('\n'));
  }

  // Count rows in acceptance_requests
  const countRes = await client.query(`SELECT count(*) FROM acceptance_requests;`);
  console.log(`\nTotal acceptance_requests: ${countRes.rows[0].count}`);

  const sampleRes = await client.query(`SELECT id, name, status, "projectId", "createdAt" FROM acceptance_requests ORDER BY "createdAt" DESC LIMIT 3;`);
  console.log(`\nSample acceptance_requests:`, sampleRes.rows);

  await client.end();
}

main().catch(console.error);
