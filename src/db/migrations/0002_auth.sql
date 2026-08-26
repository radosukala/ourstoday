
-- Better Auth tables (better-auth@1.7.1 shapes) in the auth schema.
CREATE TABLE IF NOT EXISTS auth."user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS auth_user_email_uq ON auth."user" (email);

CREATE TABLE IF NOT EXISTS auth.session (
  id text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  token text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  user_id text NOT NULL REFERENCES auth."user" (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS auth_session_user_idx ON auth.session (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS auth_session_token_uq ON auth.session (token);

CREATE TABLE IF NOT EXISTS auth.account (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES auth."user" (id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_account_user_idx ON auth.account (user_id);

CREATE TABLE IF NOT EXISTS auth.verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_verification_identifier_idx ON auth.verification (identifier);

-- Database-backed Better Auth rate limiting (never process memory).
CREATE TABLE IF NOT EXISTS auth.rate_limit (
  id text PRIMARY KEY,
  key text NOT NULL,
  count bigint NOT NULL,
  last_request bigint NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS auth_rate_limit_key_uq ON auth.rate_limit (key);

