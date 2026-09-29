#!/usr/bin/env bash
# Runs the app against the local Supabase stack (`npx supabase start`).
# Shell variables take precedence over .env.local, so production values
# there are ignored for this process.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

status="$(npx --no-install supabase status -o env 2>/dev/null)" || {
  echo "Supabase local não está rodando. Rode: npx supabase start" >&2
  exit 1
}
value() { grep "^$1=" <<<"$status" | head -1 | cut -d= -f2- | tr -d '"'; }

export NEXT_PUBLIC_SUPABASE_URL="$(value API_URL)"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$(value PUBLISHABLE_KEY)"
export SUPABASE_SERVICE_ROLE_KEY="$(value SECRET_KEY)"
export NEXT_PUBLIC_SITE_URL="http://localhost:${PORT:-3000}"

echo "Usando Supabase local em $NEXT_PUBLIC_SUPABASE_URL (e-mails: $(value MAILPIT_URL))"
exec npx --no-install next dev -p "${PORT:-3000}" "$@"
