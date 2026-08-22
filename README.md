# KINETIQ

A self-contained, interactive IBDP Physics learning platform built with vanilla HTML, CSS
and ES modules on a dependency-free Node server.

**Live: https://getkinetiq.vercel.app**

## What is in it

| | |
| --- | --- |
| Lessons | 26, in syllabus order across the five course units |
| Practice questions | 218 original, 43 of them multiple choice, 88 at HL |
| Applied cases | 19 real-world contexts |
| Command terms | 15, with method and model answers |
| Simulations | 26 labs, one per lesson, driven by the real equations |
| Formulae | 131, each with variables and meaning |

- **Course library** (`/library`) — all 26 lessons grouped into the five units
  (A Space, Time and Motion · B The Particulate Nature of Matter · C Wave Behaviour · D Fields ·
  E Nuclear and Quantum Physics),
  with search, unit filters, per-lesson completion and an overall progress ring.
- **Simulation studio** (`/simulations`) — 26 labs with sliders and number inputs, live
  answers in SI units, an animated marker that advances physical time, and play/pause/reset.
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

Thirteen suites: the physics engine against known cases, guest conversations, the
retrieval engine, the uncertainty maths against hand-worked results, practice marking
(partial credit and slip diagnosis), the weekly study plan, content cross-references,
the answer engine, progress export and import, the database schema (row-level security
and the locked role column), the admin endpoint's refusals, the whoami endpoint, and
privacy boundaries.

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

Students can sign in with Google or with an email and password. `/admin` shows
account totals, sign-ups over the last 30 days, which method people used, and the
newest accounts.

**Only the server decides who may see `/admin`.** The page holds no allowlist,
because anything decided in the browser can be read out of the bundle or bypassed
by calling the endpoint directly. Every request to `/api/admin/stats` re-verifies
the caller's token with Supabase and re-checks the address against `ADMIN_EMAILS`.

### Setup

Create a project at [supabase.com](https://supabase.com), open **Project Settings →
API**, then run:

```bash
npm run setup:accounts -- --url https://YOURPROJECT.supabase.co --anon ANON_KEY --service SERVICE_ROLE_KEY --admin you@gmail.com
```

That writes the browser-safe values to `public-env.js` and the secrets to a
git-ignored `.env`. It refuses to run if `.env` is not ignored, or if the two keys
are the same string.

Then two things happen outside this machine:

1. Run **both** migrations in the Supabase SQL editor, in filename order. The second
   closes a privilege escalation; without it any signed-in student can make themselves
   an administrator and read every other user's data.
2. Put the same four values into **Vercel → Settings → Environment Variables**:

   | Variable | Value |
   | --- | --- |
   | `SUPABASE_URL` | the same project URL |
   | `SUPABASE_ANON_KEY` | the same anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | **secret** — Project Settings → API → `service_role` |
   | `ADMIN_EMAILS` | your own address, comma-separated for more than one |

3. Turn on Google: in Supabase open **Authentication → Providers → Google**, enable
   it, and paste in a client ID and secret from
   [console.cloud.google.com](https://console.cloud.google.com). In the Google
   console, add `https://<your-project>.supabase.co/auth/v1/callback` as an
   authorised redirect URI, and your site's origin as an authorised JavaScript
   origin.
4. Redeploy. `GET /api/health` reports `adminConfigured`, and `/admin` will list
   exactly which variables are still missing until all four are set.

**The service-role key can read and modify every user in your project.** It belongs
only in the host's environment settings — never in `public-env.js`, never in the
repository, never in a browser. `npm test` fails if it appears in a client file.

## Enable KIT AI

KIT works with any one of four providers. Configure at least one; KINETIQ uses the first
configured provider, and if several are configured the learner can switch between them
from a selector in the AI workspace.

| Provider | Key | Default model | Override |
| --- | --- | --- | --- |
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

Without a key, `/ai` explains that no provider is configured and disables the message box.
Everything else works with no key at all.

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

- Supabase is fully wired but unconfigured, so progress is stored per browser. Filling in
  `public-env.js` with a project URL and anon key enables cross-device sync.
- Applied cases are uneven by unit: A has five, B and C four each, D and E three.
