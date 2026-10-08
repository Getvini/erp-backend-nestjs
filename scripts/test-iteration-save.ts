import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../.env.test') });

import { TaskIterations } from '../src/modules/project/task/entities/task-iteration.entity';
import { FIXTURE_IDS } from '../test/fixtures/fixture-ids';

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: false,
    entities: [TaskIterations],
    logging: true,
  });

  await ds.initialize();

  const repo = ds.getRepository(TaskIterations);
  const it = repo.create({
    taskId: FIXTURE_IDS.TASKS[0],
    version: 1,
    submittedResult: 'Test result',
  });

  try {
    await repo.save(it);
    console.log('Save SUCCESS:', it);
  } catch (e: any) {
    console.error('Save FAILED:', e.message);
  }

  await ds.destroy();
}

main().catch(console.error);
