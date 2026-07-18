#!/bin/sh
set -eu

if [ "${RUN_DB_MIGRATIONS:-true}" = "true" ]; then
  echo "Running database migrations..."
  node scripts/migrate.mjs
else
  echo "Skipping database migrations because RUN_DB_MIGRATIONS is not true."
fi

exec node server.js
