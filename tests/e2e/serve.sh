
#!/usr/bin/env bash
# Boots a THROWAWAY e2e server against a disposable database with canonical
# writes OPEN, so the full entry ritual is exercised end to end.
set -euo pipefail
cd "$(dirname "$0")/../.."

export DIRECT_DATABASE_URL="postgresql://127.0.0.1:5432/postgres"
E2E_DB="ours_e2e_$(date +%s)_$$"
export E2E_DB
echo "$E2E_DB" > /tmp/ours_e2e_db_name

export DATABASE_URL="postgresql://127.0.0.1:5432/$E2E_DB"
export APP_ENV=local
export EMAIL_DELIVERY_MODE=capture
export ALLOW_CANONICAL_WRITES=true
export BETTER_AUTH_SECRET="e2e-better-auth-secret-0123456789abcdef012345"
export BETTER_AUTH_URL="http://127.0.0.1:3100"
export NEXT_PUBLIC_APP_URL="http://127.0.0.1:3100"
export RELAY_SIGNING_SECRET="1:e2e-relay-signing-secret-0123456789abcdef012345"

pnpm exec tsx scripts/db/e2e-provision.ts

rm -rf .email-capture

# Build before serving. `next start` silently serves whatever .next happens to
# hold, so without this the suite can pass or fail against code nobody wrote in
# this session - which is exactly how a phantom failure was chased once already.
pnpm exec next build >/dev/null

exec pnpm exec next start -p 3100

