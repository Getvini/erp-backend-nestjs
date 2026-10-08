import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Đảm bảo .env.test được load sớm nhất
dotenv.config({ path: resolve(__dirname, '../../.env.test') });

import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DbAssert } from './db-assert';

export interface TestAppContext {
  app: INestApplication;
  moduleFixture: TestingModule;
  dataSource: DataSource;
  dbAssert: DbAssert;
}

/**
 * Khởi tạo Test App Context dùng chung cho E2E / Integration Controller Tests
 */
export async function createTestAppContext(): Promise<TestAppContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  await app.init();

  const dataSource = app.get(DataSource);
  const dbAssert = new DbAssert(dataSource);

  return {
    app,
    moduleFixture,
    dataSource,
    dbAssert,
  };
}
