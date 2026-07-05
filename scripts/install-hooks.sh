#!/usr/bin/env bash
set -euo pipefail

if [[ ! -d .git ]]; then
  echo "Skipping hook install: .git directory not found"
  exit 0
fi

mkdir -p .git/hooks
cat > .git/hooks/pre-commit <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
npm run security:secrets-scan
HOOK
chmod +x .git/hooks/pre-commit

echo "Installed pre-commit hook for secret scanning"
