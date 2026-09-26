# KINETIQ

A self-contained, interactive IBDP Physics learning platform built with vanilla HTML, CSS
and ES modules on a dependency-free Node server.

**Live: https://getkinetiq.vercel.app**

## What is in it

| | |
| --- | --- |
| Lessons | 26, in syllabus order across the five course units |
| Practice questions | 529 original, 321 of them multiple choice, 161 at HL |
| Applied cases | 19 real-world contexts |
| Command terms | 15, with method and model answers |
| Simulations | 26 labs, one per lesson, driven by the real equations |
| Visual models | 26 lesson-specific, labelled 3D viewers with front, left and right angles |
| Formulae | 131, each with variables and meaning |

- **Course library** (`/library`) — all 26 lessons grouped into the five units
  (A Space, Time and Motion · B The Particulate Nature of Matter · C Wave Behaviour · D Fields ·
  E Nuclear and Quantum Physics),
  with search, unit filters, per-lesson completion and an overall progress ring.
- **Simulation studio** (`/simulations`) — 26 labs with sliders and number inputs, live
  answers in SI units, an animated marker that advances physical time, and play/pause/reset.
- **Lesson visual models** — every lesson has its own labelled SVG concept model inside a
  keyboard-operable three-angle viewer. The front angle preserves undistorted graphs and
  equations, while left and right angles expose the spatial layers without changing the physics.
- **Data lab** (`/data`) — paste practical measurements, pick one of six linearisations, and
  get a scatter plot with error bars, a least-squares fit, and the gradient with its
  uncertainty from the steepest and shallowest lines. Judges whether an accepted value falls
  inside your range, and includes an uncertainty propagation calculator.
- **IA workspace** (`/ia`) — the scientific investigation in the six sections IB assesses,
  drafted locally, with each section checked against the weaknesses that cost marks.
- **Mistake bank** (`/mistakes`) — every question you have answered wrongly, collected
  automatically and rescheduled at 1, 3, 7, 16 and 35 days.
- **Revision planner** (`/revision`) — a week's plan built only from real state: elapsed
  flashcards, banked mistakes and unstarted lessons, ordered by what costs most to leave.
- **Personal notebook** (`/notebook`) — notes, lesson highlights and personal flashcards.
  Signed-in notebooks sync through the existing owner-only account store and remain hidden
  from teachers and other learners.
- **Connected activity** (`/activity`) — lessons, simulations, practice, revision, saved
  work and Ask KIT conversations in one chronological account timeline.
- **Study Studio** (`/studio`) — derivation steps, graph prediction, simulation comparison,
  unit conversion, practical planning, explanation practice, a scratchpad, focus timer,
  honest study calendar and collections. Reading controls, read-aloud support and a
  contextual mobile study dock are available across the learning journey.
- **Case practice** (`/cases`), **question patterns** (`/patterns`), **active toolkit**
  (`/toolkit`), **exam preparation hub** (`/exam-prep`), **source library** (`/resources`),
  **formula centre** (`/formulas`), a **quiz engine** with deterministic marking, and
  **KIT**, an AI tutor that answers from KINETIQ content first.

Every lesson graph and every simulation computes from the real equation. Nothing is a
stored curve.

## Run locally

```bash
npm start
```

Then visit `http://localhost:3000`. Running locally is also the only way to use a private
book, since `private/` never leaves your machine.

## Tests

```bash
npm test
```

The unit and integration suites cover physics calculations, retrieval, uncertainty,
assessment, adaptive learning, content cross-references, progress transfer, revision,
account isolation, row-level security, admin access, privacy boundaries and server
security.

```bash
npm run test:rls
```

Applies `supabase/migrations/` to a real Postgres and checks, as the role a
signed-in browser holds, that one student cannot read, write, edit or delete
another student's work, and cannot promote themselves to admin. Skips with a
message where no Postgres is available. `SUPABASE_SETUP.md` explains what each
check proves.

