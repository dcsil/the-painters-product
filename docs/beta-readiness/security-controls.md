# Security Controls — Beta Readiness

**Date:** 2026-04-02
**Branch:** beta-readiness
**Team:** The pAInters (CSC491)

This document summarizes the security controls implemented in the application and their current status. It covers authentication, input validation, data protection, rate limiting, and the dependency audit results.

---

## 1. Authentication

### Implementation

The application uses **NextAuth.js v5.0.0-beta.30** with a Credentials provider (email + password). Sessions are managed via JWT stored in an HTTP-only cookie.

**Route protection — two layers:**

**Layer 1 — Edge middleware (`proxy.ts`):**
The NextAuth `auth()` wrapper is applied as middleware. The matcher protects all routes by default and explicitly excludes:
- `api/auth/*` — NextAuth session management endpoints
- `api/chat/*` — public chatbot API (intentionally unauthenticated)
- `api/health` — health check
- `/login`, `/signup` — auth pages
- `/chat` — public customer-facing chatbot UI
- `/monitor` — analyst live monitoring (auth handled at route level)
- `/_next/*`, `/favicon.ico` — static assets

**Layer 2 — Per-route auth check:**
Every protected API route independently calls `await auth()` at the top and returns HTTP 401 before any database query if the session is null. This defense-in-depth ensures that if middleware is bypassed or misconfigured, individual routes still enforce authentication.

**Session content:**
The `user.id` field is injected into the JWT in the `jwt()` callback and reconstructed in the `session()` callback, making it available throughout the application. Data access is scoped to `session.user.id` in all database queries.

**Known risk:**
NextAuth.js v5.0.0-beta.30 is a pre-release dependency. No stable v5 release was available at the time of implementation. This is an accepted risk — the library is widely used in its beta form by the Next.js community and the specific authentication patterns used (Credentials + JWT) are stable.

---

## 2. Password Hashing

- **Library:** `bcryptjs` v3.0.2 (pure JavaScript implementation of bcrypt)
- **Cost factor:** 12 rounds (strong; standard recommendation is 10–12)
- **Minimum length:** 8 characters, enforced server-side in `app/api/auth/register/route.ts`
- **Storage:** Only the bcrypt hash is stored in `User.passwordHash`; plaintext is never persisted or logged

**Note on email enumeration:**
The registration endpoint returns HTTP 409 when an email is already registered. This technically confirms whether an email address has an account. This is a minor information disclosure accepted at the current scope (internal analyst tool); a registration flow without confirmation could mask this at the cost of UX.

---

## 3. Input Validation

### File uploads (`/api/upload`)

| Check | Where | Detail |
|-------|-------|--------|
| File type | Client-side | Accepts `.json` or `application/json` MIME type only |
| File size | Client-side | 10MB maximum |
| JSON structure | Client-side | Must be an array; each item must have `id` and `content` string fields |
| BOM stripping | Server-side | `replace(/^\uFEFF/, '')` before JSON parse |
| JSON parse | Server-side | Wrapped in try/catch; returns 400 on invalid JSON |
| Array type check | Server-side | Returns 400 if parsed value is not an array |

### Ground truth uploads (`/api/ground-truth`)

| Check | Where | Detail |
|-------|-------|--------|
| File size | Server-side | 100KB maximum |
| Extension whitelist | Server-side | `.txt`, `.md`, `.json` only |

### Settings (`/api/settings`)

| Field | Validation |
|-------|-----------|
| `defaultAnalysisMode` | Enum check: `gemini`, `groq`, `both` |
| `defaultAnalyses` | Array of enum values: `hallucination`, `bias`, `toxicity` |
| `alertEmail` | Regex format validation |
| `biasThreshold` | Integer, range 0–100 |

### Chat messages (`/api/chat`)

- `message.trim() === ''` check — empty messages rejected
- Session ended-state guard — messages rejected if session already ended

### Email alert content

The `sendAlertEmail()` function applies an `escapeHtml()` utility that strips `&`, `<`, `>`, `"`, and `'` before interpolating user-provided content (conversation messages) into HTML email bodies. This prevents XSS in the email client.

---

## 4. Rate Limiting

Rate limiting is implemented at the application layer using a DB-backed `RateLimit` Prisma model with `@@unique([identifier, type])`.

| Endpoint | Identifier | Limit |
|----------|-----------|-------|
| `POST /api/upload` | `user:${session.user.id}` | 5/min, 40/day |
| `POST /api/chat` | `ip:${x-forwarded-for \|\| 127.0.0.1}` | 5/min, 40/day |

On violation: HTTP 429 with `Retry-After` header indicating seconds until the window resets.

**Gap:** Rate limiting is enforced at the application layer, not at the CDN/edge layer. For production hardening, Vercel's edge rate limiting or a WAF would provide an additional layer before requests reach the application.

---

## 5. Data Protection

| Area | Control |
|------|---------|
| Password storage | bcrypt hash only; plaintext never stored or logged |
| Session tokens | JWT in HTTP-only cookie (NextAuth default); inaccessible to JavaScript |
| Database transport | Neon PostgreSQL enforces TLS on all connections by default |
| Cascade deletes | `User` deletion cascades to `Upload`, `Analysis`, `GroundTruth`, `Feedback`, `RateLimit` — no orphaned user data |
| Chat session data | `ChatSession` → `ChatMessage` cascade delete; no orphaned conversation data |

**Known gap — Vercel Blob public access:**
Uploaded conversation files are stored with `access: 'public'` in Vercel Blob (see BUG-005 in the bug severity audit). The blob URL is publicly accessible without authentication if the URL is known. URLs use a timestamp-prefixed filename pattern and are not enumerable. This is an accepted risk at the current scope. For GA, evaluate Vercel Blob private access with signed URLs.

---

## 6. Dependency Audit

**Audit date:** 2026-04-02
**Tool:** `npm audit`
**Result:** 13 vulnerabilities found (5 moderate, 8 high)

### Key finding: All vulnerabilities are in dev/build tooling

After reviewing each finding, **all 13 vulnerabilities are in development and build-time dependencies** — not in runtime code that users or external actors interact with. The affected packages are:

| Package | Severity | Context |
|---------|---------|---------|
| `@hono/node-server` | High | Prisma CLI dev tooling (`@prisma/dev`) |
| `hono` | High | Prisma CLI dev tooling |
| `effect` | High | Prisma CLI config (`@prisma/config`) |
| `lodash` | High | Prisma AST parser (`@mrleebo/prisma-ast`) — Prisma Studio dev tool |
| `picomatch` | High | File globbing in build tools |
| `brace-expansion` | Moderate | TypeScript ESLint parser |

None of these packages are imported or executed in the Next.js application runtime. They are used only by:
- The Prisma CLI (`npx prisma migrate`, `npx prisma studio`) — developer tool, not deployed
- ESLint — lint tooling, not deployed

### Runtime dependency status

The runtime dependencies (`next`, `react`, `next-auth`, `@google/generative-ai`, `groq-sdk`, `@vercel/blob`, `resend`, `bcryptjs`, `recharts`, `@prisma/client`) have **0 reported vulnerabilities** as of this audit date.

### Remediation

`npm audit fix` resolves all 13 issues (Prisma CLI tooling updates). This update was deferred pending validation against the current Prisma 7 migration set. Tracked for resolution before GA.

### Active maintenance

The team has actively responded to Dependabot security alerts throughout the alpha sprint (PRs #8, #9, #10, #12). The dependency audit process is part of the pre-release review cycle.
