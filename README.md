# PHYLAB

A self-contained, interactive IBDP Physics learning platform. It includes the complete syllabus map requested in the project brief, a topic/lesson experience, formula reference, student dashboard, an OpenAI-powered AI tutor, original exam practice bank and three live canvas simulations.

## Run locally

```bash
cd /Users/jashu/Desktop/phylab
npm start
```

Then visit `http://localhost:3000`.

## Enable PHY AI

1. Create an OpenAI API key.
2. Copy `.env.example` to a secure environment-variable configuration (or export the variable before starting locally).
3. Set `OPENAI_API_KEY` in your host’s Environment Variables; do not put it in `app.js`, `index.html`, or a public `.env` file.

The server sends chat requests to the Responses API using `gpt-5.6-sol` with high reasoning effort by default. PHY is physics-aware, preserves short conversation history, can answer general off-topic questions, keeps keys server-side, rate limits requests, and does not store chat requests in the OpenAI request.

```bash
export OPENAI_API_KEY="your_key_here"
npm start
```

## Keep it online 24/7

For actual 24/7 availability, deploy the Node application to a host such as Render, Railway, Fly.io, Vercel, or a VPS. Add `OPENAI_API_KEY` in the provider’s Environment Variables and use this start command:

```bash
npm start
```

Your own computer can also run it continuously, but it must remain powered on and connected to the internet. Configure a usage alert and rate limits before sharing the site publicly.

The practice bank contains original PHYLAB questions. Do not publicly upload or redistribute copyrighted IB past papers or markschemes; instead, link signed-in students to school-licensed materials held in a private storage bucket.

For a multi-user production version, replace the prototype data in `app.js` with Supabase/Postgres content, add Supabase Auth, and store per-student progress and approved private paper links in authenticated storage.
