import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../.env.test') });

import { FIXTURE_IDS } from '../test/fixtures/fixture-ids';

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: false,
  });

  await ds.initialize();

  for (let i = 0; i < FIXTURE_IDS.JOBS.length; i++) {
    const id = FIXTURE_IDS.JOBS[i];
    const name = `Hạng mục công việc chuẩn #${i + 1}`;
    await ds.query(
      `INSERT INTO jobs (id, name, "costPrice", "unitPrice", "isBriefVideo", "isQuotationItem", "createdAt")
       VALUES ($1, $2, 500000, 1000000, false, true, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [id, name]
    );
  }

  console.log('Seeded jobs successfully!');
  await ds.destroy();
}

main().catch(console.error);
