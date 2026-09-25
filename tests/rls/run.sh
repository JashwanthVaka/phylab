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
DATA_DIR=
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../.." && pwd)

skip() { echo "SKIP: $1"; echo "      These checks need a Postgres server; the schema was not verified."; exit 0; }

if [ -z "$SOCK" ]; then
  # Homebrew installs PostgreSQL outside Linux's conventional path. Prefer an
  # already-installed copy; this test must never install or upgrade software.
  if [ ! -x "$PG_BIN/initdb" ] && command -v brew >/dev/null 2>&1; then
    BREW_PG=$(brew --prefix postgresql@16 2>/dev/null || true)
    [ -x "$BREW_PG/bin/initdb" ] && PG_BIN="$BREW_PG/bin"
  fi
  [ -x "$PG_BIN/initdb" ] || skip "no Postgres server binaries at $PG_BIN"
  # macOS development runs as an ordinary user already. Linux CI sometimes
  # runs as root, where initdb requires an unprivileged helper account.
  if [ "$(id -u)" -eq 0 ]; then
    RUNAS=${KINETIQ_PGUSER:-pgtest}
    id "$RUNAS" >/dev/null 2>&1 || useradd -m "$RUNAS" >/dev/null 2>&1 || skip "cannot create the unprivileged user $RUNAS"
    HOME_DIR=$(getent passwd "$RUNAS" | cut -d: -f6)
    DATA_DIR="$HOME_DIR/pg/data"
    SOCK="$HOME_DIR/pg/sock"
    su "$RUNAS" -c "export PATH=$PG_BIN:\$PATH
      rm -rf $HOME_DIR/pg && mkdir -p $DATA_DIR $SOCK
      initdb -U postgres -A trust $DATA_DIR >$HOME_DIR/pg/initdb.log 2>&1 &&
      pg_ctl -D $DATA_DIR -o '-k $SOCK -c listen_addresses=' -l $HOME_DIR/pg/server.log start >/dev/null 2>&1" \
      || skip "could not start a Postgres server"
  else
    TEST_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/kinetiq-rls.XXXXXX")
    DATA_DIR="$TEST_ROOT/data"
    SOCK="$TEST_ROOT/sock"
    mkdir -p "$SOCK"
    "$PG_BIN/initdb" -U postgres -A trust "$DATA_DIR" >"$TEST_ROOT/initdb.log" 2>&1 &&
      "$PG_BIN/pg_ctl" -D "$DATA_DIR" -o "-k $SOCK -c listen_addresses=" -l "$TEST_ROOT/server.log" start >/dev/null 2>&1 \
      || skip "could not start a Postgres server"
  fi
  OWN_SERVER=1
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    psql -h "$SOCK" -U postgres -tAc 'select 1' >/dev/null 2>&1 && break
    sleep 1
  done
fi

psql -h "$SOCK" -U postgres -tAc 'select 1' >/dev/null 2>&1 || skip "no Postgres reachable on $SOCK"

stop_server() {
  [ "$OWN_SERVER" = 1 ] || return 0
  if [ "$(id -u)" -eq 0 ]; then
    su "${RUNAS:-pgtest}" -c "export PATH=$PG_BIN:\$PATH; pg_ctl -D $DATA_DIR stop -m immediate" >/dev/null 2>&1
  else
    "$PG_BIN/pg_ctl" -D "$DATA_DIR" stop -m immediate >/dev/null 2>&1
    rm -rf "${TEST_ROOT:-}"
  fi
}
trap stop_server EXIT

q() { psql -h "$SOCK" -U postgres -q -v ON_ERROR_STOP=1 "$@"; }

# A clean database every run, so a leftover fixture can never look like a pass.
q -c 'drop schema if exists public cascade; create schema public; drop schema if exists auth cascade;' >/dev/null 2>&1
q -f "$HERE/supabase-shim.sql" >/dev/null || { echo "FAIL: the Supabase shim did not apply"; exit 1; }
for migration in "$ROOT"/supabase/migrations/*.sql; do
  q -f "$migration" >/dev/null 2>&1 || { echo "FAIL: migration did not apply: $(basename "$migration")"; exit 1; }
done

output=$(psql -h "$SOCK" -U postgres -A -F' | ' -f "$HERE/isolation.sql" 2>&1)
psql_status=$?
results=$(echo "$output" | grep -E '^[a-z_]+ \| [tf]$|passed: [tf]' | sed 's/.*NOTICE: *check: //; s/ | passed: / | /')

echo "$results"
failed=$(echo "$results" | grep -c '| f$')
total=$(echo "$results" | grep -c '|')

if [ "$psql_status" -ne 0 ]; then
  echo "$output" | grep -E 'ERROR:|FATAL:' | tail -n 5
  echo "row-level security: FAILED (the SQL suite did not complete)"
  exit 1
fi
if echo "$output" | grep -q 'FAIL:'; then
  echo "$output" | grep 'FAIL:'
  echo "row-level security: FAILED"
  exit 1
fi
if [ "$failed" -gt 0 ] || [ "$total" -lt 9 ]; then
  echo "row-level security: FAILED ($failed of $total checks failed, expected at least 9 checks)"
  exit 1
fi

hardening_output=$(psql -h "$SOCK" -U postgres -A -F' | ' -f "$HERE/security-hardening.sql" 2>&1)
hardening_status=$?
hardening_results=$(echo "$hardening_output" | grep -E '^[a-z_]+ \| [tf]$|passed: [tf]' | sed 's/.*NOTICE: *check: //; s/ | passed: / | /')
echo "$hardening_results"
hardening_failed=$(echo "$hardening_results" | grep -c '| f$')
hardening_total=$(echo "$hardening_results" | grep -c '|')

if [ "$hardening_status" -ne 0 ]; then
  echo "$hardening_output" | grep -E 'ERROR:|FATAL:' | tail -n 5
  echo "security hardening RLS: FAILED (the SQL suite did not complete)"
  exit 1
fi
if echo "$hardening_output" | grep -q 'FAIL:'; then
  echo "$hardening_output" | grep 'FAIL:'
  echo "security hardening RLS: FAILED"
  exit 1
fi
if [ "$hardening_failed" -gt 0 ] || [ "$hardening_total" -lt 12 ]; then
  echo "security hardening RLS: FAILED ($hardening_failed of $hardening_total checks failed, expected at least 12 checks)"
  exit 1
fi
echo "row-level security: $((total + hardening_total)) checks passed against a real Postgres"
