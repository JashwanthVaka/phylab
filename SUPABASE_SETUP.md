# Supabase setup

Accounts are optional. Everything in KINETIQ works signed out, with progress
kept in the browser. Turning Supabase on adds accounts, and makes a learner's
completed lessons follow them to any device they sign in on.

This file is the whole guide. There used to be a `/setup` page inside the app
that walked through it, but publishing a site's configuration steps to anyone
who visits is not something a public site should do, so it was removed.

## Steps

1. Create a Supabase project. Enable **Google** under Authentication → Providers.
   Apple is optional and needs a paid Apple Developer account; until it is
   enabled, its button is not shown. Email auth is not used: KINETIQ signs
   people in through a provider and holds no password of its own.
2. Run **both** migrations in the SQL editor, in filename order:
   - `supabase/migrations/20260808_phylab_foundation.sql` creates the 18 tables,
     the row-level security policies, and the trigger that gives every new
     account its profile and settings rows.
   - `supabase/migrations/20260822_lock_profile_role.sql` stops an account from
     editing its own role.
3. Under **Authentication → Providers → Google**, Google asks for two values.
   The **authorised redirect URI** is your project URL with `/auth/v1/callback`
   on the end, which Supabase also prints on that same screen:

   ```
   https://YOURPROJECT.supabase.co/auth/v1/callback
   ```

   The **authorised JavaScript origin** is your site, with no path:

   ```
   https://getkinetiq.vercel.app
   ```

   Make the client ID and secret at
   [console.cloud.google.com](https://console.cloud.google.com/apis/credentials)
   under **Create credentials → OAuth client ID → Web application**.

4. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in your deployment environment.
   These two reach the browser and are designed to: the anon key grants exactly
   what row-level security allows and nothing more. Never expose a service-role
   key this way.
5. For local static development, copy the URL and anon key into `public-env.js`
   on your machine. Do not commit populated values. For production, generate
   that public config during deployment.
6. Optional, for the admin dashboard only: set `SUPABASE_SERVICE_ROLE_KEY` and
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

`tests/accountIsolation.test.mjs` runs the account path itself against a
stand-in for Supabase that applies the same `user_id = auth.uid()` rule the
database does. It checks that writes carry the signed-in user id, that one
learner never sees another's completions, that repeating a completion updates
a single row rather than adding another, and that work done signed out is
carried into the account on first sign-in.

That proves KINETIQ scopes the reads and writes it makes. It is a different
claim from what the database does with a request that is not well behaved, and
only the database can answer that one.

## Verifying row-level security for real

```
npm run test:rls
```

This starts a Postgres, applies `supabase/migrations/` to it unmodified, and
runs nine checks as `authenticated`, the role a signed-in browser holds. The
role matters more than anything else here: run as the table owner or a
superuser and row-level security is bypassed entirely, so the checks would
pass while every student read every other student's work.

It answers, against a real database:

- each student sees only their own progress, including when they ask for
  another student's rows by id
- a student cannot write a row under another student's id
- a student cannot update or delete another student's work
- profiles are private, and a signed-out visitor gets nothing at all
- a student cannot promote themselves to `admin`, which would otherwise open
  every policy through `is_admin()` and hand them everybody's work

The checks were mutation-tested rather than trusted for passing: disabling
row-level security on `lesson_progress` fails four of them, widening the owner
policy to "any signed-in user" fails four, and dropping the role-lock triggers
fails the escalation check.

`tests/rls/supabase-shim.sql` supplies only the parts of Supabase the
migrations depend on: `auth.users`, and `auth.uid()` reading the same setting
Supabase populates from the JWT. It skips with a clear message where no
Postgres is available, so it never reports a pass it did not earn.

## Validation against your own project

Create one student and one teacher. Verify that a student can read only their
own progress, that a teacher sees only class members through class
relationships, and that an unaffiliated account receives no rows.

Then, as a signed-in student: complete a lesson, sign in on a second browser,
and confirm `/progress` lists it as completed there too.

## Shared devices

A class often shares a laptop, so signing out has to hand the machine over
clean. On sign-out KINETIQ moves anything still held on the device into the
account it belongs to, and only then removes the device copy. If that move
fails, the work is kept and the person is told, because a dropped connection
must not destroy the only copy of somebody's study.

## Checking a provider is really on

Supabase publishes which providers are enabled, so you can confirm it without
attempting a sign-in. Replace both values and open it in a browser:

```
https://YOURPROJECT.supabase.co/auth/v1/settings?apikey=YOUR_ANON_KEY
```

`external.google` should be `true`. The sign-in page reads exactly this, which
is why a provider that is off shows no button at all rather than a button that
fails.
