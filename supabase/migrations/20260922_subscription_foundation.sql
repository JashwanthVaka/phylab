-- Payment-provider-neutral subscription state. There is no checkout yet.
-- Rows are written only by a future trusted server webhook, never by clients.
create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan_key text not null default 'launch' check (plan_key in ('launch','student','school')),
  status text not null default 'active' check (status in ('active','trialing','past_due','cancelled','expired')),
  provider_customer_id text unique,
  provider_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
drop policy if exists subscriptions_owner_read on public.subscriptions;
create policy subscriptions_owner_read on public.subscriptions for select using (user_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
create index if not exists subscriptions_status_idx on public.subscriptions(status, current_period_end);
