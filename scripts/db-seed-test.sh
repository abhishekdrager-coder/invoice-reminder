#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "SUPABASE_DB_URL is required"
  exit 1
fi

psql "$SUPABASE_DB_URL" -f supabase/seed/202607050002_test_seed.sql
