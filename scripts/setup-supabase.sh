#!/usr/bin/env bash
# One-shot backend setup against the family's own Supabase project.
# Required env: SUPABASE_DB_URL (postgres connection string), SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN
# Optional env: GEMINI_API_KEY and/or ANTHROPIC_API_KEY, VERIFY_PROVIDER (gemini|anthropic)
set -euo pipefail
: "${SUPABASE_DB_URL:?set SUPABASE_DB_URL}"
: "${SUPABASE_PROJECT_REF:?set SUPABASE_PROJECT_REF}"
: "${SUPABASE_ACCESS_TOKEN:?set SUPABASE_ACCESS_TOKEN}"

echo "== applying migrations"
for f in supabase/migrations/*.sql; do
  echo "-- $f"
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo "== deploying edge function verify-proof"
npx --yes supabase@latest functions deploy verify-proof --project-ref "$SUPABASE_PROJECT_REF"

secrets=()
[ -n "${GEMINI_API_KEY:-}" ] && secrets+=("GEMINI_API_KEY=$GEMINI_API_KEY")
[ -n "${ANTHROPIC_API_KEY:-}" ] && secrets+=("ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY")
[ -n "${VERIFY_PROVIDER:-}" ] && secrets+=("VERIFY_PROVIDER=$VERIFY_PROVIDER")
if [ ${#secrets[@]} -gt 0 ]; then
  echo "== setting function secrets"
  npx --yes supabase@latest secrets set "${secrets[@]}" --project-ref "$SUPABASE_PROJECT_REF"
fi
echo "== done. Put VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env and rebuild."
