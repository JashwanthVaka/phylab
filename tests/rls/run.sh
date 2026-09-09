#!/usr/bin/env bash
# Runs the row-level security checks against a real Postgres.
#
# The client-side suite proves KINETIQ scopes the reads and writes it makes.
# This proves what the database does with a request that is not well behaved,
# which is the only question that matters for "can a student see another
# student's work". It needs a real server, so it is not part of `npm test`:
# run it with `npm run test:rls` before trusting a schema change.
#
# Point it at any Postgres with PGHOST/PGUSER, or let it start its own.
set -uo pipefail

PG_BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
SOCK=${KINETIQ_PGSOCK:-}
OWN_SERVER=0
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../.." && pwd)

skip() { echo "SKIP: $1"; echo "      These checks need a Postgres server; the schema was not verified."; exit 0; }

if [ -z "$SOCK" ]; then
  [ -x "$PG_BIN/initdb" ] || skip "no Postgres server binaries at $PG_BIN"
  # initdb refuses to run as root, so an unprivileged owner is required.
  RUNAS=${KINETIQ_PGUSER:-pgtest}
  id "$RUNAS" >/dev/null 2>&1 || useradd -m "$RUNAS" >/dev/null 2>&1 || skip "cannot create the unprivileged user $RUNAS"
  HOME_DIR=$(getent passwd "$RUNAS" | cut -d: -f6)
  SOCK="$HOME_DIR/pg/sock"
  su "$RUNAS" -c "export PATH=$PG_BIN:\$PATH
    rm -rf $HOME_DIR/pg && mkdir -p $HOME_DIR/pg/data $HOME_DIR/pg/sock
    initdb -U postgres -A trust $HOME_DIR/pg/data >$HOME_DIR/pg/initdb.log 2>&1 &&
    pg_ctl -D $HOME_DIR/pg/data -o '-k $SOCK -c listen_addresses=' -l $HOME_DIR/pg/server.log start >/dev/null 2>&1" \
    || skip "could not start a Postgres server"
  OWN_SERVER=1
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    psql -h "$SOCK" -U postgres -tAc 'select 1' >/dev/null 2>&1 && break
    sleep 1
  done
fi

psql -h "$SOCK" -U postgres -tAc 'select 1' >/dev/null 2>&1 || skip "no Postgres reachable on $SOCK"

stop_server() {
  [ "$OWN_SERVER" = 1 ] || return 0
  su "${RUNAS:-pgtest}" -c "export PATH=$PG_BIN:\$PATH; pg_ctl -D $HOME_DIR/pg/data stop -m immediate" >/dev/null 2>&1
}
trap stop_server EXIT

q() { psql -h "$SOCK" -U postgres -q -v ON_ERROR_STOP=1 "$@"; }

# A clean database every run, so a leftover fixture can never look like a pass.
q -c 'drop schema if exists public cascade; create schema public; drop schema if exists auth cascade;' >/dev/null 2>&1
q -f "$HERE/supabase-shim.sql" >/dev/null || { echo "FAIL: the Supabase shim did not apply"; exit 1; }
for migration in "$ROOT"/supabase/migrations/*.sql; do
  q -f "$migration" >/dev/null 2>&1 || { echo "FAIL: migration did not apply: $(basename "$migration")"; exit 1; }
done
# Supabase grants these on project creation, so no migration does.
q -c 'grant usage on schema public to anon, authenticated;
      grant select, insert, update, delete on all tables in schema public to anon, authenticated;' >/dev/null

output=$(psql -h "$SOCK" -U postgres -A -F' | ' -f "$HERE/isolation.sql" 2>&1)
results=$(echo "$output" | grep -E '^[a-z_]+ \| [tf]$|passed: [tf]' | sed 's/.*NOTICE: *check: //; s/ | passed: / | /')

echo "$results"
failed=$(echo "$results" | grep -c '| f$')
total=$(echo "$results" | grep -c '|')

if echo "$output" | grep -q 'FAIL:'; then
  echo "$output" | grep 'FAIL:'
  echo "row-level security: FAILED"
  exit 1
fi
if [ "$failed" -gt 0 ] || [ "$total" -lt 9 ]; then
  echo "row-level security: FAILED ($failed of $total checks failed, expected 9 checks)"
  exit 1
fi
echo "row-level security: $total checks passed against a real Postgres"
