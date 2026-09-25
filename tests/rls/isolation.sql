-- Does row-level security actually keep one student out of another's work?
--
-- The client-side suite proves KINETIQ scopes every read and write it makes.
-- That is a different claim from this one. This asks what the database does
-- when a request arrives that is NOT well behaved: a student asking for rows
-- that are not theirs, or writing a row under someone else's id. Only the
-- database can answer that, and only by being run.
--
-- Every statement runs as `authenticated`, the role a signed-in browser holds.
-- Running as the table owner or a superuser would bypass row-level security
-- entirely and pass while leaking every row, so the role matters more than
-- anything else here.

\set ON_ERROR_STOP on
\pset pager off

begin;

-- Two students, created the way a provider sign-in creates them. The
-- handle_new_user trigger gives each one a profile.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ada@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'grace@example.test');

commit;

-- A helper so each check reads as "signed in as X".
create or replace function pg_temp.sign_in(who uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', who::text, false);
$$;

set role authenticated;

-- ── Ada does some work ──────────────────────────────────────────────────
select pg_temp.sign_in('11111111-1111-1111-1111-111111111111');
insert into public.lesson_progress (user_id, lesson_slug, completion_percentage, completed_at)
values ('11111111-1111-1111-1111-111111111111', 'kinematics', 100, now());

-- ── Grace does some work ────────────────────────────────────────────────
select pg_temp.sign_in('22222222-2222-2222-2222-222222222222');
insert into public.lesson_progress (user_id, lesson_slug, completion_percentage, completed_at)
values ('22222222-2222-2222-2222-222222222222', 'fields', 100, now());

-- ── 1. Each sees only their own progress ────────────────────────────────
select pg_temp.sign_in('11111111-1111-1111-1111-111111111111');
select 'ada_sees_only_her_own' as check,
       (select count(*) = 1 and bool_and(lesson_slug = 'kinematics')
        from public.lesson_progress) as passed;

select pg_temp.sign_in('22222222-2222-2222-2222-222222222222');
select 'grace_sees_only_her_own' as check,
       (select count(*) = 1 and bool_and(lesson_slug = 'fields')
        from public.lesson_progress) as passed;

-- ── 2. A student cannot read another's row even when naming its id ──────
select 'targeted_read_of_another_returns_nothing' as check,
       (select count(*) = 0 from public.lesson_progress
        where user_id = '11111111-1111-1111-1111-111111111111') as passed;

-- ── 3. A student cannot write a row under someone else's id ─────────────
-- The with-check half of the policy must reject this outright.
do $$
declare blocked boolean := false;
begin
  begin
    insert into public.lesson_progress (user_id, lesson_slug, completion_percentage)
    values ('11111111-1111-1111-1111-111111111111', 'forged', 100);
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then
    raise exception 'FAIL: a student wrote a row under another student''s id';
  end if;
  raise notice 'check: write_under_another_id_is_rejected | passed: t';
end $$;

-- ── 4. A student cannot edit or delete another's work ───────────────────
with edited as (
  update public.lesson_progress set completion_percentage = 0
  where user_id = '11111111-1111-1111-1111-111111111111' returning 1
)
select 'update_of_another_changes_nothing' as check,
       (select count(*) = 0 from edited) as passed;

with removed as (
  delete from public.lesson_progress
  where user_id = '11111111-1111-1111-1111-111111111111' returning 1
)
select 'delete_of_another_removes_nothing' as check,
       (select count(*) = 0 from removed) as passed;

-- ── 5. Profiles are private too ─────────────────────────────────────────
select 'profile_list_shows_only_self' as check,
       (select count(*) = 1 and bool_and(id = '22222222-2222-2222-2222-222222222222')
        from public.profiles) as passed;

-- ── 6. A student cannot promote themselves to admin ─────────────────────
-- Without this, isolation is decorative: is_admin() opens every policy, so
-- one UPDATE would hand a student every other student's work.
do $$
declare escalated boolean := false;
begin
  begin
    update public.profiles set role = 'admin'
    where id = '22222222-2222-2222-2222-222222222222';
    escalated := (select role::text = 'admin' from public.profiles
                  where id = '22222222-2222-2222-2222-222222222222');
  exception when others then
    escalated := false;
  end;
  if escalated then
    raise exception 'FAIL: a student promoted themselves to admin';
  end if;
  raise notice 'check: self_promotion_to_admin_is_blocked | passed: t';
end $$;

-- ── 7. A signed-out visitor sees nothing at all ─────────────────────────
select set_config('request.jwt.claim.sub', '', false);
select 'signed_out_sees_no_rows' as check,
       (select count(*) = 0 from public.lesson_progress) as passed;

reset role;

-- ── 9. Administrators manage accounts, not private study records ─────
select set_config('request.jwt.claim.role', 'service_role', false);
update public.profiles set role = 'admin'
where id = '11111111-1111-1111-1111-111111111111';
select set_config('request.jwt.claim.role', 'authenticated', false);

set role authenticated;
select pg_temp.sign_in('11111111-1111-1111-1111-111111111111');
select 'admin_cannot_read_student_private_progress' as check,
       (select count(*) = 0 from public.lesson_progress
        where user_id = '22222222-2222-2222-2222-222222222222') as passed;
select 'admin_rpc_returns_account_metadata' as check,
       (select count(*) = 2 from public.admin_user_rows()) as passed;

reset role;

-- ── 8. Teacher boundaries ────────────────────────────────────────────
-- Promote Ada through the trusted service role, create a class, then let
-- Grace join through the public invitation-code function.
select set_config('request.jwt.claim.role', 'service_role', false);
update public.profiles set role = 'teacher'
where id = '11111111-1111-1111-1111-111111111111';
select set_config('request.jwt.claim.role', 'authenticated', false);

set role authenticated;
select pg_temp.sign_in('11111111-1111-1111-1111-111111111111');
insert into public.teacher_classes (id, teacher_id, name, join_code)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111', 'Physics HL', 'JOIN42');

select pg_temp.sign_in('22222222-2222-2222-2222-222222222222');
select * from public.join_class('join42');

select 'student_sees_joined_class' as check,
       (select count(*) = 1 from public.teacher_classes
        where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') as passed;

-- Membership grants only the aggregate RPC promised in the UI. Direct rows
-- remain private even from the class teacher.
select pg_temp.sign_in('11111111-1111-1111-1111-111111111111');
select 'teacher_cannot_directly_read_joined_student_progress' as check,
       (select count(*) = 0 from public.lesson_progress
        where user_id = '22222222-2222-2222-2222-222222222222') as passed;
select 'teacher_receives_joined_student_summary_rpc' as check,
       (select count(*) = 1 from public.teacher_student_summaries(
         'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) as passed;

-- Private learning records are deliberately not shared with a teacher.
select 'teacher_cannot_read_student_bookmarks' as check,
       (select count(*) = 0 from public.bookmarks
        where user_id = '22222222-2222-2222-2222-222222222222') as passed;

-- A learner cannot create a class by pretending to be its teacher.
select pg_temp.sign_in('22222222-2222-2222-2222-222222222222');
do $$
declare blocked boolean := false;
begin
  begin
    insert into public.teacher_classes (teacher_id, name)
    values ('22222222-2222-2222-2222-222222222222', 'Forged class');
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: a student created a teacher class'; end if;
  raise notice 'check: student_cannot_create_teacher_class | passed: t';
end $$;

-- Once Grace leaves, Ada immediately loses access to her progress.
delete from public.class_memberships
where class_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  and user_id = '22222222-2222-2222-2222-222222222222';
select pg_temp.sign_in('11111111-1111-1111-1111-111111111111');
select 'teacher_access_ends_when_student_leaves' as check,
       (select count(*) = 0 from public.teacher_student_summaries(
         'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) as passed;

reset role;
