# CLAUDE.md

## Project Overview

**the-painters-product** is a Next.js full-stack web application for mass data analysis of AI chatbot conversations, identifying issues like hallucinations, bias, and toxicity. Built for CSC491 by The pAInters.

**Current MVP scope**: Hallucination detection only. Gender bias and toxicity detection are planned future extensions (see below).

## Tech Stack

- **Framework**: Next.js 16 with App Router, TypeScript
- **Frontend**: React + Tailwind CSS 4
- **Database**: PostgreSQL (Neon) via Prisma 7 ORM
- **File storage**: Vercel Blob
- **LLM**: Google Gemini via `@google/generative-ai` SDK
- **Auth**: NextAuth.js v5 (beta) — email/password with JWT sessions
- **Linting**: ESLint

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

Create a `.env.local` file in the project root before running:

```
DATABASE_URL=your_neon_postgres_connection_string
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
NEXTAUTH_SECRET=your_random_32_char_secret   # generate: openssl rand -base64 32
```

`GEMINI_MODEL` defaults to `gemini-2.5-flash` if not set. `BLOB_READ_WRITE_TOKEN` is auto-injected on Vercel but required locally. `NEXTAUTH_SECRET` must also be set in Vercel environment variables.

## Deployment (Vercel)

The app is deployed on Vercel. The following services must be configured:

- **Database**: [Neon](https://neon.tech) — serverless PostgreSQL. Set `DATABASE_URL` to the pooled connection string.
- **File storage**: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) — `BLOB_READ_WRITE_TOKEN` is auto-injected when the Blob store is linked in the Vercel dashboard.
- **LLM**: Gemini API key set as `GEMINI_API_KEY` in Vercel environment variables.
- **Auth**: `NEXTAUTH_SECRET` must be set as a Vercel environment variable.
- **Processing**: Gemini analysis runs synchronously inside `/api/upload` with a 60s max function duration (`export const maxDuration = 60`).

After changing the schema, run migrations against Neon:
```bash
DATABASE_URL=your_neon_url npx prisma migrate deploy
```

## Project Structure

```
app/
  page.tsx                    # Home page with features overview
  login/page.tsx              # Login form (email + password)
  signup/page.tsx             # Sign-up form (auto-login on success)
  upload/page.tsx             # Drag-and-drop file upload
  processing/[id]/page.tsx    # Polling status page (see Known Issues)
  dashboard/[id]/page.tsx     # Hallucination analysis dashboard
  uploads/page.tsx            # List all past uploads for the current user
  api/
    upload/route.ts           # POST: upload conversation file + run Gemini
    upload/[id]/route.ts      # GET: upload status + results (auth + ownership)
    uploads/route.ts          # GET: list uploads for current user
    auth/[...nextauth]/       # NextAuth.js route handler (GET + POST)
    auth/register/            # POST: create new account
lib/
  prisma.ts                   # Prisma client singleton (Neon adapter)
  gemini.ts                   # Gemini client, prompt builder, and types
  auth.ts                     # NextAuth.js config (Credentials provider + JWT callbacks)
proxy.ts                      # Route protection — redirects unauthenticated users to /login
prisma/
  schema.prisma               # DB schema (User, Upload, Analysis)
  migrations/                 # Migration history
prisma.config.ts              # Prisma 7 config (datasource URL lives here, not in schema)
sample-telus-clean.json                # Test: clean conversation (no issues)
sample-telus-one-hallucination.json    # Test: single hallucination
sample-telus-many-hallucinations.json  # Test: multiple hallucination types
```

## Key Architecture Notes

