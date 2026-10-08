export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS implementation_records (
  id SERIAL PRIMARY KEY,
  pr_url VARCHAR(500) NOT NULL,
  pr_id VARCHAR(50),
  jira_keys VARCHAR(500),
  description TEXT,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS confirmations (
  id SERIAL PRIMARY KEY,
  implementation_record_id INTEGER NOT NULL REFERENCES implementation_records(id) ON DELETE CASCADE,
  confirmed_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  environment VARCHAR(50) DEFAULT 'production',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE confirmations ADD COLUMN IF NOT EXISTS category VARCHAR(50);

CREATE TABLE IF NOT EXISTS jira_tickets (
  jira_key VARCHAR(50) PRIMARY KEY,
  title TEXT NOT NULL,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS status_reverts (
  id SERIAL PRIMARY KEY,
  implementation_record_id INTEGER NOT NULL REFERENCES implementation_records(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  reverted_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  reverted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_status_reverts_record_id ON status_reverts(implementation_record_id);
CREATE INDEX IF NOT EXISTS idx_implementation_records_created_by ON implementation_records(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_implementation_records_created_at ON implementation_records(created_at);
CREATE INDEX IF NOT EXISTS idx_confirmations_record_id ON confirmations(implementation_record_id);
CREATE INDEX IF NOT EXISTS idx_confirmations_confirmed_by ON confirmations(confirmed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_confirmations_confirmed_at ON confirmations(confirmed_at);
`;
