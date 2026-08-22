/**
 * Guards the database schema's authorisation model.
 *
 * These are static checks on the SQL rather than a live database, because the
 * project may not be configured yet and the flaw they cover is one you want
 * caught before it ever reaches a real deployment.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(ROOT, 'supabase', 'migrations');
const files = fs.readdirSync(dir).filter(name => name.endsWith('.sql')).sort();
assert.ok(files.length, 'expected at least one migration');
const sql = files.map(name => fs.readFileSync(path.join(dir, name), 'utf8')).join('\n');

// ── Every table must have row-level security switched on ─────────────
const tables = [...sql.matchAll(/create table (?:if not exists )?public\.([a-z_]+)/g)].map(m => m[1]);
assert.ok(tables.length >= 15, `expected the full schema, found ${tables.length} tables`);

const rlsEnabled = new Set(
  [...sql.matchAll(/alter table (?:public\.)?([a-z_]+) enable row level security/gi)].map(m => m[1])
);
// Several policies are created inside a foreach loop over an array of table
// names, so collect those too rather than reporting a false gap.
const loopedTables = [...sql.matchAll(/array\[((?:'[a-z_]+',?\s*)+)\]/g)]
  .flatMap(match => [...match[1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]));
const explicitPolicies = new Set(
  [...sql.matchAll(/create policy\s+\S+\s+on\s+(?:public\.)?([a-z_]+)/gi)].map(m => m[1])
);
const covered = new Set([...explicitPolicies, ...loopedTables]);

tables.forEach(table => {
  assert.ok(rlsEnabled.has(table), `table ${table} does not enable row level security`);
  assert.ok(covered.has(table), `table ${table} has row level security but no policy, so it denies everything`);
});

// ── The role column must not be self-writable ────────────────────────
// is_admin() reads profiles.role, and every table's policy trusts is_admin().
// If a learner can write their own role they can read every other learner's
// data, so this is the single most important guard in the schema.
const readsRole = /is_admin\(\)[\s\S]*?from public\.profiles where id=auth\.uid\(\) and role='admin'/.test(sql);
if (readsRole) {
  assert.ok(
    /revoke update \(role[^)]*\) on public\.profiles from authenticated/.test(sql),
    'authenticated users must not hold UPDATE on profiles.role'
  );
  assert.ok(
    /revoke update \(role[^)]*\) on public\.profiles from anon/.test(sql),
    'anonymous users must not hold UPDATE on profiles.role'
  );
  assert.ok(
    /new\.role\s*:=\s*old\.role/.test(sql),
    'a trigger must restore profiles.role when a non-service session changes it'
  );
  assert.ok(
    /create trigger profiles_enforce_role\b/.test(sql),
    'the role-enforcement trigger must be attached to profiles'
  );
  assert.ok(
    /service_role/.test(sql),
    'the guard must still let a service-role session promote an administrator'
  );
}

// ── Privilege must never be taken from client-supplied metadata ──────
const newUser = /handle_new_user\(\)[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(sql)?.[1] || '';
assert.ok(!/raw_user_meta_data->>'role'/.test(newUser),
  'a new profile must never take its role from user metadata, which the client controls');

// ── The service-role key must not appear in any migration ────────────
assert.ok(!/eyJ[A-Za-z0-9._-]{20,}/.test(sql), 'a migration must never embed a key');

console.log(`schema tests passed (${tables.length} tables, RLS and policies present, role column locked)`);
