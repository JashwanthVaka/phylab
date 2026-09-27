-- Private Web Push subscriptions and an idempotent daily reminder queue.
-- Browser code never reads this table. Authenticated subscription changes go
-- through the KINETIQ server, which verifies the Supabase access token before
-- using its server-only secret key.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  timezone text not null default 'UTC',
  enabled boolean not null default true,
  last_attempted_at timestamptz,
  last_notified_on date,
  failure_count integer not null default 0 check (failure_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions(user_id);
create index if not exists push_subscriptions_delivery_idx
  on public.push_subscriptions(enabled, last_notified_on, last_attempted_at);

drop trigger if exists push_subscriptions_updated_at on public.push_subscriptions;
create trigger push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to service_role;

-- Claims rows before network delivery. The attempt window prevents duplicate
-- notifications if Vercel invokes a daily cron more than once.
create or replace function public.claim_push_digest(
  p_day date default current_date,
  p_limit integer default 1000
)
returns table (
  subscription_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  due_cards bigint,
  due_tasks bigint
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise insufficient_privilege using message = 'Server reminder access required';
  end if;

  return query
  with candidates as (
    select ps.id
    from public.push_subscriptions ps
    where ps.enabled
      and ps.last_notified_on is distinct from p_day
      and (ps.last_attempted_at is null or ps.last_attempted_at < now() - interval '2 hours')
      and (
        exists (select 1 from public.flashcard_progress fp where fp.user_id = ps.user_id and fp.due_at <= now())
        or exists (select 1 from public.revision_tasks rt where rt.user_id = ps.user_id and rt.completed_at is null and rt.due_at <= now())
      )
    order by ps.last_attempted_at nulls first, ps.created_at
    for update skip locked
    limit greatest(1, least(p_limit, 2000))
  ), claimed as (
    update public.push_subscriptions ps
    set last_attempted_at = now()
    from candidates c
    where ps.id = c.id
    returning ps.*
  )
  select
    c.id,
    c.endpoint,
    c.p256dh,
    c.auth,
    (select count(*) from public.flashcard_progress fp where fp.user_id = c.user_id and fp.due_at <= now()),
    (select count(*) from public.revision_tasks rt where rt.user_id = c.user_id and rt.completed_at is null and rt.due_at <= now())
  from claimed c;
end
$$;

create or replace function public.finish_push_digest(
  p_day date,
  p_delivered uuid[] default '{}',
  p_expired uuid[] default '{}',
  p_failed uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise insufficient_privilege using message = 'Server reminder access required';
  end if;

  update public.push_subscriptions
  set last_notified_on = p_day, failure_count = 0
  where id = any(coalesce(p_delivered, '{}'::uuid[]));

  update public.push_subscriptions
  set enabled = false, failure_count = failure_count + 1
  where id = any(coalesce(p_expired, '{}'::uuid[]));

  update public.push_subscriptions
  set failure_count = failure_count + 1,
      enabled = case when failure_count + 1 >= 5 then false else enabled end
  where id = any(coalesce(p_failed, '{}'::uuid[]));
end
$$;

revoke all on function public.claim_push_digest(date, integer) from public, anon, authenticated;
revoke all on function public.finish_push_digest(date, uuid[], uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public.claim_push_digest(date, integer) to service_role;
grant execute on function public.finish_push_digest(date, uuid[], uuid[], uuid[]) to service_role;

comment on table public.push_subscriptions is
  'Private per-account Web Push endpoints. Browser roles have no direct access.';
