-- Auth schema generated from the installed Better Auth version.
CREATE TABLE IF NOT EXISTS "fitness_user" (
  id TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL,
  "image" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS "fitness_session" (
  id TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "fitness_user"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "fitness_session_userId_idx" ON "fitness_session"("userId");
CREATE TABLE IF NOT EXISTS "fitness_account" (
  id TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "fitness_user"("id") ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  "scope" TEXT,
  "password" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS "fitness_account_userId_idx" ON "fitness_account"("userId");
CREATE TABLE IF NOT EXISTS "fitness_verification" (
  id TEXT PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS "fitness_verification_identifier_idx" ON "fitness_verification"("identifier");
CREATE TABLE IF NOT EXISTS "fitness_rate_limit" (
  id TEXT PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "count" INTEGER NOT NULL,
  "lastRequest" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS fitness_progress (
 user_id TEXT PRIMARY KEY REFERENCES fitness_user(id) ON DELETE CASCADE,
 data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE TABLE IF NOT EXISTS fitness_whoop (
 user_id TEXT PRIMARY KEY REFERENCES fitness_user(id) ON DELETE CASCADE,
 tokens TEXT NOT NULL, snapshot TEXT, synced_at TEXT, lock_until BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS fitness_oauth_state (
 state TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES fitness_user(id) ON DELETE CASCADE,
 nonce TEXT NOT NULL, expires BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS fitness_oauth_expiry ON fitness_oauth_state(expires);
