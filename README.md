# AI Chatbot Analysis Tool

A Next.js full-stack web application for mass data analysis of AI chatbot conversations, identifying hallucinations, bias, and toxicity. Includes a live customer-facing chatbot with automatic post-session analysis and analyst email alerts. Built for CSC491 by The pAInters.

## Features

- **Authentication** — email/password sign-up and login (NextAuth.js v5)
- **Live chatbot** — public customer-facing chat interface powered by Groq Llama; no login required
- **Automatic chat analysis** — when a chat session ends, hallucination/bias/toxicity analysis runs automatically and analyst alert emails are sent
- **Drag-and-drop file upload** — upload JSON conversation files for batch analysis
- **Multi-provider LLM analysis** — Gemini (balanced), Groq/Llama (faster), or Both (deeper cross-check)
- **Hallucination detection** — self-contradictions, overconfidence, fabricated citations, hardcoded facts
- **Bias detection** — gender, racial, age bias and stereotyping
- **Toxicity detection** — hostile language, condescension, inappropriate content, profanity
- **Interactive dashboard** — tabbed UI with KPI cards, issue breakdown, executive summary, and per-turn flagged cards
- **Ground truth library** — upload reference documents to improve analysis accuracy; built-in Telus telecom facts included
- **Per-user data isolation** — each account sees only their own uploads and analyses
- **Analyst alert emails** — configure an alert email in Settings to receive notifications when chat sessions are analyzed

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL (Neon) via Prisma 7 |
| File storage | Vercel Blob |
| LLM (analysis) | Google Gemini (`@google/generative-ai`) and/or Groq Llama (`groq-sdk`) |
| LLM (chatbot) | Groq Llama (`groq-sdk`) |
| Email | Resend (`resend`) |
| Auth | NextAuth.js v5 — email/password, JWT sessions, bcrypt |

## Getting Started

### Prerequisites

