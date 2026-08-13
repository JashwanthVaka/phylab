# Supabase setup

1. Create a Supabase project and enable Email auth.
2. Run `supabase/migrations/20260808_kinetiq_foundation.sql` in the SQL editor or with the Supabase CLI.
3. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in your deployment environment. These browser values are safe only with the included RLS policies; never expose a service-role key.
4. For local static development, copy the URL and anon key into `public-env.js` locally; do not commit populated values. For production, generate this public config during deployment.
5. Set the same URL/key in your application config. Existing guest progress remains in localStorage and is upserted on first signed-in migration.

## Validation

Create one student and one teacher. Verify a student can read only their own progress, a teacher sees only class members through class relationships, and an unaffiliated account receives no rows.
