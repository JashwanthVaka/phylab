# KINETIQ

A self-contained, interactive IBDP Physics learning platform built with vanilla HTML, CSS
and ES modules on a dependency-free Node server.

**Live: https://jashwanthvaka.github.io/phylab/**

## What is in it

| | |
| --- | --- |
| Lessons | 19, in syllabus order across the four IB units |
| Practice questions | 71 original, 21 of them multiple choice |
| Applied cases | 19 real-world contexts |
| Command terms | 15, with method and model answers |
| Simulations | 10 labs driven by the real equations |
| Formulae | 62, each with variables and meaning |

- **Course library** (`/library`) — all 19 lessons grouped into the four IB units
  (A Space, Time and Motion · B The Particulate Nature of Matter · C Wave Behaviour · D Fields),
  with search, unit filters, per-lesson completion and an overall progress ring.
- **Simulation studio** (`/simulations`) — 10 labs with sliders and number inputs, live
  answers in SI units, an animated marker that advances physical time, and play/pause/reset.
- **Data lab** (`/data`) — paste practical measurements, pick one of six linearisations, and
  get a scatter plot with error bars, a least-squares fit, and the gradient with its
  uncertainty from the steepest and shallowest lines. Judges whether an accepted value falls
  inside your range, and includes an uncertainty propagation calculator.
- **IA workspace** (`/ia`) — the scientific investigation in the six sections IB assesses,
  drafted locally, with each section checked against the weaknesses that cost marks.
- **Mistake bank** (`/mistakes`) — every question you have answered wrongly, collected
  automatically and rescheduled at 1, 3, 7, 16 and 35 days.
- **Revision planner** (`/revision`) — what is genuinely due today across flashcards and
  the mistake bank.
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

Then visit `http://localhost:3000`. This is the only way to use KIT, since the tutor needs
a server to hold the API key.

## Tests

```bash
npm test
```

Six suites: the physics engine against known cases, guest conversations, the retrieval
engine, the uncertainty maths against hand-worked results, content cross-references
(every case and pattern link resolves to a real lesson or simulation), and privacy
boundaries.

## Publishing

Two static targets are built from the same source. The Node app in the repo root stays the
source of truth; both builds are server-free copies of it.

```bash
npm run build           # -> docs/  for GitHub Pages
npm run build:netlify   # -> dist/  for Netlify
```

GitHub Pages serves from `/<repo>/` and cannot rewrite unknown paths, so that build uses
relative assets and routes on the hash. Netlify serves from the root and supports rewrites,
so that build uses real paths and clean URLs like `/data` and `/ia`.

`netlify.toml` and `render.yaml` are both configured. Neither the AI tutor nor a private
book is available on a static host — see below.

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

- Rigid Body Mechanics and Electromagnetic Induction have no interactive graph model yet
  and fall back to a decorative curve.
- Supabase is fully wired but unconfigured, so progress is per-browser. Filling in
  `public-env.js` enables cross-device sync.
- There is no service worker, so the app does not work offline.
