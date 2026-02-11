# CLAUDE.md

## Project Overview

**the-painters-product** is a Next.js full-stack web application for mass data analysis of AI chatbot conversations, identifying issues like hallucinations, bias, and toxicity. Built for CSC491 by The pAInters.

**Current MVP scope**: Hallucination detection only. Gender bias and toxicity detection are planned future extensions (see below).

## Tech Stack

- **Framework**: Next.js 15 with App Router, TypeScript
- **Frontend**: React + Tailwind CSS 4
- **Database**: PostgreSQL (Neon) via Prisma 7 ORM
- **File storage**: Vercel Blob
- **LLM**: Google Gemini via `@google/generative-ai` SDK
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
```

`GEMINI_MODEL` defaults to `gemini-2.5-flash` if not set. `BLOB_READ_WRITE_TOKEN` is auto-injected on Vercel but required locally.

## Deployment (Vercel)

The app is deployed on Vercel. The following services must be configured:

- **Database**: [Neon](https://neon.tech) — serverless PostgreSQL. Set `DATABASE_URL` to the pooled connection string.
- **File storage**: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) — `BLOB_READ_WRITE_TOKEN` is auto-injected when the Blob store is linked in the Vercel dashboard.
- **LLM**: Gemini API key set as `GEMINI_API_KEY` in Vercel environment variables.
- **Processing**: Gemini analysis runs synchronously inside `/api/upload` with a 60s max function duration (`export const maxDuration = 60`).

After changing the schema, run migrations against Neon:
```bash
DATABASE_URL=your_neon_url npx prisma migrate deploy
```

## Project Structure

```
app/
  page.tsx                    # Home page with features overview
  upload/page.tsx             # Drag-and-drop file upload
  processing/[id]/page.tsx    # Real-time processing status (polls every 2s)
  dashboard/[id]/page.tsx     # Hallucination analysis dashboard
  uploads/page.tsx            # List all past uploads
  api/
    upload/route.ts           # POST: upload conversation file
    upload/[id]/route.ts      # GET: upload status + results
    uploads/route.ts          # GET: list all uploads
    upload/route.ts           # POST: upload + runs Gemini analysis synchronously
lib/
  prisma.ts                   # Prisma client singleton
  gemini.ts                   # Gemini client, prompt builder, and types
prisma/
  schema.prisma               # DB schema (User, Upload, Analysis)
  migrations/                 # Migration history
uploads/                      # Uploaded files storage (gitignored)
sample-telus-clean.json                # Test: clean conversation (no issues)
sample-telus-one-hallucination.json    # Test: single hallucination
sample-telus-many-hallucinations.json  # Test: multiple hallucination types
```

## Key Architecture Notes

- **LLM integration**: `app/api/upload/route.ts` calls `lib/gemini.ts` synchronously — one Gemini prompt per upload, returns structured JSON, written to DB before the HTTP response is sent.
- **Input format**: JSON array of `{ id: "user"|"assistant", content: string }` objects.
- **Upload flow**: Upload → `/api/upload` (analysis runs here) → poll `/processing/[id]` → view `/dashboard/[id]`
- **Database**: Neon PostgreSQL via Prisma. `DATABASE_URL` must be set in environment.
- **File storage**: Vercel Blob. `BLOB_READ_WRITE_TOKEN` must be set in environment.
- **User model** exists in schema but authentication is not implemented.

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

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload` | Upload file (FormData: file, fileName, fileSize), runs Gemini analysis → `{ uploadId }` |
| `GET`  | `/api/upload/[id]` | Get upload status + analyses |
| `GET`  | `/api/uploads` | List all uploads |

## Database Schema (Summary)

- `User` — id, email, name (unused — no auth yet)
- `Upload` — id, userId, fileName, fileSize, status (`pending`/`processing`/`completed`/`failed`), errorMessage
- `Analysis` — id, uploadId, analysisType (`"hallucination"`), result (JSON string), confidence (0–1), detectedIssues

The `result` JSON for a `hallucination` analysis matches `HallucinationAnalysisResult` in `lib/gemini.ts`.

## Future Extensions

The following analysis types are planned but not yet implemented:

- **Gender Bias Detection** — flag assistant responses that apply different standards, language, or assumptions based on user gender cues
- **Toxicity Detection** — identify harmful, offensive, or inappropriate language in assistant responses

These were removed from the MVP to focus on hallucination quality and conserve LLM API credits.

## No Test Framework

No automated tests. Use the three `sample-telus-*.json` files for manual upload testing and Prisma Studio for DB inspection.
