#!/bin/sh
set -eu

if [ "${RUN_DB_MIGRATIONS:-false}" = "true" ]; then
  node scripts/migrate.mjs
fi

exec node server.js
