const { Client } = require('pg');

async function createTestDb() {
  const client = new Client({
    connectionString: 'postgresql://postgres:root@localhost:5432/postgres'
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL server.');
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname='erp_test'");
    if (res.rows.length === 0) {
      await client.query('CREATE DATABASE erp_test');
      console.log('Created database erp_test successfully!');
    } else {
      console.log('Database erp_test already exists.');
    }
  } catch (err) {
    console.error('Error creating database:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTestDb();