- **LLM integration**: `app/api/upload/route.ts` calls `lib/gemini.ts` synchronously — one Gemini prompt per upload, returns structured JSON, written to DB before the HTTP response is sent.
- **Input format**: JSON array of `{ id: "user"|"assistant", content: string }` objects.
- **Upload flow**: Upload → `/api/upload` (analysis runs here synchronously) → poll `/processing/[id]` → view `/dashboard/[id]`
- **Authentication**: All app routes are protected by `proxy.ts`. Each API endpoint checks `auth()` and scopes data to `session.user.id`.
- **Database**: Neon PostgreSQL via Prisma. `DATABASE_URL` must be set in environment. Prisma 7 requires the datasource URL in `prisma.config.ts`, not `schema.prisma`.
- **File storage**: Vercel Blob. `BLOB_READ_WRITE_TOKEN` must be set in environment.

## Known Issues

### Processing page shows simulated progress, not real-time analysis steps

**Root cause:** Vercel serverless functions cannot stream incremental progress mid-request. Gemini analysis runs synchronously inside `/api/upload` (max 60s), so the HTTP response isn't returned until the full analysis is complete. The `/processing/[id]` page polls `/api/upload/[id]` every 2 seconds and animates a fake progress bar — it only knows `pending → processing → completed/failed`, not which internal sub-step is running.

**Impact:** The progress animation and step indicators are cosmetic. The flow works end-to-end correctly; it's just not as informative as it could be.

**Potential solutions to explore:**
- Use [Vercel AI SDK streaming](https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol) to stream partial Gemini output
- Move analysis to a background job queue (e.g. Inngest, Trigger.dev) so `/api/upload` returns immediately and a worker processes asynchronously
- Server-sent events (SSE) from the upload function, consumed by the processing page
- WebSocket-based progress (requires a non-serverless or persistent deployment)

## Hallucination Detection Strategies

Implemented via the Gemini prompt in `lib/gemini.ts`:

| Strategy | Description | Current Implementation | Improvement Path |
|----------|-------------|------------------------|-----------------|
| **SELF_CONTRADICTION** | Assistant gives conflicting answers to the same question | Gemini reads full conversation context | Fine-tune with known contradiction pairs |
| **OVERCONFIDENCE** | Definitive claims with no hedging on uncertain topics | Linguistic pattern detection via LLM | Add domain-specific uncertain topic list |
| **FABRICATED_CITATION** | References to invented studies, reports, or sources | Pattern matching ("According to...", "Studies show...") | Cross-reference against known real sources |
| **HARDCODED_FACT** | Specific numbers/dates/prices stated as certain fact | Flagged when specific values lack caveats | Integrate live product/pricing API to verify |
| **NUMERICAL_IMPACT** | Extracts dollar amounts, percentages, dates from flagged turns | Extracted as string from LLM response | Compute actual financial impact delta |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/upload` | Required | Upload file (FormData: file, fileName, fileSize), runs Gemini analysis → `{ uploadId }` |
| `GET`  | `/api/upload/[id]` | Required | Get upload status + analyses (own uploads only) |
| `GET`  | `/api/uploads` | Required | List all uploads for the logged-in user |
| `POST` | `/api/auth/register` | Public | Create a new account `{ email, password, name? }` |
| `GET/POST` | `/api/auth/[...nextauth]` | Public | NextAuth.js session management |

## Database Schema (Summary)

- `User` — id, email, name, passwordHash (bcrypt, rounds=12)
- `Upload` — id, userId, fileName, fileSize, status (`pending`/`processing`/`completed`/`failed`), errorMessage
- `Analysis` — id, uploadId, analysisType (`"hallucination"`), result (JSON string), confidence (0–1), detectedIssues

The `result` JSON for a `hallucination` analysis matches `HallucinationAnalysisResult` in `lib/gemini.ts`.

## Future Extensions

The following are planned but not yet implemented:

- **Gender Bias Detection** — flag assistant responses that apply different standards, language, or assumptions based on user gender cues
- **Toxicity Detection** — identify harmful, offensive, or inappropriate language in assistant responses
- **Real processing progress** — replace the simulated progress bar with actual streaming or async job status (see Known Issues above)

## No Test Framework

No automated tests. Use the three `sample-telus-*.json` files for manual upload testing and Prisma Studio for DB inspection.
