# AI Chatbot Analysis Tool

A Next.js full-stack web application for mass data analysis of AI chatbot conversations, identifying hallucinations and other response quality issues. Built for CSC491 by The pAInters.

## Features

- 🔐 **Authentication** — email/password sign-up and login (NextAuth.js v5)
- 🚀 **Drag-and-drop file upload** with JSON validation
- 🤖 **Gemini LLM analysis** — one prompt per conversation, structured JSON output
- 🔍 **Hallucination detection**: self-contradictions, overconfidence, fabricated citations, unverified facts
- ⚠ **Numerical impact highlighting** — flags specific dollar amounts, percentages, and dates in flagged turns
- 📊 **Interactive dashboard** with hallucination rate, confidence scores, issue breakdown, and per-turn cards
- 💾 **Per-user data isolation** — each account sees only their own uploads
- ⚡ **Real-time processing status** page with progress polling

### Planned Future Analysis Types

- ⚖️ **Gender Bias Detection** — flag differential treatment based on user gender cues
- 🚨 **Toxicity Detection** — identify harmful or inappropriate assistant responses

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL (Neon) via Prisma 7 |
| File storage | Vercel Blob |
| LLM | Google Gemini (`@google/generative-ai`) |
| Auth | NextAuth.js v5 — email/password, JWT sessions, bcrypt |

## Getting Started

### Prerequisites

- Node.js v18+
- A Google Gemini API key (free tier: [aistudio.google.com](https://aistudio.google.com))
- A Neon PostgreSQL database ([neon.tech](https://neon.tech))
- A Vercel Blob store token (or deploy to Vercel where it's auto-injected)

### Installation

```bash
npm install
```

### Environment variables

Create a `.env.local` file in the project root:

```
DATABASE_URL=your_neon_postgres_connection_string
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
NEXTAUTH_SECRET=your_random_secret   # generate: openssl rand -base64 32
```

### Database setup

```bash
npx prisma migrate dev --name init   # first-time setup
npx prisma generate                  # regenerate client after schema changes
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login` — create an account first.

## Input Data Format

Upload a `.json` file containing an array of conversation turns:

```json
[
  { "id": "user",      "content": "Hello, what plans do you offer?" },
  { "id": "assistant", "content": "We have several plans available..." }
]
```

Three sample files are included for testing: `sample-telus-clean.json`, `sample-telus-one-hallucination.json`, `sample-telus-many-hallucinations.json`.

## Application Flow

1. **Sign up / Log in** → `/login` or `/signup`
2. **Upload** → drag-and-drop a JSON file at `/upload`
3. **Processing** → `/processing/[id]` polls for status while Gemini analysis runs server-side
4. **Dashboard** → `/dashboard/[id]` shows hallucination rate, issue breakdown, and per-turn flagged cards

> **Note:** Because Gemini analysis runs synchronously inside the `/api/upload` function (required by Vercel's serverless model), the processing page currently shows a simulated progress animation while polling for the completed status rather than true real-time sub-step progress. This is a known limitation — see [Known Issues](#known-issues) below.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/upload` | Required | Upload file + run Gemini analysis → `{ uploadId }` |
| `GET`  | `/api/upload/[id]` | Required | Get upload status + analyses (own uploads only) |
| `GET`  | `/api/uploads` | Required | List all uploads for the logged-in user |
| `POST` | `/api/auth/register` | Public | Create a new account |
| `GET/POST` | `/api/auth/[...nextauth]` | Public | NextAuth.js session endpoints |

## Known Issues

### Processing page shows simulated progress, not real-time analysis steps

**Root cause:** Vercel serverless functions cannot stream incremental progress back to the client. The Gemini analysis runs synchronously inside `/api/upload` (with a 60-second timeout), meaning the HTTP response isn't returned until the full analysis is complete. The `/processing/[id]` page polls `/api/upload/[id]` every 2 seconds and animates a fake progress bar — it only knows "pending → processing → completed/failed", not which internal step is running.

**Impact:** Users see an animated progress bar that doesn't reflect actual analysis progress. The experience still works correctly end-to-end — it just isn't as informative as it could be.

**Potential solutions to explore:**
- Use [Vercel AI SDK streaming](https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol) to stream partial results
- Move analysis to a background job queue (e.g. Inngest, Trigger.dev, or a Vercel Cron + separate worker)
- Stream server-sent events (SSE) from the upload function and consume them on the processing page
- Use Next.js Server-Sent Events or WebSocket support (requires a non-serverless deployment)

## Project Structure

```
app/
  page.tsx                    # Home page
  login/page.tsx              # Login form
  signup/page.tsx             # Sign-up form
  upload/page.tsx             # Drag-and-drop file upload
  processing/[id]/page.tsx    # Polling status page (simulated progress)
  dashboard/[id]/page.tsx     # Hallucination analysis dashboard
  uploads/page.tsx            # Past uploads list
  api/
    upload/route.ts           # POST: upload + Gemini analysis (synchronous)
    upload/[id]/route.ts      # GET: upload status + results (auth + ownership)
    uploads/route.ts          # GET: list uploads for current user
    auth/[...nextauth]/       # NextAuth.js route handler
    auth/register/            # POST: create new account
lib/
  prisma.ts                   # Prisma client singleton (Neon adapter)
  gemini.ts                   # Gemini client, prompt builder, and types
  auth.ts                     # NextAuth.js config (Credentials provider)
proxy.ts                      # Route protection middleware
prisma/
  schema.prisma               # DB schema (User, Upload, Analysis)
  migrations/                 # Migration history
sample-telus-clean.json
sample-telus-one-hallucination.json
sample-telus-many-hallucinations.json
```

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```
