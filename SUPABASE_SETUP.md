# Supabase setup

Accounts are optional. Everything in KINETIQ works signed out, with progress
kept in the browser. Turning Supabase on adds accounts, and makes a learner's
completed lessons follow them to any device they sign in on.

There is a guided version of this at `/setup` in the running app, which checks
each value against the real project as you paste it.

## Steps

1. Create a Supabase project and enable Email auth.
2. Run **both** migrations in the SQL editor, in filename order:
   - `supabase/migrations/20260808_phylab_foundation.sql` creates the 18 tables,
     the row-level security policies, and the trigger that gives every new
     account its profile and settings rows.
   - `supabase/migrations/20260822_lock_profile_role.sql` stops an account from
     editing its own role.
3. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in your deployment environment.
   These two reach the browser and are designed to: the anon key grants exactly
   what row-level security allows and nothing more. Never expose a service-role
   key this way.
4. For local static development, copy the URL and anon key into `public-env.js`
   on your machine. Do not commit populated values. For production, generate
   that public config during deployment.
5. Optional, for the admin dashboard only: set `SUPABASE_SERVICE_ROLE_KEY` and
   `ADMIN_EMAILS` in the server environment. The service-role key stays on the
   server and is never copied into `public-env.js`.

Guest progress already in a browser is upserted to the account on first sign-in,
so a learner who starts signed out does not lose the lessons they finished.

## How progress is stored

One row per learner per lesson in `lesson_progress`, with `unique(user_id,
lesson_slug)`. Row-level security is enabled on the table and the owner policy
is `user_id = auth.uid()`, so a signed-in learner can read and write their own
rows and no one else's.

Every part of the app reads completion through `progressService`, which answers
from the account when someone is signed in and from the device when they are
not. `tests/accountProgress.test.mjs` enforces that, because a module writing
completion directly to local storage fails silently: nothing errors, and the
work simply is not there on the next device.

## Validation

Create one student and one teacher. Verify that a student can read only their
own progress, that a teacher sees only class members through class
relationships, and that an unaffiliated account receives no rows.

Then, as a signed-in student: complete a lesson, sign in on a second browser,
and confirm `/progress` lists it as completed there too.
