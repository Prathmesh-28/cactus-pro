const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        company_id VARCHAR(50) NOT NULL UNIQUE,
        content TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        company_id VARCHAR(50) NOT NULL,
        original_name VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size INTEGER NOT NULL,
        file_data BYTEA NOT NULL,
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_files_company ON files(company_id);

      -- Key-value store for all finance/app data (replaces localStorage)
      CREATE TABLE IF NOT EXISTS kv_store (
        id SERIAL PRIMARY KEY,
        namespace VARCHAR(100) NOT NULL,  -- e.g. 'finance', 'compliance'
        key VARCHAR(200) NOT NULL,         -- e.g. 'fund_1::fund_metrics'
        value JSONB NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(namespace, key)
      );

      CREATE INDEX IF NOT EXISTS idx_kv_namespace ON kv_store(namespace);

      -- SharePoint sync settings
      CREATE TABLE IF NOT EXISTS sync_sources (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        url TEXT NOT NULL,
        sheet_mappings JSONB NOT NULL DEFAULT '[]',
        last_synced_at TIMESTAMPTZ,
        last_sync_status VARCHAR(20) DEFAULT 'never',
        last_sync_error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Database tables ready');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
