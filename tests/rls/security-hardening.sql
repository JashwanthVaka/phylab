-- Adversarial checks for profile roles, teacher boundaries and submitted work.
-- This file runs after isolation.sql against the same database in a fresh
-- connection, so it recreates only the session helper and classroom fixtures.

\set ON_ERROR_STOP on
\pset pager off

create or replace function pg_temp.sign_in(who uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', who::text, false),
         set_config('request.jwt.claim.role', 'authenticated', false);
$$;

-- isolation.sql deliberately removed this membership. Recreate the minimum
-- published assignment needed to prove both sides of the submission boundary.
insert into public.class_memberships (class_id, user_id, role)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '22222222-2222-2222-2222-222222222222', 'student')
on conflict (class_id, user_id) do nothing;

insert into public.assignments
  (id, class_id, teacher_id, title, content, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   'Hardening fixture', '{"questions":1}'::jsonb, 'published')
on conflict (id) do nothing;

set role authenticated;
select pg_temp.sign_in('22222222-2222-2222-2222-222222222222');

-- A browser cannot remove or recreate its authorization profile.
do $$
declare blocked boolean := false;
begin
  begin
    delete from public.profiles
    where id = '22222222-2222-2222-2222-222222222222';
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: a student deleted their profile'; end if;
  raise notice 'check: self_profile_delete_is_blocked | passed: t';
end $$;

do $$
declare blocked boolean := false;
begin
  begin
    insert into public.profiles (id, display_name, role)
    values ('33333333-3333-3333-3333-333333333333', 'Forged owner', 'admin');
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: a browser inserted an administrator profile'; end if;
  raise notice 'check: forged_admin_profile_insert_is_blocked | passed: t';
end $$;

with changed as (
  update public.profiles set display_name = 'Grace learner'
  where id = '22222222-2222-2222-2222-222222222222'
  returning 1
)
select 'safe_profile_preference_update_works' as check,
       (select count(*) = 1 from changed) as passed;

do $$
declare blocked boolean := false;
begin
  begin
    update public.profiles set role = 'admin'
    where id = '22222222-2222-2222-2222-222222222222';
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: a student directly changed their role'; end if;
  raise notice 'check: direct_role_escalation_is_blocked | passed: t';
end $$;

-- Even a joined class does not expose the learner's profile row directly.
select pg_temp.sign_in('11111111-1111-1111-1111-111111111111');
select 'teacher_cannot_select_student_profile' as check,
       (select count(*) = 0 from public.profiles
        where id = '22222222-2222-2222-2222-222222222222') as passed;
select 'teacher_summary_exposes_one_joined_aggregate' as check,
       (select count(*) = 1 from public.teacher_student_summaries(
         'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')) as passed;

-- A demoted teacher immediately loses authority over an existing class row.
reset role;
select set_config('request.jwt.claim.role', 'service_role', false);
update public.profiles set role = 'student'
where id = '11111111-1111-1111-1111-111111111111';
set role authenticated;
select pg_temp.sign_in('11111111-1111-1111-1111-111111111111');
select 'demoted_teacher_loses_existing_class_access' as check,
       (select count(*) = 0 from public.teacher_classes
        where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') as passed;
reset role;
select set_config('request.jwt.claim.role', 'service_role', false);
update public.profiles set role = 'teacher'
where id = '11111111-1111-1111-1111-111111111111';

-- Learners own answer content, never marks, identities or teacher feedback.
set role authenticated;
select pg_temp.sign_in('22222222-2222-2222-2222-222222222222');
do $$
declare blocked boolean := false;
begin
  begin
    insert into public.assignment_submissions
      (assignment_id, student_id, content, status, teacher_feedback, awarded_marks)
    values
      ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
       '22222222-2222-2222-2222-222222222222',
       '{"answer":"forged"}'::jsonb, 'submitted', 'self marked', 100);
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: a student inserted marking fields'; end if;
  raise notice 'check: student_cannot_insert_marking_fields | passed: t';
end $$;

insert into public.assignment_submissions
  (id, assignment_id, student_id, content, status)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '22222222-2222-2222-2222-222222222222',
   '{"answer":"initial"}'::jsonb, 'not_started');

select 'student_can_create_own_draft' as check,
       (select count(*) = 1 from public.assignment_submissions
        where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') as passed;

do $$
declare blocked boolean := false;
begin
  begin
    update public.assignment_submissions
    set student_id = '11111111-1111-1111-1111-111111111111'
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: a student changed submission identity'; end if;
  raise notice 'check: submission_identity_change_is_blocked | passed: t';
end $$;

update public.assignment_submissions
set content = '{"answer":"final"}'::jsonb, status = 'submitted'
where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
select 'submission_transition_sets_timestamp' as check,
       (select status = 'submitted' and submitted_at is not null
        from public.assignment_submissions
        where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') as passed;

do $$
declare blocked boolean := false;
begin
  begin
    update public.assignment_submissions
    set content = '{"answer":"changed after submit"}'::jsonb
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: a submitted answer was edited'; end if;
  raise notice 'check: submitted_answer_is_immutable | passed: t';
end $$;

-- Current teachers may mark and return, but may never rewrite the answer.
select pg_temp.sign_in('11111111-1111-1111-1111-111111111111');
do $$
declare blocked boolean := false;
begin
  begin
    update public.assignment_submissions
    set content = '{"answer":"teacher rewrite"}'::jsonb
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: a teacher rewrote a learner answer'; end if;
  raise notice 'check: teacher_cannot_rewrite_student_answer | passed: t';
end $$;

update public.assignment_submissions
set teacher_feedback = 'Check the sign convention.',
    awarded_marks = 4,
    status = 'returned'
where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
select 'teacher_can_mark_and_return_submission' as check,
       (select status = 'returned'
            and awarded_marks = 4
            and teacher_feedback = 'Check the sign convention.'
        from public.assignment_submissions
        where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') as passed;

reset role;
