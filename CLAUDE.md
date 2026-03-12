# CLAUDE.md

## Project Overview

**the-painters-product** is a Next.js full-stack web application for mass data analysis of AI chatbot conversations, identifying issues like hallucinations, bias, and toxicity. Built for CSC491 by The pAInters.

**Current scope**: Hallucination detection, bias detection, and toxicity detection — run via user-configurable analysis modes. Includes a live customer-facing chatbot that records conversations and automatically runs analysis when sessions end, with email alerts to analysts.

## Tech Stack

- **Framework**: Next.js 16.1.6 with App Router, TypeScript 5
- **Frontend**: React 19 + Tailwind CSS 4
- **Database**: PostgreSQL (Neon) via Prisma 7 ORM + `@prisma/adapter-neon`
- **File storage**: Vercel Blob (`@vercel/blob`)
- **LLM (analysis)**: Google Gemini and/or Groq (Llama) via `@google/generative-ai` and `groq-sdk` — user selects mode per upload
- **LLM (chatbot)**: Groq Llama via `groq-sdk` — synchronous reply generation
- **Email**: Resend (`resend`) — analyst alert emails on chat session completion
- **Auth**: NextAuth.js v5 (beta, `next-auth@5.0.0-beta.30`) — email/password with bcrypt (12 rounds) + JWT sessions
- **Password hashing**: `bcryptjs`
- **Linting**: ESLint 9

## Common Commands

```bash
# Development
npm run dev           # Start dev server on http://localhost:3000
npm run build         # Production build
npm run start         # Start production server
npm run lint          # Run ESLint

# Database
npx prisma studio                          # Open DB GUI on port 5555
npx prisma generate                        # Regenerate Prisma client
npx prisma migrate dev --name <name>       # Create + run a new migration
npx prisma db push                         # Push schema changes without migration
npx prisma migrate reset                   # Reset database (destructive)
```

## Environment Setup

**Local development:** Create a `.env.local` file in the project root before running. (Vercel ignores `.env.local` — use **Project Settings → Environment Variables** in the Vercel dashboard for production.)

```
DATABASE_URL=your_neon_postgres_connection_string
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
NEXTAUTH_SECRET=your_random_32_char_secret   # generate: openssl rand -base64 32

# Groq (Llama) — required for "Groq" or "Both" analysis modes AND chatbot replies
GROQ_API_KEY=your_groq_api_key_here       # Optional; enables Groq/Both modes + chatbot
GROQ_MODEL=llama-3.1-8b-instant           # Optional; defaults to llama-3.1-8b-instant
GROQ_CHAT_MODEL=meta-llama/llama-4-scout-17b-16e-instruct  # Optional; chatbot reply model

# Email alerts (Resend) — optional; enables analyst notifications on chat completion
RESEND_API_KEY=your_resend_api_key        # Optional; get one free at resend.com
ALERT_EMAIL_FROM=Oversight <alerts@oversight-app.com>  # Optional; sender address
```

`GEMINI_MODEL` defaults to `gemini-2.5-flash` if not set. `BLOB_READ_WRITE_TOKEN` is auto-injected on Vercel but required locally. `NEXTAUTH_SECRET` must also be set in Vercel environment variables.

**Analysis modes (user-configurable):**
- **Gemini (balanced)** — default; uses Google Gemini only
- **Groq / Llama (faster)** — uses Groq only; requires `GROQ_API_KEY`
- **Both (deeper analysis)** — Gemini analyzes first, then Groq cross-checks Gemini's output for a refined result

Users configure their default mode in `/settings` and can override per upload.