- Node.js v18+
- A Google Gemini API key (free tier: [aistudio.google.com](https://aistudio.google.com))
- A Neon PostgreSQL database ([neon.tech](https://neon.tech))
- A Vercel Blob store token (or deploy to Vercel where it's auto-injected)
- A Groq API key for chatbot replies and Groq analysis mode (free tier: [console.groq.com](https://console.groq.com))
- A Resend API key for analyst alert emails, optional (free tier: [resend.com](https://resend.com))

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

# Groq — enables Groq/Both analysis modes AND the chatbot
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
GROQ_CHAT_MODEL=meta-llama/llama-4-scout-17b-16e-instruct   # optional, chatbot reply model

# Email alerts — optional; notifies analysts when chat sessions are analyzed
RESEND_API_KEY=your_resend_api_key
ALERT_EMAIL_FROM=Oversight <alerts@oversight-app.com>
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

Open [http://localhost:3000](http://localhost:3000). Analysts are redirected to `/login` — create an account first. The `/chat` page is public and requires no login.

## Input Data Format

When uploading conversation files, use a `.json` array of conversation turns:

```json
[
  { "id": "user",      "content": "Hello, what plans do you offer?" },
  { "id": "assistant", "content": "We have several plans available..." }
]
```

Sample files are included for testing: `sample-telus-clean.json`, `sample-telus-one-hallucination.json`, `sample-telus-many-hallucinations.json`.

## Application Flow

### Analyst workflow (file upload)

1. **Sign up / Log in** → `/login` or `/signup`
2. **Upload** → drag-and-drop a JSON file at `/upload`, choose analysis mode and types
3. **Processing** → `/processing/[id]` polls for status while analysis runs server-side
4. **Dashboard** → `/dashboard/[id]` shows hallucination rate, bias flags, toxicity scores, and per-turn cards

### Live chatbot workflow

1. **Customer** visits `/chat` (no login required)
2. **Chat** — messages are sent via `POST /api/chat`; the bot replies using Groq Llama
3. **End session** — customer clicks "End Chat" → `POST /api/chat/[id]/complete` runs analysis
4. **Alerts** — analysts with a configured `alertEmail` receive a Resend notification linking to the dashboard
5. **Dashboard** → same tabbed analysis view as file uploads

> **Note:** Because analysis runs synchronously inside the serverless function (Vercel constraint), the processing page shows a simulated progress animation while polling for completion. See [Known Issues](#known-issues).

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/upload` | Required | Upload file + run analysis → `{ uploadId }` |
| `GET`  | `/api/upload/[id]` | Required | Get upload status + analyses (own uploads only) |
| `GET`  | `/api/uploads` | Required | List all uploads for the logged-in user |
| `GET`  | `/api/settings` | Required | Get user preferences |
| `PUT`  | `/api/settings` | Required | Update preferences `{ defaultAnalysisMode, defaultAnalyses, alertEmail? }` |
| `GET`  | `/api/ground-truth` | Required | List ground truths (user's + built-in) |
| `POST` | `/api/ground-truth` | Required | Upload a new ground truth document |
| `DELETE` | `/api/ground-truth/[id]` | Required | Delete a user-owned ground truth |
| `POST` | `/api/chat` | Public | Send message, get bot reply; creates session if needed |
| `GET`  | `/api/chat/[id]` | Public | Get chat session + full message history |
| `POST` | `/api/chat/[id]/complete` | Public | End session, run analysis, send alert emails |
| `POST` | `/api/auth/register` | Public | Create a new account |
| `GET/POST` | `/api/auth/[...nextauth]` | Public | NextAuth.js session endpoints |

## Known Issues

### Processing page shows simulated progress, not real-time analysis steps

**Root cause:** Vercel serverless functions cannot stream incremental progress back to the client. Analysis runs synchronously inside the function (with a 120-second timeout), meaning the HTTP response isn't returned until the full analysis is complete. The `/processing/[id]` page polls every 2 seconds and animates a fake progress bar.

**Impact:** Users see an animated progress bar that doesn't reflect actual analysis progress. The experience still works correctly end-to-end — it just isn't as informative as it could be.

## Project Structure

```
app/
  page.tsx                    # Home page
  login/page.tsx              # Login form
  signup/page.tsx             # Sign-up form
  chat/page.tsx               # Public customer-facing chatbot (no auth)
  upload/page.tsx             # Drag-and-drop file upload
  processing/[id]/page.tsx    # Polling status page (simulated progress)
  dashboard/[id]/page.tsx     # Tabbed analysis dashboard
  dashboard/[id]/components/  # OverviewTab, HallucinationTab, BiasTab, ToxicityTab, etc.
  uploads/page.tsx            # Past uploads list
  settings/page.tsx           # Preferences + alert email
  ground-truth/page.tsx       # Ground truth management
  api/
    upload/route.ts           # POST: upload + analysis
    upload/[id]/route.ts      # GET: upload status + results
    uploads/route.ts          # GET: list uploads
    settings/route.ts         # GET/PUT: user preferences
    ground-truth/route.ts     # GET/POST: ground truths
    ground-truth/[id]/route.ts # DELETE: ground truth
    chat/route.ts             # POST: chat message + bot reply
    chat/[id]/route.ts        # GET: chat session + history
    chat/[id]/complete/route.ts # POST: end session + analysis + alerts
    auth/[...nextauth]/       # NextAuth.js handler
    auth/register/            # POST: create account
lib/
  prisma.ts                   # Prisma client singleton
  gemini.ts                   # Gemini analysis
  groq.ts                     # Groq analysis
  chat-reply.ts               # Chatbot reply generation (Groq Llama)
  run-analysis.ts             # Unified analysis pipeline (shared by upload + chat)
  send-alert-email.ts         # Analyst alert emails via Resend
  analysis-types.ts           # Shared result types
  analysis-prompt.ts          # Prompt builders
  ground-truth-seed.ts        # Built-in ground truth seeding
  auth.ts                     # NextAuth.js config
proxy.ts                      # Route protection middleware (/chat is public)
prisma/
  schema.prisma               # DB schema
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
