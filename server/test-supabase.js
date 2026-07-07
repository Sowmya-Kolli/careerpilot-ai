const { Client } = require('pg');

async function testConnection(label, connectionString) {
  console.log(`[Test] Attempting connection for: ${label}...`);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log(`[Test] SUCCESS: connected to Supabase Postgres using ${label}!`);
    const res = await client.query('SELECT NOW()');
    console.log('[Test] Database Time:', res.rows[0].now);
    await client.end();
    return true;
  } catch (error) {
    console.error(`[Test] FAILED with ${label}:`, error.message);
    if (error.code) console.error(`[Test] Error Code: ${error.code}`);
    try { await client.end(); } catch(e) {}
    return false;
  }
}

async function run() {
  const host = 'db.ypneqjxaifgeexbbcgae.supabase.co';
  
  // Test 1: Password is CareerPilotAI18 (brackets stripped)
  const url1 = 'postgresql://postgres:CareerPilotAI18@db.ypneqjxaifgeexbbcgae.supabase.co:5432/postgres';
  
  // Test 2: Password is [CareerPilotAI18] (properly URL-encoded)
  const url2 = 'postgresql://postgres:%5BCareerPilotAI18%5D@db.ypneqjxaifgeexbbcgae.supabase.co:5432/postgres';
  
  // Test 3: Password is [CareerPilotAI18] (raw - which might fail URL parser)
  const url3 = 'postgresql://postgres:[CareerPilotAI18]@db.ypneqjxaifgeexbbcgae.supabase.co:5432/postgres';

  const success1 = await testConnection('Password without brackets ("CareerPilotAI18")', url1);
  if (!success1) {
    const success2 = await testConnection('Password with URL-encoded brackets ("%5BCareerPilotAI18%5D")', url2);
    if (!success2) {
      await testConnection('Password with raw brackets ("[CareerPilotAI18]")', url3);
    }
  }
}

run();
