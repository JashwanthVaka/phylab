-- Owner administration without an elevated database secret in the web deployment.
-- Administrators can manage account roles and aggregate account metadata, but
-- do not receive blanket access to private learning records.
drop policy if exists profiles_owner on public.profiles;
create policy profiles_owner on public.profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists settings_owner on public.user_settings;
create policy settings_owner on public.user_settings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'lesson_progress','topic_mastery','quiz_attempts','question_attempts',
    'bookmarks','flashcard_progress','study_sessions','revision_plans',
    'revision_tasks','ai_conversations'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_owner', table_name);
    execute format(
      'create policy %I on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      table_name || '_owner', table_name
    );
  end loop;
end
$$;

drop policy if exists quiz_answers_owner on public.quiz_answers;
create policy quiz_answers_owner on public.quiz_answers for all
  using (exists (
    select 1 from public.quiz_attempts q
    where q.id = quiz_attempt_id and q.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.quiz_attempts q
    where q.id = quiz_attempt_id and q.user_id = auth.uid()
  ));

drop policy if exists ai_messages_owner on public.ai_messages;
create policy ai_messages_owner on public.ai_messages for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.enforce_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end
$$;

create or replace function public.admin_user_rows()
returns table (
  id uuid, email text, display_name text, role public.app_role,
  provider text, created_at timestamptz, last_sign_in_at timestamptz,
  email_confirmed_at timestamptz
)
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise insufficient_privilege using message = 'Administrator access required'; end if;
  return query
    select u.id, u.email::text, p.display_name, p.role,
      coalesce(u.raw_app_meta_data->>'provider', 'email'),
      u.created_at, u.last_sign_in_at, u.email_confirmed_at
    from auth.users u join public.profiles p on p.id = u.id
    order by u.created_at desc;
end
$$;

create or replace function public.admin_set_account_role(target_user uuid, target_role public.app_role)
returns void
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not public.is_admin() then raise insufficient_privilege using message = 'Administrator access required'; end if;
  if target_user = auth.uid() then raise exception 'An administrator cannot change their own role here'; end if;
  if target_role not in ('student', 'teacher') then raise exception 'Only student or teacher may be assigned'; end if;
  update public.profiles set role = target_role where id = target_user;
  if not found then raise exception 'Account not found'; end if;
end
$$;

revoke all on function public.admin_user_rows() from public, anon;
revoke all on function public.admin_set_account_role(uuid, public.app_role) from public, anon;
grant execute on function public.admin_user_rows() to authenticated;
grant execute on function public.admin_set_account_role(uuid, public.app_role) to authenticated;
