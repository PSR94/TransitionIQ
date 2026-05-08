#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

mkdir -p dist
rm -f dist/transitioniq-complete.zip dist/transitioniq-complete.tar.gz dist/archive_manifest.txt

EXCLUDES=(
  --exclude='./.git'
  --exclude='./.env'
  --exclude='./node_modules'
  --exclude='./*/node_modules'
  --exclude='./*/*/node_modules'
  --exclude='./.venv'
  --exclude='./**/__pycache__'
  --exclude='./.pytest_cache'
  --exclude='./coverage'
  --exclude='./dist'
  --exclude='./artifacts/*/dist'
  --exclude='./Updated Screenshot'
  --exclude='./.cache'
  --exclude='./.local'
  --exclude='./**/*.tsbuildinfo'
  --exclude='./.DS_Store'
  --exclude='./**/.DS_Store'
  --exclude='./*.log'
)

tar "${EXCLUDES[@]}" -czf dist/transitioniq-complete.tar.gz .

if command -v zip >/dev/null 2>&1; then
  zip -qr dist/transitioniq-complete.zip . \
    -x '.git/*' '.env' 'node_modules/*' '*/node_modules/*' '.venv/*' '*/__pycache__/*' \
    '.pytest_cache/*' 'coverage/*' 'dist/*' 'artifacts/*/dist/*' 'Updated Screenshot/*' \
    '.cache/*' '.local/*' '*.tsbuildinfo' '.DS_Store' '*/.DS_Store' '*.log'
else
  echo "zip command not found" >&2
  exit 1
fi

tar -tzf dist/transitioniq-complete.tar.gz | sort > dist/archive_manifest.txt

echo "Created dist/transitioniq-complete.tar.gz"
echo "Created dist/transitioniq-complete.zip"
echo "Wrote dist/archive_manifest.txt"
