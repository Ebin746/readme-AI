# ReadmeAi — AI-Powered README Generator 🚀

Generate publication-quality README.md files by analyzing a GitHub repository. ReadmeAi runs as a Next.js app with a GraphQL API, background job processing, and Google Generative AI for high-quality natural language generation.

---

## Table of Contents
- ✅ Features
- ⚙️ Quick start
- 🔐 Required environment variables
- 🧭 Architecture & how it works
- 💡 Usage (GraphQL examples)
- 🔧 Rate limiting & per-device quota
- 🚀 Deployment (Vercel)
- 🛠 Development tips & troubleshooting
- 🛣 Roadmap / Improvements
- 🤝 Contributing
- 📄 License

---

## ✅ Features
- AI-driven README generation using Google Generative AI (Gemini models) ✍️
- Background job manager + real-time progress updates via Supabase ✔️
- Per-device daily quota (default: 5/day) enforced via Upstash Redis ⏱️
- GraphQL API for starting jobs, getting status, and checking quota 📡

---

## ⚙️ Quick start

1. Clone
```bash
git clone https://github.com/<your-org>/readme-AI.git
cd readme-AI/readme-Ai
```

2. Install
```bash
npm install
```

3. Add environment variables (see next section) to `.env.local`.

4. Local development
```bash
npm run dev
# Open http://localhost:3000
```

5. Build & start (production)
```bash
npm run build
npm start
```

---

## 🔐 Required environment variables
Create `.env.local` and add:

```env
# Supabase (real-time updates + storage)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Generative AI
GOOGLE_API_KEY=your-google-api-key

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL=https://<id>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<upstash-token>
```

> Tip: For Vercel, set the same values in project Environment Variables.

---

## 🧭 Architecture & how it works
- Next.js app (React) front-end with a GraphQL endpoint at `/api/graphql` (Apollo Server).
- When a README generation is requested:
  - A job is started (`startReadmeJob`) and stored/processed by `jobManger.ts`.
  - Worker code uses the Google Generative AI client in `readmeGenerator.ts` to create README content from repo files.
  - Progress updates are published via Supabase and read by the client in real time.
- Rate limiting:
  - Implemented in `src/app/lib/ratelimit.ts` using Upstash Redis.
  - Per-device quota is used (device cookie `rm_device_id` is created client-side).

---

## 💡 Usage (GraphQL examples)

- Get API usage:
```graphql
query GetApiUsage {
  userApiUsage {
    remaining
    limit
    reset
  }
}
```

- Start a README generation:
```graphql
mutation StartReadmeJob($repoUrl: String!) {
  startReadmeJob(repoUrl: $repoUrl) {
    success
    jobId
    error
  }
}
# variables: { "repoUrl": "https://github.com/username/repo" }
```

- Poll or subscribe to job status:
```graphql
query ReadmeJob($jobId: String!) {
  readmeJob(jobId: $jobId) {
    jobId
    status
    progress
    content
    error
  }
}
```

---

## 🔧 Rate limiting & per-device quota ⚠️
- Default: **5 daily README generations per device** (24-hour window).
- Device id stored in a cookie named `rm_device_id` (set by the app). If multiple devices share an IP, they get separate quotas because the primary key is `device:<deviceId>`.
- If you hit the quota:
  - Delete your device cookie to create a new device id (not recommended for normal use).
  - Or delete the device's Redis key from Upstash to reset the counter (see troubleshooting).

Reset a specific key (example Node snippet):
```js
// quick script (requires UPSTASH env vars)
import { Redis } from '@upstash/redis';
const r = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
await r.del("rate_limit:device:<deviceId>");
```

---

## 🚀 Deployment (Vercel)
1. Push branch to GitHub.
2. Import project into Vercel.
3. Configure Environment Variables (same as `.env.local`).
4. Deploy — Vercel will run `npm run build`.

---

## 🛠 Development tips & troubleshooting
- If GraphQL returns quota errors, check the `userApiUsage` response to view `remaining` and `reset`.
- If realtime updates fail, ensure Supabase keys are correct and the project has Postgres + Realtime enabled.
- Missing Google key → generation fails. Verify `GOOGLE_API_KEY`.
- If you previously used Clerk or other auth and removed it, confirm no references remain in `src/app/layout.tsx` and `package.json`.

---

## 🛣 Roadmap / Improvements
- Add optional account-based quotas (per-user limits) with authentication (Supabase auth or external provider).
- Support other LLM providers (OpenAI, Anthropic) via plug-in model wrappers.
- Add more robust error reporting and retry logic for long-running generation jobs.
- Add end-to-end tests for GraphQL resolvers and job lifecycle.

---

## 🤝 Contributing
- Fork, add a branch, open a PR.
- Keep changes small and focused; include tests where applicable.
- Please run `npm run lint` and ensure TypeScript checks pass.

---

## 📄 License
MIT — see LICENSE file.

---

If you'd like, I can:
- Commit this README as `README.md` in the repo, or
- Generate an example README using the project's own generator to showcase its output (meta!).

Which would you prefer next? ✅