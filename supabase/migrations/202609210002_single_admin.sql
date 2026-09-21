-- KINETIQ has one owner account. Keep the authorization boundary in the
-- database without publishing the owner's email address in application code.
-- The existing role trigger prevents learners from assigning this role, and
-- this partial unique index prevents any second administrator from existing.
create unique index if not exists profiles_single_admin_idx
  on public.profiles (role)
  where role = 'admin';
