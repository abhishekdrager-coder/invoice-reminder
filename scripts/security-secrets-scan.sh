#!/usr/bin/env bash
set -euo pipefail

patterns='(AKIA[0-9A-Z]{16}|sk_live_[0-9a-zA-Z]{20,}|rk_live_[0-9a-zA-Z]{20,}|ghp_[0-9A-Za-z]{20,}|-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----)'

matches=$(git ls-files | grep -v '^.env' | xargs -r grep -nE "$patterns" || true)

if [[ -n "$matches" ]]; then
  echo "Potential secrets detected:"
  echo "$matches"
  exit 1
fi

echo "Secrets scan passed"
