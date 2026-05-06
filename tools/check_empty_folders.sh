#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

empty_dirs="$(find . -type d -empty \
  -not -path './.git/*' \
  -not -path './node_modules/*' \
  -not -path './*/node_modules/*' \
  -not -path './dist/*' \
  -not -path './*/dist/*' \
  -not -path './coverage/*' \
  -not -path './artifacts/*/dist/*' \
  -not -path './lib/*/dist/*')"

if [[ -n "$empty_dirs" ]]; then
  echo "Empty project folders found:"
  echo "$empty_dirs"
  exit 1
fi

echo "No placeholder-only or empty project folders found."
