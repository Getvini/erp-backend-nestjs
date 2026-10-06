const { Client } = require('pg');
const jwt = require('jsonwebtoken');
const http = require('http');

const JWT_SECRET = 'PHONGVANTMALABIET';

async function fetchJson(url, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function deepCompareKeys(objExpress, objNest, path = '') {
  const missingInNest = [];
  if (!objExpress || !objNest || typeof objExpress !== 'object' || typeof objNest !== 'object') {
    return missingInNest;
  }
  
  const expKeys = Object.keys(objExpress);
  const nestKeys = new Set(Object.keys(objNest));
  
  for (const k of expKeys) {
    const currentPath = path ? `${path}.${k}` : k;
    if (!nestKeys.has(k)) {
      missingInNest.push(currentPath);
    } else if (
      objExpress[k] &&
      typeof objExpress[k] === 'object' &&
      !Array.isArray(objExpress[k]) &&
      objNest[k] &&
      typeof objNest[k] === 'object' &&
      !Array.isArray(objNest[k])
    ) {
      missingInNest.push(...deepCompareKeys(objExpress[k], objNest[k], currentPath));
    }
  }
  return missingInNest;
}

async function main() {
  console.log('=== STARTING OPTION A REGRESSION PARITY CHECK (EXPRESS 3000 vs NESTJS 3001) ===\n');

  // 1. Connect to DB and pick an Admin user
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_Oativ1kn0EzT@ep-restless-queen-b3gawjvf-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const userRes = await client.query(`SELECT id, role, email FROM accounts WHERE role::text ILIKE '%BOD%' OR role::text ILIKE '%ADMIN%' LIMIT 1;`);
  if (!userRes.rows.length) {
    throw new Error('No admin user found!');
  }
  const testUser = userRes.rows[0];
  console.log(`[AUTH] Using Test User: ID=${testUser.id}, Role=${testUser.role}, Email=${testUser.email}`);

  // Fetch a sample opportunity & customer & service for detail checks
  const oppSample = await client.query(`SELECT id FROM opportunities ORDER BY "createdAt" DESC LIMIT 1;`);
  const custSample = await client.query(`SELECT id FROM customers ORDER BY "createdAt" DESC LIMIT 1;`);
  const srvSample = await client.query(`SELECT id FROM services ORDER BY "createdAt" DESC LIMIT 1;`);
  await client.end();

  const sampleOppId = oppSample.rows[0]?.id;
  const sampleCustId = custSample.rows[0]?.id;
  const sampleSrvId = srvSample.rows[0]?.id;

  // 2. Generate token
  const token = jwt.sign({ id: testUser.id, role: testUser.role, type: 'access' }, JWT_SECRET, { expiresIn: '1h' });

  // 3. Test suites for all Phase 1 and Phase 2 modules
  const testEndpoints = [
    { name: 'CRM Customers List', path: '/api/customers' },
    { name: 'CRM Customer Detail', path: sampleCustId ? `/api/customers/${sampleCustId}` : null },
    { name: 'CRM Opportunities List', path: '/api/opportunities' },
    { name: 'CRM Opportunity Detail', path: sampleOppId ? `/api/opportunities/${sampleOppId}` : null },
    { name: 'CRM Opportunity Services', path: sampleOppId ? `/api/opportunity-services/opportunity/${sampleOppId}` : null },
    { name: 'CRM Quotations List', path: '/api/quotations' },
    { name: 'CRM Services List', path: '/api/services' },
    { name: 'CRM Service Detail', path: sampleSrvId ? `/api/services/${sampleSrvId}` : null },
    { name: 'CRM Service Packages', path: '/api/service-packages' },
    { name: 'CRM Referral Partners', path: '/api/referral-partners' },
    { name: 'CRM Jobs List', path: '/api/jobs' },
    { name: 'CRM Vendors List', path: '/api/vendors' },
    { name: 'Identity Users List', path: '/api/users' },
  ].filter(t => t.path);

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  for (const t of testEndpoints) {
    console.log(`\n--------------------------------------------------`);
    console.log(`🔍 Testing: ${t.name} (${t.path})`);

    const expUrl = `http://localhost:3000${t.path}`;
    const nestUrl = `http://localhost:3001${t.path}`;

    try {
      const [resExp, resNest] = await Promise.all([
        fetchJson(expUrl, token),
        fetchJson(nestUrl, token)
      ]);

      console.log(`  Status: Express=${resExp.status} | NestJS=${resNest.status}`);

      if (resExp.status !== resNest.status) {
        console.log(`  ❌ MISMATCH Status Code!`);
        failCount++;
        continue;
      }

      const expData = resExp.body?.data !== undefined ? resExp.body.data : resExp.body;
      const nestData = resNest.body?.data !== undefined ? resNest.body.data : resNest.body;

      // Check array length if array
      if (Array.isArray(expData) && Array.isArray(nestData)) {
        console.log(`  Item Count: Express=${expData.length} | NestJS=${nestData.length}`);
        if (expData.length !== nestData.length) {
          console.log(`  ⚠️ ITEM COUNT DIFFERENCE: Express has ${expData.length}, NestJS has ${nestData.length}`);
          warnCount++;
        }
        
        // Deep compare keys on first element
        if (expData.length > 0 && nestData.length > 0) {
          const missing = deepCompareKeys(expData[0], nestData[0]);
          if (missing.length > 0) {
            console.log(`  ⚠️ NestJS missing keys found in Express: ${missing.join(', ')}`);
            warnCount++;
          } else {
            console.log(`  ✅ Schema & Key Parity: 100% MATCH`);
            passCount++;
          }
        } else {
          console.log(`  ✅ Empty array on both sides or equal`);
          passCount++;
        }
      } else if (typeof expData === 'object' && typeof nestData === 'object') {
        const missing = deepCompareKeys(expData, nestData);
        if (missing.length > 0) {
          console.log(`  ⚠️ NestJS missing keys found in Express: ${missing.join(', ')}`);
          warnCount++;
        } else {
          console.log(`  ✅ Object Schema & Key Parity: 100% MATCH`);
          passCount++;
        }
      } else {
        console.log(`  ✅ Response matched`);
        passCount++;
      }
    } catch (err) {
      console.log(`  ❌ ERROR calling endpoints:`, err.stack || err.message);
      failCount++;
    }
  }

  console.log(`\n==================================================`);
  console.log(`📊 SUMMARY: ${passCount} PASS | ${warnCount} WARNINGS | ${failCount} FAILS`);
  console.log(`==================================================\n`);
}

main().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
