-- Read paths used by the signed-in dashboard and cross-device practice restore.
-- RLS remains the authorization boundary; these indexes only keep each
-- account-scoped query responsive as learner history grows.
create index if not exists quiz_attempts_user_created_idx
  on public.quiz_attempts(user_id, created_at desc, id);
create index if not exists question_attempts_user_created_idx
  on public.question_attempts(user_id, created_at desc, id);
create index if not exists topic_mastery_user_score_idx
  on public.topic_mastery(user_id, mastery_score, attempt_count);
create index if not exists bookmarks_user_created_idx
  on public.bookmarks(user_id, created_at desc, id);
create index if not exists study_sessions_user_created_idx
  on public.study_sessions(user_id, created_at desc, id);
