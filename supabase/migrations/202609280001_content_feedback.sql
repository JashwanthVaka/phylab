-- Learner-submitted corrections and product feedback. Every report belongs to
-- its author. Administrators may review reports, but teachers do not gain
-- access to a student's other private records through this table.

create table if not exists public.content_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('content', 'question', 'visual', 'accessibility', 'idea', 'other')),
  page_path text not null check (char_length(page_path) between 1 and 500),
  content_ref text check (char_length(content_ref) <= 200),
  message text not null check (char_length(message) between 10 and 2000),
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_feedback_user_created_idx
  on public.content_feedback(user_id, created_at desc);
create index if not exists content_feedback_status_created_idx
  on public.content_feedback(status, created_at desc);

drop trigger if exists content_feedback_updated_at on public.content_feedback;
create trigger content_feedback_updated_at before update on public.content_feedback
for each row execute function public.set_updated_at();

alter table public.content_feedback enable row level security;
drop policy if exists content_feedback_owner_insert on public.content_feedback;
drop policy if exists content_feedback_owner_read on public.content_feedback;
drop policy if exists content_feedback_admin_update on public.content_feedback;
create policy content_feedback_owner_insert on public.content_feedback for insert
  with check (user_id = auth.uid());
create policy content_feedback_owner_read on public.content_feedback for select
  using (user_id = auth.uid() or public.is_admin());
create policy content_feedback_admin_update on public.content_feedback for update
  using (public.is_admin()) with check (public.is_admin());
revoke delete on public.content_feedback from anon, authenticated;
grant select, insert, update on public.content_feedback to authenticated;

comment on table public.content_feedback is
  'Account-scoped learner corrections and product feedback. Administrators review status; authors retain read access.';
