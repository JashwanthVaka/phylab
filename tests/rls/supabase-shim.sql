-- The parts of Supabase the migrations depend on, and nothing more.
--
-- Supabase is Postgres with an `auth` schema in front of it. Everything the
-- schema actually leans on is here: the users table its foreign keys point at,
-- and the three functions the policies call. auth.uid() reads the same GUC
-- Supabase sets from the JWT, so "signing in" in these tests is setting that
-- one setting, exactly as a real request does.
--
-- This exists so the row-level security policies can be executed rather than
-- read. A policy that is only read is a policy nobody has run.

create extension if not exists pgcrypto;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  -- The provider's profile payload. handle_new_user reads display_name out of
  -- it, so a shim without this column hides a real dependency.
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Supabase populates request.jwt.claim.sub from the access token. Reading it
-- with the missing_ok flag makes an unauthenticated request return null rather
-- than error, which is what a policy comparing against null must see.
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;

create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

-- The role a signed-in browser actually runs as. It must not own the tables
-- and must not be a superuser, because both bypass row-level security: a test
-- run as the owner would pass while every student read every other student.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
end $$;

-- Supabase grants these to anon and authenticated by default when a project is
-- created, so a migration never does it. Mirroring that here keeps the test
-- honest: without the grants every query would fail for lack of privilege and
-- the policies would never be reached, which would look like isolation while
-- proving nothing.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
