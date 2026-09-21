-- Teacher mode with explicit roles, invitation-code joins and least-privilege
-- progress sharing. Joining a class is the learner's consent to share the
-- small progress summary below with that class's teacher.

create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('teacher', 'admin')
  )
$$;

create or replace function public.teaches_student(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teacher_classes c
    join public.class_memberships m on m.class_id = c.id
    where c.teacher_id = auth.uid() and m.user_id = target_user
  )
$$;

revoke all on function public.is_teacher() from public;
revoke all on function public.teaches_student(uuid) from public;
grant execute on function public.is_teacher() to authenticated;
grant execute on function public.teaches_student(uuid) to authenticated;

drop policy if exists classes_teacher on public.teacher_classes;
create policy classes_teacher_manage on public.teacher_classes
  for all
  using ((teacher_id = auth.uid() and public.is_teacher()) or public.is_admin())
  with check ((teacher_id = auth.uid() and public.is_teacher()) or public.is_admin());
create policy classes_member_read on public.teacher_classes
  for select
  using (exists (
    select 1 from public.class_memberships m
    where m.class_id = teacher_classes.id and m.user_id = auth.uid()
  ));

drop policy if exists memberships_member_or_teacher on public.class_memberships;
drop policy if exists memberships_self_join on public.class_memberships;
create policy memberships_read on public.class_memberships
  for select
  using (user_id = auth.uid() or public.is_class_teacher(class_id) or public.is_admin());
create policy memberships_teacher_insert on public.class_memberships
  for insert
  with check (public.is_class_teacher(class_id) or public.is_admin());
create policy memberships_teacher_update on public.class_memberships
  for update
  using (public.is_class_teacher(class_id) or public.is_admin())
  with check (public.is_class_teacher(class_id) or public.is_admin());
create policy memberships_leave_or_teacher on public.class_memberships
  for delete
  using (user_id = auth.uid() or public.is_class_teacher(class_id) or public.is_admin());

create or replace function public.join_class(p_join_code text)
returns table (joined_class_id uuid, joined_class_name text)
language plpgsql
security definer
set search_path = public
as $$
declare target public.teacher_classes%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  select * into target from public.teacher_classes
    where lower(join_code) = lower(trim(p_join_code)) limit 1;
  if target.id is null then raise exception 'Class code not found'; end if;
  if target.teacher_id = auth.uid() then raise exception 'You already teach this class'; end if;
  insert into public.class_memberships (class_id, user_id, role)
    values (target.id, auth.uid(), 'student')
    on conflict (class_id, user_id) do nothing;
  return query select target.id, target.name;
end
$$;
revoke all on function public.join_class(text) from public, anon;
grant execute on function public.join_class(text) to authenticated;

-- A teacher receives summary evidence only after a learner joins their class.
-- Question responses, bookmarks, conversations and revision notes stay private.
create policy lesson_progress_teacher_read on public.lesson_progress
  for select using (public.teaches_student(user_id));
create policy mastery_teacher_read on public.topic_mastery
  for select using (public.teaches_student(user_id));
create policy quiz_attempts_teacher_read on public.quiz_attempts
  for select using (public.teaches_student(user_id));
create policy profiles_teacher_read on public.profiles
  for select using (public.teaches_student(id));

drop policy if exists assignments_class_access on public.assignments;
drop policy if exists assignments_teacher_write on public.assignments;
create policy assignments_teacher_write on public.assignments
  for all
  using (public.is_class_teacher(class_id) or public.is_admin())
  with check (
    (public.is_class_teacher(class_id) and teacher_id = auth.uid())
    or public.is_admin()
  );
create policy assignments_student_read on public.assignments
  for select
  using (
    status = 'published'
    and exists (
      select 1 from public.class_memberships m
      where m.class_id = assignments.class_id and m.user_id = auth.uid()
    )
  );

-- Students own the answer portion of a submission. Marks and teacher feedback
-- remain teacher-owned even though both parties use the authenticated role.
create or replace function public.protect_submission_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_class_teacher((select class_id from public.assignments where id = new.assignment_id))
     or public.is_admin() then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    new.assignment_id := old.assignment_id;
    new.student_id := old.student_id;
    new.teacher_feedback := old.teacher_feedback;
    new.awarded_marks := old.awarded_marks;
  else
    new.teacher_feedback := null;
    new.awarded_marks := null;
  end if;
  return new;
end
$$;
drop trigger if exists submissions_protect_teacher_fields on public.assignment_submissions;
create trigger submissions_protect_teacher_fields
  before insert or update on public.assignment_submissions
  for each row execute function public.protect_submission_fields();

drop policy if exists submissions_student_or_teacher on public.assignment_submissions;
drop policy if exists submissions_student_write on public.assignment_submissions;
drop policy if exists submissions_student_update on public.assignment_submissions;
create policy submissions_read on public.assignment_submissions
  for select
  using (
    student_id = auth.uid()
    or exists (
      select 1 from public.assignments a
      where a.id = assignment_id and public.is_class_teacher(a.class_id)
    )
    or public.is_admin()
  );
create policy submissions_student_insert on public.assignment_submissions
  for insert
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.assignments a
      join public.class_memberships m on m.class_id = a.class_id
      where a.id = assignment_id and a.status = 'published' and m.user_id = auth.uid()
    )
  );
create policy submissions_student_update on public.assignment_submissions
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy submissions_teacher_update on public.assignment_submissions
  for update
  using (exists (
    select 1 from public.assignments a
    where a.id = assignment_id and public.is_class_teacher(a.class_id)
  ));

create index if not exists classes_teacher_idx on public.teacher_classes(teacher_id, created_at desc);
create index if not exists memberships_class_idx on public.class_memberships(class_id, created_at);
create index if not exists assignments_class_status_idx on public.assignments(class_id, status, due_at);
create index if not exists submissions_assignment_idx on public.assignment_submissions(assignment_id, status);