```bash
npm run test:e2e
```

The browser suite checks the main journeys across desktop and mobile viewports,
including navigation, lessons, practice, simulations, Ask KIT and account pages.
Playwright is a dev-only dependency; the shipped app has no runtime dependencies.

For a read-only capacity probe against the core public routes:

```bash
npm run test:load -- --base=http://127.0.0.1:3000 --requests=2000 --concurrency=1000
```

The probe reports status codes, throughput and p50/p95/p99 latency per route. Public
Vercel probes are capped at 50 concurrent requests to protect the live service. This
test does not measure signed-in database operations or paid AI-provider capacity; run
those against a dedicated staging project with test accounts before making a production
capacity claim.

`npm run test:all` runs all three.

## Publishing

The app is deployed on Vercel at **https://getkinetiq.vercel.app**, which runs `server.js`
itself rather than serving a static copy. That means real URLs, a live content API, and the
AI tutor all work from one deployment. Pushing to `master` redeploys automatically.

`server.js` binds a port only when it is the entry point and exports its handler otherwise,
so the same file runs under `npm start`, in Docker, and as a serverless function.

A static, server-free copy can still be produced if you ever want one — `npm run build`
for a GitHub Pages layout, `npm run build:netlify` for a root-served one — but neither is
published, and neither can run the tutor.

## Accounts and the admin dashboard

Students sign in with Google or Apple. KINETIQ stores no password of its own, so
there is nothing to reset and no confirmation email to wait for: the first time a
provider returns a student, the account is created and the database trigger gives
it a profile.

A provider button is drawn only when that provider is actually enabled in the
Supabase project. Google is free. Apple needs a paid Apple Developer account, so
its button stays hidden until someone enables it, and Google alone is enough to
launch.

`/admin` shows account totals, sign-ups over the last 30 days, which method people
used, and the newest accounts.

**Only the database decides who may see `/admin`.** The page holds no allowlist,
because anything decided in the browser can be read out of the bundle or bypassed
by calling the endpoint directly. Every request forwards the signed-in token to a
restricted Supabase function, which checks the account's administrator role before
returning account information.

### Setup

