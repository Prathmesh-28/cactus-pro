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
        key TEXT NOT NULL,                  -- e.g. 'fund_1::fund_metrics'
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

      -- ── Auth tables ────────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        email       VARCHAR(255) NOT NULL UNIQUE,
        name        VARCHAR(200) NOT NULL DEFAULT '',
        password_hash TEXT,                          -- NULL until invite accepted
        role        VARCHAR(50)  NOT NULL DEFAULT 'portfolio_team',
        is_active   BOOLEAN      NOT NULL DEFAULT true,
        avatar_url  TEXT,
        invited_by  INTEGER REFERENCES users(id),
        last_login  TIMESTAMPTZ,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token       TEXT NOT NULL UNIQUE,
        expires_at  TIMESTAMPTZ NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token       TEXT NOT NULL UNIQUE,
        type        VARCHAR(20) NOT NULL DEFAULT 'reset', -- 'reset' | 'invite'
        expires_at  TIMESTAMPTZ NOT NULL,
        used_at     TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER REFERENCES users(id),
        user_email  VARCHAR(255),
        action      VARCHAR(100) NOT NULL,
        resource    TEXT,
        ip_address  VARCHAR(60),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user  ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_reset_tokens_token   ON password_reset_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_audit_user           ON audit_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_created        ON audit_log(created_at);
    `);
    // Migrate key column from VARCHAR(200) to TEXT if needed
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='kv_store' AND column_name='key' AND data_type='character varying'
        ) THEN
          ALTER TABLE kv_store ALTER COLUMN key TYPE TEXT;
        END IF;
      END $$;
    `);
    console.log('Database tables ready');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
