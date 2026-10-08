import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.test") });

import { DataSource } from "typeorm";

async function syncTestDatabase() {
  console.log("Connecting to:", process.env.DATABASE_URL);
  const dataSource = new DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === "true",
    entities: [path.resolve(__dirname, "../src/**/*.entity.ts")],
    synchronize: true, // Đồng bộ schema vào erp_test
  });

  try {
    await dataSource.initialize();
    console.log("Connected to erp_test!");
    console.log("Synchronizing schema...");
    await dataSource.synchronize(false);
    console.log("Schema synchronized successfully to erp_test!");
  } catch (err: any) {
    console.error("Sync error:", err.message);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

syncTestDatabase();