**Groq setup (free tier):** Sign up at [console.groq.com](https://console.groq.com), create an API key, and set `GROQ_API_KEY`. No credit card required.

**Resend setup (free tier):** Sign up at [resend.com](https://resend.com), create an API key, and set `RESEND_API_KEY`. Analysts set their alert email in `/settings`.

## Deployment (Vercel)

The app is deployed on Vercel. The following services must be configured:

- **Database**: [Neon](https://neon.tech) — serverless PostgreSQL. Set `DATABASE_URL` to the pooled connection string.
- **File storage**: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) — `BLOB_READ_WRITE_TOKEN` is auto-injected when the Blob store is linked in the Vercel dashboard.
- **LLM**: Set `GEMINI_API_KEY` and optionally `GROQ_API_KEY` in Vercel environment variables.
- **Email**: Set `RESEND_API_KEY` (and optionally `ALERT_EMAIL_FROM`) for analyst alert emails.
- **Auth**: `NEXTAUTH_SECRET` must be set as a Vercel environment variable.
- **Processing**: Analysis runs synchronously inside `/api/upload` and `/api/chat/[id]/complete` with a 120s max function duration (`export const maxDuration = 120`).

After changing the schema, run migrations against Neon:
```bash
DATABASE_URL=your_neon_url npx prisma migrate deploy
```

## Project Structure

```
app/
  layout.tsx                  # Root layout — auth header, nav (Chatbot, Upload, History, Ground Truth, Settings), sign-out
  page.tsx                    # Home page with features overview
  globals.css                 # Tailwind CSS 4 theme + dark mode
  login/page.tsx              # Login form (email + password)
  signup/page.tsx             # Sign-up form (auto-login on success)
  chat/page.tsx               # Public customer-facing chatbot UI (no auth required)
  upload/page.tsx             # File upload with analysis mode, type checkboxes, ground truth selector
  processing/[id]/page.tsx    # Polling status page (see Known Issues)
  dashboard/[id]/page.tsx     # Tabbed analysis dashboard (Overview, Hallucination, Bias, Toxicity)
  dashboard/[id]/components/  # Dashboard tab components (OverviewTab, HallucinationTab, BiasTab, ToxicityTab, etc.)
  uploads/page.tsx            # List all past uploads for the current user
  settings/page.tsx           # User preferences (default analysis mode, default analysis types, alert email)
  ground-truth/page.tsx       # Ground truth management (upload, list, delete)
  api/
    upload/route.ts           # POST: upload file + run multi-analysis via runConversationAnalysis() (maxDuration=120)
    upload/[id]/route.ts      # GET: upload status + results (auth + ownership check)
    uploads/route.ts          # GET: list uploads for current user (ordered by uploadedAt DESC)
    settings/route.ts         # GET/PUT: user preferences (incl. alertEmail)
    ground-truth/route.ts     # GET: list ground truths; POST: upload new ground truth
    ground-truth/[id]/route.ts # DELETE: remove user-owned ground truth
    chat/route.ts             # POST: send user message, get bot reply, persist ChatSession + ChatMessages
    chat/[id]/route.ts        # GET: retrieve chat session + full message history
    chat/[id]/complete/route.ts # POST: end session, run analysis, send alert emails (maxDuration=120)
    auth/[...nextauth]/       # NextAuth.js route handler (GET + POST)
    auth/register/            # POST: create new account
lib/
  prisma.ts                   # Prisma client singleton (Neon adapter)
  gemini.ts                   # Gemini analysis: analyzeWithGemini(conversation, category, groundTruth?, previousAnalysis?)
  groq.ts                     # Groq analysis: analyzeWithGroq(conversation, category, groundTruth?, previousAnalysis?)
  chat-reply.ts               # Chatbot: generateChatReply(messages) using Groq Llama
  run-analysis.ts             # Unified pipeline: runConversationAnalysis() — shared by file upload and chat sessions
  send-alert-email.ts         # Email alerts: sendAlertEmail() via Resend when chat analysis completes
  analysis-types.ts           # Shared types: HallucinationAnalysisResult, BiasAnalysisResult, ToxicityAnalysisResult
  analysis-prompt.ts          # Prompt builders: hallucination, bias, toxicity, cross-check, ground truth injection
  ground-truth-seed.ts        # Seeds built-in ground truths (Telus) on first access
  auth.ts                     # NextAuth.js config (Credentials provider + JWT callbacks)
data/
  telus-ground-truth.md       # Built-in Telus telecom ground truth facts
proxy.ts                      # Route protection — redirects unauthenticated users to /login (chat page is public)
prisma/
  schema.prisma               # DB schema (User, UserPreferences, GroundTruth, Upload, Analysis, ChatSession, ChatMessage)
  migrations/                 # Migration history
prisma.config.ts              # Prisma 7 config (datasource URL lives here, not in schema)
next.config.ts                # Next.js config (React compiler enabled)
sample-conversation.json               # Test: generic conversation
sample-telus-clean.json                # Test: clean conversation (no issues)
sample-telus-one-hallucination.json    # Test: single hallucination (fabricated citation)
sample-telus-many-hallucinations.json  # Test: multiple hallucination types
```

## Key Architecture Notes

- **Analysis pipeline**: `lib/run-analysis.ts` exports `runConversationAnalysis()` — shared by both `/api/upload` (file uploads) and `/api/chat/[id]/complete` (chat sessions). Runs categories in parallel via `Promise.allSettled`; "both" mode runs Gemini then Groq sequentially within each category.
- **Chatbot flow**: Customer visits `/chat` (public, no auth) → sends messages via `POST /api/chat` → bot replies using Groq Llama → customer clicks "End Chat" → `POST /api/chat/[id]/complete` runs full analysis and sends analyst alert emails.
- **Upload source tracking**: `Upload.source` field distinguishes `"upload"` (file drag-and-drop) from `"chat"` (live chatbot session). Both appear in `/uploads` history for analysts.
- **Chat session model**: `ChatSession` (id, createdAt, lastActivityAt, endedAt, uploadId) → `ChatMessage[]` (role: "user"|"assistant", content, createdAt). `uploadId` is set after `/complete` runs analysis.
- **Alert emails**: On chat session completion, `sendAlertEmail()` queries all users with a non-null `alertEmail` and sends a Resend email linking to the dashboard. Requires `RESEND_API_KEY`.
- **Ground truth**: Optional reference documents stored in DB. Injected into LLM prompts as a `GROUND TRUTH CONTEXT` section. Built-in Telus ground truth auto-seeded on first access.
- **Input format**: JSON array of `{ id: "user"|"assistant", content: string }` objects. Client validates type, size, and structure before upload.
- **Upload flow**: Upload → `/api/upload` (BOM-stripped JSON parse → Vercel Blob → DB record → multi-analysis → DB update) → poll `/processing/[id]` → view `/dashboard/[id]`
- **Authentication**: All app routes except `/chat` are protected by `proxy.ts` middleware. Each API endpoint independently checks `auth()` and scopes data to `session.user.id`. The chat API routes are unauthenticated (public chatbot). JWT stored in HTTP-only cookie.
- **Session**: JWT strategy. `user.id` added to token on login, reconstructed on `session` callback. Custom sign-in page at `/login`.
- **Database**: Neon PostgreSQL via Prisma with `@prisma/adapter-neon`. Cascading deletes: User → Uploads → Analyses; ChatSession → ChatMessages. `DATABASE_URL` must use the pooled connection string. Prisma 7 requires the datasource URL in `prisma.config.ts`, not `schema.prisma`.
- **File storage**: Files uploaded to Vercel Blob with a `${timestamp}-${fileName}` prefix. `BLOB_READ_WRITE_TOKEN` must be set locally (auto-injected on Vercel).
- **Root layout**: `app/layout.tsx` is a server component that renders the nav header (Chatbot, Upload, History, Ground Truth, Settings, sign-out) conditionally based on session.
- **Dashboard**: Tabbed UI with Overview, Hallucination, Bias, and Toxicity tabs. Each tab includes provider selector (for "both" mode), KPI cards, diagnostic breakdown, executive summary, and flagged turns log.

## Known Issues

### Processing page shows simulated progress, not real-time analysis steps

**Root cause:** Vercel serverless functions cannot stream incremental progress mid-request. Analysis runs synchronously inside `/api/upload` and `/api/chat/[id]/complete` (max 120s), so the HTTP response isn't returned until the full analysis is complete. The `/processing/[id]` page polls `/api/upload/[id]` every 2 seconds and animates a fake progress bar.

**Impact:** The progress animation and step indicators are cosmetic. The flow works end-to-end correctly; it's just not as informative as it could be.

## Analysis Types

### Hallucination Detection

| Strategy | Description |
|----------|-------------|
| **SELF_CONTRADICTION** | Assistant gives conflicting answers to the same question |
| **OVERCONFIDENCE** | Definitive claims with no hedging on uncertain topics |
| **FABRICATED_CITATION** | References to invented studies, reports, or sources |
| **HARDCODED_FACT** | Specific numbers/dates/prices stated as certain fact |

### Bias Detection

| Strategy | Description |
|----------|-------------|
| **GENDER_BIAS** | Assumptions or differential treatment based on perceived gender |
| **RACIAL_BIAS** | Preference or prejudice based on racial/ethnic cues |
| **AGE_BIAS** | Age-based assumptions about capability or preferences |
| **STEREOTYPING** | Group-based stereotypes applied to individuals |

### Toxicity Detection

| Strategy | Description |
|----------|-------------|
| **HOSTILE_LANGUAGE** | Aggressive, threatening, or combative language |
| **CONDESCENSION** | Patronizing or dismissive tone |
| **INAPPROPRIATE_CONTENT** | Off-topic inappropriate material |
| **PROFANITY** | Explicit language or profanity |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/upload` | Required | Upload file + run analysis (FormData: file, fileName, fileSize, analysisMode?, selectedAnalyses?, groundTruthId?) |
| `GET`  | `/api/upload/[id]` | Required | Get upload status + analyses (own uploads only) |
| `GET`  | `/api/uploads` | Required | List all uploads for the logged-in user |
| `GET`  | `/api/settings` | Required | Get user preferences (upserts default if missing) |
| `PUT`  | `/api/settings` | Required | Update user preferences `{ defaultAnalysisMode, defaultAnalyses, alertEmail? }` |
| `GET`  | `/api/ground-truth` | Required | List user's ground truths + built-in ones |
| `POST` | `/api/ground-truth` | Required | Upload new ground truth (FormData: file, name) |
| `DELETE` | `/api/ground-truth/[id]` | Required | Delete a user-owned ground truth |
| `POST` | `/api/chat` | Public | Send a user message + get bot reply; creates session on first message `{ sessionId?, message }` |
| `GET`  | `/api/chat/[id]` | Public | Retrieve chat session metadata + full message history |
| `POST` | `/api/chat/[id]/complete` | Public | End session, run analysis, send analyst alert emails |
| `POST` | `/api/auth/register` | Public | Create a new account `{ email, password, name? }` |
| `GET/POST` | `/api/auth/[...nextauth]` | Public | NextAuth.js session management |

## Database Schema (Summary)

- `User` — id, email, name?, passwordHash, createdAt, updatedAt
- `UserPreferences` — id, userId (unique), defaultAnalysisMode, defaultAnalyses, alertEmail?, createdAt, updatedAt
- `GroundTruth` — id, userId?, name, content, fileType, isBuiltIn, createdAt
- `Upload` — id, userId, fileName, fileSize, uploadedAt, status, errorMessage?, analysisMode?, groundTruthId?, selectedAnalyses?, source ("upload"|"chat")
- `Analysis` — id, uploadId, analysisType, result (JSON string), confidence (0–1), detectedIssues (int), createdAt
- `ChatSession` — id, createdAt, lastActivityAt, endedAt?, uploadId? (set after analysis)
- `ChatMessage` — id, sessionId, role ("user"|"assistant"), content, createdAt

Relations: User →(1:1) UserPreferences, User →(1:many) Upload →(1:many) Analysis, User →(1:many) GroundTruth, Upload →(many:1) GroundTruth, ChatSession →(1:many) ChatMessage, Upload →(1:1) ChatSession. All cascade on delete.

`analysisType` format: `{category}-{provider}` — e.g., `hallucination-gemini`, `bias-groq`, `toxicity-both`

## Future Extensions

- **Real processing progress** — replace the simulated progress bar with actual streaming or async job status (see Known Issues above)

## No Test Framework

No automated tests. Use the sample JSON files for manual upload testing and Prisma Studio for DB inspection:

| File | Purpose |
|------|---------|
| `sample-conversation.json` | Generic test conversation |
| `sample-telus-clean.json` | No hallucinations |
| `sample-telus-one-hallucination.json` | Single fabricated citation |
| `sample-telus-many-hallucinations.json` | Multiple hallucination types |
