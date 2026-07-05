#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "SUPABASE_DB_URL is required"
  exit 1
fi

for file in $(ls supabase/seed/*.sql | sort); do
  echo "Seeding $file"
  psql "$SUPABASE_DB_URL" -f "$file"
done
