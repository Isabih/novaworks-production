#!/usr/bin/env bash
set -euo pipefail

echo "===== NOVAWORKS FINAL CHECK ====="
echo "Node: $(node -v)"
echo "NPM:  $(npm -v)"

for f in \
  mysql/migrations/2026-08-23-property-owner-customer-workflow.sql \
  src/lib/mysql.server.ts \
  src/lib/bookings.functions.ts \
  src/lib/reports.functions.ts \
  src/lib/service-requests.functions.ts \
  src/lib/units.functions.ts \
  src/components/dashboard/nav-config.ts \
  src/components/site/GuidedTour.tsx
 do
  test -f "$f" || { echo "Missing: $f"; exit 1; }
 done

echo "Required workflow files: OK"

if grep -RIn "inputValidator" src >/tmp/novaworks-inputvalidator.txt; then
  echo "Deprecated inputValidator usage found:"
  cat /tmp/novaworks-inputvalidator.txt
  exit 1
fi

echo "TanStack validator migration: OK"

if grep -RInE "(^|[^a-zA-Z])import[[:space:]].*from ['\"]mysql2/promise['\"]" src | grep -v "import type" >/tmp/novaworks-mysql-runtime-import.txt; then
  echo "Unsafe mysql2 runtime import found:"
  cat /tmp/novaworks-mysql-runtime-import.txt
  exit 1
fi

echo "MySQL browser-leak guard: OK"

echo "Running production build..."
npm run build

echo "===== FINAL CHECK PASSED ====="
