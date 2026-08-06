#!/usr/bin/env bash
# Copy any src/data/*.example.ts to its real .ts name so the app can build.
# Safe: only creates real files if they don't already exist.
set -e
cd "$(dirname "$0")/.."
for f in src/data/*.example.ts; do
  target="${f%.example.ts}.ts"
  if [ ! -f "$target" ]; then
    cp "$f" "$target"
    echo "Created $target"
  else
    echo "Skipped $target (already exists)"
  fi
done
