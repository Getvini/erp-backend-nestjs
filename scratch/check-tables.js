const { Client } = require('pg');
require('dotenv').config({ path: 'c:/Users/my/Downloads/ERP/erp-backend-nestjs/.env' });

const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  const tables = ["job_criterias", "tasks", "task_iterations", "violations", "staff_role_workload_norms"];
  for (const t of tables) {
    const res = await client.query(`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${t}' ORDER BY ordinal_position`);
    console.log(`=== TABLE: ${t} ===`);
    console.log(res.rows.map(r => `${r.column_name} (${r.data_type}, nullable: ${r.is_nullable})`).join(', '));
  }
  await client.end();
}).catch(e => console.error(e.message));
