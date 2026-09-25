-- Final least-privilege boundary for profiles, classrooms and submissions.
-- Forward-only: this migration deliberately supersedes policies and functions
-- from earlier migrations without changing deployed history.

-- Profiles are provisioned by auth.users -> handle_new_user(). A browser may
-- read its profile and update only preference columns. It may never delete the
-- row, recreate it, choose its identity, or choose an authorization role.
drop policy if exists profiles_owner on public.profiles;
drop policy if exists profiles_self_read on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid());
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

revoke insert, delete, update on public.profiles from authenticated, anon;
grant update (display_name, preferred_level, study_goals, timezone, onboarding_completed)
  on public.profiles to authenticated;

create or replace function public.enforce_profile_role()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.id is distinct from old.id then
    raise insufficient_privilege using message = 'Profile identity cannot be changed';
  end if;

  if new.role is distinct from old.role then
    -- Keep a deployed project recoverable through the service role, but do not
    -- let the sole administrator remove their own last recovery path.
    if old.role = 'admin'
       and new.role <> 'admin'
       and (select count(*) from public.profiles where role = 'admin') <= 1
       and coalesce(auth.role(), '') <> 'service_role' then
      raise insufficient_privilege using message = 'The sole administrator requires service-role recovery to demote';
    end if;

    -- Direct browser updates run as authenticated/anon. The checked
    -- admin_set_account_role() SECURITY DEFINER function runs as its owner.
    if coalesce(auth.role(), '') <> 'service_role'
       and (current_user in ('authenticated', 'anon') or not public.is_admin()) then
      raise insufficient_privilege using message = 'Only the administrator role service may change account roles';
    end if;
  end if;

  return new;
end
$$;

create or replace function public.enforce_profile_role_insert()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.role <> 'student' and coalesce(auth.role(), '') <> 'service_role' then
    raise insufficient_privilege using message = 'New browser profiles must use the student role';
  end if;
  return new;
end
$$;

-- Owning an old class row is not enough after an administrator demotes a
-- teacher. Every class helper rechecks the caller's current trusted role.
create or replace function public.is_class_teacher(target_class uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.teacher_classes c
    join public.profiles p on p.id = c.teacher_id
    where c.id = target_class
      and c.teacher_id = auth.uid()
      and p.role in ('teacher', 'admin')
  )
$$;

