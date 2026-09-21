-- Non-destructive smoke test for the live Supabase project.
-- Every fixture is inside one transaction and the final statement rolls it
-- back, so this leaves no accounts, progress, classes or memberships behind.
\set ON_ERROR_STOP on
begin;

create temporary table rls_results (check_name text primary key, passed boolean not null);
grant select, insert on pg_temp.rls_results to authenticated;
create or replace function pg_temp.sign_in(who uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', who::text, false),
         set_config('request.jwt.claim.role', 'authenticated', false)
$$;

insert into auth.users (id, email) values
  ('91111111-1111-1111-1111-111111111111', 'kinetiq-rls-teacher@example.test'),
  ('92222222-2222-2222-2222-222222222222', 'kinetiq-rls-student@example.test');

select set_config('request.jwt.claim.role', 'service_role', false);
update public.profiles set role = 'teacher'
where id = '91111111-1111-1111-1111-111111111111';

set role authenticated;
select pg_temp.sign_in('92222222-2222-2222-2222-222222222222');
insert into public.lesson_progress (user_id, lesson_slug, completion_percentage)
values ('92222222-2222-2222-2222-222222222222', 'kinematics', 80);

select pg_temp.sign_in('91111111-1111-1111-1111-111111111111');
insert into public.teacher_classes (id, teacher_id, name, join_code)
values ('9aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '91111111-1111-1111-1111-111111111111', 'RLS test class', 'RLS-LIVE');
insert into pg_temp.rls_results values
  ('teacher_cannot_read_unjoined_student',
   (select count(*) = 0 from public.lesson_progress
    where user_id = '92222222-2222-2222-2222-222222222222'));

select pg_temp.sign_in('92222222-2222-2222-2222-222222222222');
select * from public.join_class('rls-live');
insert into pg_temp.rls_results values
  ('student_sees_only_joined_class',
   (select count(*) = 1 from public.teacher_classes
    where id = '9aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'));

select pg_temp.sign_in('91111111-1111-1111-1111-111111111111');
insert into pg_temp.rls_results values
  ('teacher_sees_joined_student_progress',
   (select count(*) = 1 from public.lesson_progress
    where user_id = '92222222-2222-2222-2222-222222222222')),
  ('teacher_cannot_read_private_bookmarks',
   (select count(*) = 0 from public.bookmarks
    where user_id = '92222222-2222-2222-2222-222222222222'));

select pg_temp.sign_in('92222222-2222-2222-2222-222222222222');
delete from public.class_memberships
where class_id = '9aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select pg_temp.sign_in('91111111-1111-1111-1111-111111111111');
insert into pg_temp.rls_results values
  ('teacher_access_ends_after_leave',
   (select count(*) = 0 from public.lesson_progress
    where user_id = '92222222-2222-2222-2222-222222222222'));

reset role;
do $$
begin
  if exists (select 1 from pg_temp.rls_results where not passed)
     or (select count(*) from pg_temp.rls_results) <> 5 then
    raise exception 'KINETIQ production RLS isolation failed';
  end if;
end
$$;

select check_name, passed from pg_temp.rls_results order by check_name;
rollback;
