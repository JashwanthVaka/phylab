# PHYLAB

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
  deterministic marking, and **PHY**, an AI tutor that answers from PHYLAB content first.

## Run locally

```bash
cd /Users/jashu/Desktop/phylab
npm start
```

Then visit `http://localhost:3000`.

## Enable PHY AI

PHY works with any one of four providers. Configure at least one; PHYLAB uses the first
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

Without any key, PHY explains on `/ai` that no provider is configured and how to add one.
Every other part of PHYLAB — lessons, formulae, graphs, simulations and quizzes — works
with no AI key at all.

## Keep it online 24/7

PHYLAB is container-ready for an always-on Render deployment. The included `render.yaml` deliberately uses Render's paid Starter plan: free web services sleep after inactivity and do not meet a 24/7 requirement.

1. Push this repository to GitHub.
2. In [Render](https://render.com), select **New → Blueprint** and connect `JashwanthVaka/phylab`.
3. Render will detect `render.yaml`; approve the `phylab` service.
4. In the service environment settings, add one of `GROQ_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` only if you want PHY AI. Leave them absent for the rest of PHYLAB to work without AI.
5. Deploy. Render provides a permanent HTTPS URL and automatically redeploys when you push changes to GitHub.

The service listens on the host-provided `PORT`, exposes `/api/health` for health checks, and binds externally only in production. Your computer does not need to remain on after deployment.

The practice bank contains original PHYLAB questions. Do not publicly upload or redistribute copyrighted IB past papers or markschemes; instead, link signed-in students to school-licensed materials held in a private storage bucket.

For a multi-user production version, replace the prototype data in `app.js` with Supabase/Postgres content, add Supabase Auth, and store per-student progress and approved private paper links in authenticated storage.
