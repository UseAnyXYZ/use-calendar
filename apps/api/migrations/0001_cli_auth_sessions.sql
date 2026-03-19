CREATE TABLE cli_auth_sessions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  token_value TEXT,
  user_id TEXT REFERENCES users(id),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX cli_auth_sessions_code_idx ON cli_auth_sessions(code);
