import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.test") });

import { DataSource } from "typeorm";
import { Client } from "pg";
import { IdentityFixture } from "../test/fixtures/identity.fixture";
import { CrmFixture } from "../test/fixtures/crm.fixture";
import { FinanceFixture } from "../test/fixtures/finance.fixture";
import { ProjectFixture } from "../test/fixtures/project.fixture";

async function runMasterSeed() {
  console.log("==================================================================");
  console.log("🚀 BẮT ĐẦU MASTER SEED DỮ LIỆU ĐA TẦNG CHO DATABASE TEST (erp_test)");
  console.log("==================================================================");

  // 1. Reset Schema Public sạch 100%
  console.log("1. Đang làm sạch schema public của erp_test...");
  const rawClient = new Client({ connectionString: process.env.DATABASE_URL });
  await rawClient.connect();
  await rawClient.query(`
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO postgres;
    GRANT ALL ON SCHEMA public TO public;
  `);
  await rawClient.end();
  console.log("-> Schema public đã được reset hoàn toàn sạch!");

  // 2. Khởi tạo TypeORM DataSource & đồng bộ schema
  console.log("2. Đồng bộ schema từ TypeORM entities...");
  const dataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === "true",
    entities: [path.resolve(__dirname, "../src/**/*.entity.ts")],
    synchronize: true,
  });

  await dataSource.initialize();
  console.log("-> Đã khởi tạo schema bảng thành công!");

  try {
    // 3. Chạy tuần tự các Domain Fixtures
    console.log("\n--- Bắt đầu nạp các Domain Fixtures ---");
    console.log("[1/4] Seeding Identity & RBAC Domain...");
    await IdentityFixture.seed(dataSource);

    console.log("[2/4] Seeding CRM Domain (Customers, Vendors, Services, Opportunities, Quotations)...");
    await CrmFixture.seed(dataSource);

    console.log("[3/4] Seeding Finance Domain (Contracts, Milestones, Debts)...");
    await FinanceFixture.seed(dataSource);

    console.log("[4/4] Seeding Project Domain (Projects, Teams, Tasks, Acceptance, QC)...");
    await ProjectFixture.seed(dataSource);

    console.log("\n==================================================================");
    console.log("🎉 HOÀN TẤT SEED TOÀN BỘ DỮ LIỆU TEST (>350 RECORDS) THÀNH CÔNG!");
    console.log("==================================================================");

    // 4. Kiểm kê tổng số bản ghi
    const tablesRes = await dataSource.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
    );
    let totalRows = 0;
    console.log("Thống kê dữ liệu đã nạp:");
    for (const r of tablesRes) {
      const c = await dataSource.query(`SELECT count(*) FROM "${r.table_name}"`);
      const count = parseInt(c[0].count, 10);
      if (count > 0) {
        totalRows += count;
        console.log(`- ${r.table_name}: ${count} rows`);
      }
    }
    console.log(`\n=> TỔNG CỘNG: ${totalRows} BẢN GHI ĐƯỢC SEED TRÊN ${tablesRes.length} BẢNG!`);
  } catch (err: any) {
    console.error("❌ Lỗi khi seed dữ liệu:", err.message);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runMasterSeed();