Create a project at [supabase.com](https://supabase.com), open **Project Settings →
API**, then run:

```bash
npm run setup:accounts -- --url https://YOURPROJECT.supabase.co --anon ANON_KEY
```

That writes the project URL and browser-safe anon key to the local configuration.

Then two things happen outside this machine:

1. Run **both** migrations in the Supabase SQL editor, in filename order. The second
   closes a privilege escalation; without it any signed-in student can make themselves
   an administrator and read every other user's data.
2. Put the same two values into **Vercel → Settings → Environment Variables**. This is
   the only step the live site needs — the browser reads the two public ones from
   `/api/config`, so no file has to be edited or redeployed by hand:

   | Variable | Value |
   | --- | --- |
   | `SUPABASE_URL` | the same project URL |
   | `SUPABASE_ANON_KEY` | the same anon key |

3. Turn on Google: in Supabase open **Authentication → Providers → Google**, enable
   it, and paste in a client ID and secret from
   [console.cloud.google.com](https://console.cloud.google.com). In the Google
   console, add `https://<your-project>.supabase.co/auth/v1/callback` as an
   authorised redirect URI, and your site's origin as an authorised JavaScript
   origin.
4. Run the administrator migration, then assign the owner profile the `admin` role
   from the Supabase SQL editor. Redeploy. `GET /api/health` reports
   `adminConfigured`, and `/admin` remains inaccessible to every non-admin account.

KINETIQ does not require an elevated database key in its deployment environment.
Role checks run inside restricted database functions and still respect the signed-in
user's identity.

## Enable KIT AI

KIT works through Vercel AI Gateway or four direct providers. A Vercel production
deployment receives `VERCEL_OIDC_TOKEN` automatically, so Gateway authentication never
needs to enter browser code. Elsewhere, configure at least one key. KINETIQ tries
`AI_PROVIDER` first when set, then automatically tries the other configured providers.
The public Ask KIT page keeps the source-cited answer and generative tutor together, with
automatic fallback to KINETIQ course material if every provider fails.

| Provider | Key | Default model | Override |
| --- | --- | --- | --- |
| Vercel AI Gateway | `AI_GATEWAY_API_KEY` or automatic Vercel OIDC | `openai/gpt-5.6-sol` | `AI_GATEWAY_MODEL` |
| Groq | `GROQ_API_KEY` | `llama-3.3-70b-versatile` | `GROQ_MODEL` |
| OpenAI | `OPENAI_API_KEY` | `gpt-5.6-sol` | `OPENAI_MODEL` |
| Anthropic | `ANTHROPIC_API_KEY` | `claude-sonnet-5` | `ANTHROPIC_MODEL` |
| Google Gemini | `GEMINI_API_KEY` | `gemini-2.5-flash` | `GEMINI_MODEL` |

```bash
cp .env.example .env
# put your key on the matching line, then:
npm start
```

`GET /api/health` reports which providers are configured. If a key is present but rejected,
`/api/chat` says so explicitly rather than passing through the provider's wording — a key
that has been deleted or only partly pasted is the usual cause.

Keys are read from the server environment only. They never reach the browser, and `.env` is
git-ignored. On a host, set the variables in that service's environment settings instead of
committing a file. `npm test` fails if a key pattern appears in any tracked file.

`/ask` is the public KIT experience and works without an AI provider key. When a provider
is configured, learners can choose **AI tutor** on that same page. The legacy `/ai` URL
opens the same unified experience. Everything else works with no key at all.

## Study from your own book

KIT can answer from a coursebook or set of notes **you own**, alongside KINETIQ's own
content. The book is indexed locally and stays that way.

```bash
mkdir -p private/books
# put the file in private/books/, then:
npm run ingest -- "private/books/your-coursebook.pdf" --title "Book name"
```

Restart the server. `GET /api/health` lists `privateSources` by title and passage count, and
KIT cites matching passages as `Your source — p.N`.

PDF text extraction uses the PDFKit bridge in macOS's system Python, so there is nothing to
install. A scanned PDF with no embedded text layer needs OCR first; the tool says so when it
finds none.

**This never leaves your machine.** `private/` is git-ignored, so it is not in the
repository and no host can receive it. The extracted text is not part of `data/`, is not
served by `/api/content/index`, and is not copied into either static build — it reaches only
the retrieval engine that builds KIT's prompt. `.dockerignore` excludes it from container
images. `tests/privacy.test.mjs` enforces every one of those boundaries.

Only index material you are entitled to use, and keep it to personal study.

## Always-on hosting with AI

A static host cannot run KIT. For a public URL with the tutor working, deploy the Node app:

- **Render** — `render.yaml` is configured for the free plan. Add one provider key in the
  service's environment settings.
- **Vercel** — `vercel.json` is configured. `server.js` binds a port only when it is the
  entry point and exports its handler otherwise, so the same file runs as a long-lived
  server, in Docker, and as a serverless function.

The server listens on the host-provided `PORT`, exposes `/api/health` for health checks, and
binds externally only in production.

## On copyright

The practice bank is original KINETIQ material. KINETIQ deliberately does not host the IB
data booklet, past papers, mark schemes or coursebooks, and the private book feature is
local-only for the same reason.

## Next

- Supabase and Google sign-in are configured on the live Vercel deployment. Local copies
  need their own ignored `.env` values. Apple sign-in remains intentionally deferred.
- Read-only production traffic has passed a 1,000-request test, but 1,000 simultaneous
  signed-in learners have not been certified by an authenticated load test.
- Source-cited Ask KIT works without a paid model. Generative answers remain dependent on
  whichever optional provider has free or paid quota available.
- Applied cases are uneven by unit: A has five, B and C four each, D and E three.
