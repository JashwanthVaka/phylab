# KINETIQ

A self-contained, interactive IBDP Physics learning platform built with vanilla HTML, CSS
and ES modules on a dependency-free Node server.

- **Course library** — all 19 lessons in syllabus order, grouped into the four IB units
  (A Space, Time and Motion · B The Particulate Nature of Matter · C Wave Behaviour · D Fields),
  with search, unit filters, per-lesson completion and an overall progress ring.
- **Simulation studio** — 10 labs driven by the real equations, each with sliders and number
  inputs, live answers in SI units, an animated graph marker that advances physical time, and
  play/pause/reset.
- **Case practice** — 19 real-world contexts with the physics involved, worked short questions,
  an exam-style prompt and common mistakes.
- **Question patterns** — how to answer 15 IB command terms, each with a method, mistakes and
  a model answer.
- **Active toolkit** — five reusable methods for numerical, graph, data, practical and
  extended-response questions.
- **Exam preparation hub**, **source library**, **formula centre**, **quiz engine** with
  deterministic marking, and **KIT**, an AI tutor that answers from KINETIQ content first.

## Live site

The static build is published at **https://jashwanthvaka.github.io/phylab/** from `docs/`
on the default branch. Everything works there except the AI tutor, which needs the Node
server and an API key. Rebuild it with `npm run build` and push.

## Run locally

```bash
cd /Users/jashu/Desktop/kinetiq
npm start
```

Then visit `http://localhost:3000`.

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

1. Copy `.env.example` to `.env` (already git-ignored) and fill in the key you have.
2. Restart the server. `GET /api/ai/providers` reports which providers are usable — it
   returns variable *names* and configured/not-configured flags, never key values.
3. Set `AI_PROVIDER` to force one provider regardless of which keys are present.

```bash
cp .env.example .env
# edit .env, then:
npm start
```

Keys are read from the server environment only. They are never sent to the browser, never
written into `app.js`, `index.html`, or `public-env.js`, and `.env` is git-ignored. On a
host such as Render, set the variables in the service's Environment settings instead of
committing a file.

Without any key, KIT explains on `/ai` that no provider is configured and how to add one.
Every other part of KINETIQ — lessons, formulae, graphs, simulations and quizzes — works
with no AI key at all.

## Keep it online 24/7

KINETIQ is container-ready for an always-on Render deployment. The included `render.yaml` deliberately uses Render's paid Starter plan: free web services sleep after inactivity and do not meet a 24/7 requirement.

1. Push this repository to GitHub.
2. In [Render](https://render.com), select **New → Blueprint** and connect `JashwanthVaka/kinetiq`.
3. Render will detect `render.yaml`; approve the `kinetiq` service.
4. In the service environment settings, add one of `GROQ_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` only if you want KIT AI. Leave them absent for the rest of KINETIQ to work without AI.
5. Deploy. Render provides a permanent HTTPS URL and automatically redeploys when you push changes to GitHub.

The service listens on the host-provided `PORT`, exposes `/api/health` for health checks, and binds externally only in production. Your computer does not need to remain on after deployment.

The practice bank contains original KINETIQ questions. Do not publicly upload or redistribute copyrighted IB past papers or markschemes; instead, link signed-in students to school-licensed materials held in a private storage bucket.

For a multi-user production version, replace the prototype data in `app.js` with Supabase/Postgres content, add Supabase Auth, and store per-student progress and approved private paper links in authenticated storage.
