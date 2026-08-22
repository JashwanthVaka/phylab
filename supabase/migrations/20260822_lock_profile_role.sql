-- Stops a student promoting themselves to administrator.
--
-- The foundation migration left three things true at once:
--
--   1. public.is_admin() decides admin status by reading profiles.role.
--   2. profiles_owner grants each user full write access to their own profile
--      row -- the role column included.
--   3. Every other table's policy reads `user_id = auth.uid() OR is_admin()`.
--
-- Together those let any signed-in learner run
--
--     update profiles set role = 'admin' where id = auth.uid();
--
-- and then read and write every other user's progress, quiz attempts and AI
-- conversations. Nothing here was exploited, because the project has never
-- been configured, but it must be closed before it is.
--
-- Two independent guards, because either alone can be undone by accident:
-- a column grant, and a trigger that restores the old value regardless.

-- 1. No client role may write the columns that decide identity or privilege.
revoke update (role, id) on public.profiles from authenticated;
revoke update (role, id) on public.profiles from anon;

-- 2. Even with a grant, a normal session cannot change role. Requests made
--    with the service-role key -- the Supabase SQL editor, the dashboard, or
--    a server holding the secret -- are still able to promote someone.
create or replace function public.enforce_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.role(), '') <> 'service_role' then
    new.role := old.role;
  end if;
  -- The primary key must never move; it is what ties the row to auth.users.
  new.id := old.id;
  return new;
end
$$;

drop trigger if exists profiles_enforce_role on public.profiles;
create trigger profiles_enforce_role
  before update on public.profiles
  for each row execute function public.enforce_profile_role();

-- 3. Inserts run through handle_new_user(), which sets no role and so takes
--    the 'student' default. Belt and braces: refuse a self-inserted admin.
create or replace function public.enforce_profile_role_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'admin' and coalesce(auth.role(), '') <> 'service_role' then
    new.role := 'student';
  end if;
  return new;
end
$$;

drop trigger if exists profiles_enforce_role_insert on public.profiles;
create trigger profiles_enforce_role_insert
  before insert on public.profiles
  for each row execute function public.enforce_profile_role_insert();

comment on function public.enforce_profile_role() is
  'Prevents privilege escalation: profiles.role may only be changed by a service-role session.';