create or replace function public.teaches_student(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.is_teacher() and exists (
    select 1
    from public.teacher_classes c
    join public.class_memberships m on m.class_id = c.id
    where c.teacher_id = auth.uid() and m.user_id = target_user
  )
$$;

revoke all on function public.is_class_teacher(uuid) from public;
revoke all on function public.teaches_student(uuid) from public;
grant execute on function public.is_class_teacher(uuid) to authenticated;
grant execute on function public.teaches_student(uuid) to authenticated;

-- Teachers do not select profiles or learning records belonging to students.
-- This RPC is the only classroom-progress surface and returns only the fields
-- promised to learners: display name plus aggregate lesson, mastery and quiz
-- summaries for members of one class owned by the current teacher.
drop policy if exists profiles_teacher_read on public.profiles;
drop policy if exists lesson_progress_teacher_read on public.lesson_progress;
drop policy if exists mastery_teacher_read on public.topic_mastery;
drop policy if exists quiz_attempts_teacher_read on public.quiz_attempts;

create or replace function public.teacher_student_summaries(p_class_id uuid)
returns table (
  student_id uuid,
  display_name text,
  lessons_completed bigint,
  assessed_topic_count bigint,
  assessed_mastery_average numeric,
  quiz_attempt_count bigint,
  quiz_awarded_marks numeric,
  quiz_maximum_marks numeric
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise insufficient_privilege using message = 'Sign in is required';
  end if;
  if not public.is_teacher() or not exists (
    select 1 from public.teacher_classes c
    where c.id = p_class_id and c.teacher_id = auth.uid()
  ) then
    raise insufficient_privilege using message = 'Teacher access to this class is required';
  end if;

  return query
  select
    m.user_id,
    p.display_name,
    (select count(*) from public.lesson_progress lp
      where lp.user_id = m.user_id and lp.completion_percentage >= 100),
    (select count(*) from public.topic_mastery tm
      where tm.user_id = m.user_id and tm.attempt_count > 0),
    (select round(avg(tm.mastery_score), 2) from public.topic_mastery tm
      where tm.user_id = m.user_id and tm.attempt_count > 0),
    (select count(*) from public.quiz_attempts qa
      where qa.user_id = m.user_id and qa.completed_at is not null),
    (select coalesce(sum(qa.awarded_marks), 0) from public.quiz_attempts qa
      where qa.user_id = m.user_id and qa.completed_at is not null),
    (select coalesce(sum(qa.maximum_marks), 0) from public.quiz_attempts qa
      where qa.user_id = m.user_id and qa.completed_at is not null)
  from public.class_memberships m
  join public.profiles p on p.id = m.user_id
  where m.class_id = p_class_id and m.role = 'student'
  order by p.display_name nulls last, m.user_id;
end
$$;

revoke all on function public.teacher_student_summaries(uuid) from public, anon;
grant execute on function public.teacher_student_summaries(uuid) to authenticated;

-- Submission ownership is split deliberately. A learner may draft and submit
-- an answer. Once submitted, answer, identity, assignment and timestamps are
-- immutable. A current class teacher may alter only marks, feedback, and the
-- submitted -> returned status transition.
create or replace function public.protect_submission_fields()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  caller_is_teacher boolean := false;
begin
  if tg_op = 'INSERT' then
    if new.teacher_feedback is not null or new.awarded_marks is not null then
      raise insufficient_privilege using message = 'Students cannot set marking fields';
    end if;
    if new.status not in ('not_started', 'submitted') then
      raise check_violation using message = 'A new submission must be not started or submitted';
    end if;
    if new.status = 'submitted' then
      new.submitted_at := now();
    else
      new.submitted_at := null;
    end if;
    return new;
  end if;

  select public.is_class_teacher(a.class_id) into caller_is_teacher
  from public.assignments a where a.id = old.assignment_id;

  if new.id is distinct from old.id
     or new.assignment_id is distinct from old.assignment_id
     or new.student_id is distinct from old.student_id
     or new.created_at is distinct from old.created_at then
    raise insufficient_privilege using message = 'Submission identity and assignment are immutable';
  end if;

  if caller_is_teacher then
    if old.status not in ('submitted', 'returned') then
      raise insufficient_privilege using message = 'Teachers may only mark submitted responses';
    end if;
    if new.content is distinct from old.content
       or new.submitted_at is distinct from old.submitted_at then
      raise insufficient_privilege using message = 'Teachers may not alter a learner answer';
    end if;
    if new.status is distinct from old.status
       and not (old.status = 'submitted' and new.status = 'returned') then
      raise check_violation using message = 'Teachers may only return a submitted response';
    end if;
    return new;
  end if;

  if new.teacher_feedback is distinct from old.teacher_feedback
     or new.awarded_marks is distinct from old.awarded_marks then
    raise insufficient_privilege using message = 'Students cannot alter marking fields';
  end if;

  if old.status <> 'not_started' then
    if new.content is distinct from old.content
       or new.status is distinct from old.status
       or new.submitted_at is distinct from old.submitted_at then
      raise insufficient_privilege using message = 'A submitted answer is immutable';
    end if;
    return new;
  end if;

  if new.status not in ('not_started', 'submitted') then
    raise check_violation using message = 'Students may only submit an unsubmitted response';
  end if;
  if new.status = 'submitted' then
    new.submitted_at := now();
  else
    new.submitted_at := null;
  end if;
  return new;
end
$$;

drop policy if exists submissions_teacher_update on public.assignment_submissions;
create policy submissions_teacher_update on public.assignment_submissions
  for update
  using (exists (
    select 1 from public.assignments a
    where a.id = assignment_id and public.is_class_teacher(a.class_id)
  ))
  with check (exists (
    select 1 from public.assignments a
    where a.id = assignment_id and public.is_class_teacher(a.class_id)
  ));

comment on function public.teacher_student_summaries(uuid) is
  'Returns only promised aggregate classroom progress for students in a class currently owned by the calling teacher.';
comment on function public.protect_submission_fields() is
  'Locks submitted answers and identity fields; current class teachers may set marks, feedback, and return submitted work.';
