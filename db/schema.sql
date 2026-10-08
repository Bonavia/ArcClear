-- Additive, idempotent schema isolated from existing database tables.
CREATE SCHEMA IF NOT EXISTS arcclear;
CREATE TABLE IF NOT EXISTS arcclear.workspaces (
  owner_address text PRIMARY KEY,
  data jsonb NOT NULL,
  revision bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS arcclear.challenges (
  nonce text PRIMARY KEY,
  address text NOT NULL,
  message text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS arcclear.sessions (
  token_hash text PRIMARY KEY,
  address text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON arcclear.sessions(expires_at);
CREATE INDEX IF NOT EXISTS challenges_expiry ON arcclear.challenges(expires_at);
