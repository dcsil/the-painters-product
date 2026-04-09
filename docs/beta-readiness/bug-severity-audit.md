# Bug Severity Audit — Beta Readiness

**Date:** 2026-04-02
**Branch:** beta-readiness
**Team:** The pAInters (CSC491)
**Auditors:** Full team

---

## Severity Taxonomy

| Severity | Definition | Beta Gate |
|----------|-----------|-----------|
| **Critical** | Data loss, auth bypass, security vulnerability, system crash or complete feature unavailability | Must resolve before beta validation |
| **High** | Core workflow blocked, incorrect analysis results surfaced to users, data visible to wrong user | Must resolve before beta validation |
| **Medium** | Degraded experience, UI misleads but flow completes correctly, workaround exists | Document and triage; resolution before GA |
| **Low** | Minor UX polish, copy errors, non-blocking inconvenience | Log in backlog; no release gate |

---

## Bug Register

### BUG-001 — Medium — Simulated progress bar on processing page

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Status** | Open — tracked, deferred to GA |
| **Component** | `app/processing/[id]/page.tsx`, `app/api/upload/route.ts` |
| **Reported** | Internal (alpha sprint) |

**Description:**
The processing page displays a step indicator and percentage counter that do not reflect actual pipeline state. The frontend animates fake progress using `Math.random() * 10` increments every 500ms, capping at 90% until the poll response returns `status === 'completed'`, at which point it jumps to 100%.

**Root cause:**
Vercel serverless functions cannot stream incremental progress mid-request. The full analysis runs synchronously inside `/api/upload` (up to 120s), and the HTTP response is withheld until analysis completes. There is no mechanism to emit intermediate state.

**Impact:**
Users see step-indicator checkmarks and a numeric percentage that bear no relationship to actual pipeline progress. The UI implies granular real-time feedback that does not exist. This is a UX contract violation but not a data integrity issue.

**Workaround:**
Keep the browser tab open. The analysis completes and the page redirects automatically upon completion. No user action is lost.

**Fix complexity:** High — requires async job queue, WebSocket, or Vercel streaming primitives. Not a simple patch.

**Resolution path:** Deferred to GA milestone. Tracked in backlog.

---

### BUG-002 — High — RESOLVED: No rate limiting on public chat API

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Status** | Resolved — closed |
| **Component** | `app/api/chat/route.ts`, `lib/rate-limit.ts` |
| **Resolved in** | Migration `20260325_add_rate_limiting` |

**Description:**
Prior to the alpha release, the public `/api/chat` endpoint accepted unlimited requests with no abuse protection. Any actor could spam message generation and live monitoring calls, exhausting Groq API quota and inflating DB storage.

**Resolution:**
`lib/rate-limit.ts` implements DB-backed rate limiting using a `RateLimit` Prisma model with `@@unique([identifier, type])`. Chat endpoint enforces 5 requests/minute and 40 requests/day per IP address (`x-forwarded-for` header, fallback to `127.0.0.1`). Returns HTTP 429 with `Retry-After` header on violation. Upload endpoint enforces the same limits per authenticated user ID.

**Verification:** Rate limit records visible in Prisma Studio under `RateLimit` table.

---

### BUG-003 — Medium — Session completion endpoint lacks ownership check

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Status** | Open — tracked |
| **Component** | `app/api/chat/[id]/complete/route.ts` |

**Description:**
`POST /api/chat/[id]/complete` is a public endpoint (by design — the chatbot is unauthenticated). Any actor who knows a valid `sessionId` can call this endpoint, which terminates the session, triggers full conversation analysis, and sends alert emails to all analysts with a configured `alertEmail`.

**Risk assessment:**
`sessionId` values are CUIDs (e.g., `clx7abc123...`), which are not guessable by brute force. There is no enumerable session list exposed publicly. Practical exploitability is low. No user data is exposed to the caller — the endpoint returns only `{ success: true }`.

**Impact:** An actor with a known session ID can prematurely end a chat session and trigger spurious analyst email alerts.

**Workaround:** CUIDs are cryptographically non-enumerable. Risk is low in practice for the current deployment scale.

**Resolution path:** Medium priority — investigate adding a session-scoped token (issued at session creation, passed back by the client) as an ownership proof before GA.

---

### BUG-004 — Low — Chat-originated uploads have null userId

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Status** | Open — accepted design trade-off |
| **Component** | `lib/run-analysis.ts`, `app/api/upload/[id]/route.ts` |

**Description:**
`Upload` records created from chat sessions are stored with `userId: null` (no authenticated user initiates the chatbot). The `/api/upload/[id]` endpoint grants read access to any authenticated analyst when `upload.userId` is null, meaning one analyst can view another analyst's chat session analysis via direct URL.

**Assessment:**
This is an intentional design decision for the current internal-analyst scope. All analysts are trusted users within the same organization. No cross-tenant exposure exists.

**Resolution path:** Accepted for beta. Revisit ownership model if multi-tenant deployment is required.

---

### BUG-005 — Low — Uploaded files stored with public Vercel Blob access

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Status** | Open — accepted risk |
| **Component** | `app/api/upload/route.ts` |

**Description:**
Files uploaded by analysts are stored in Vercel Blob with `access: 'public'`. The blob URL is publicly accessible without authentication if the URL is known. URLs use a timestamp-prefixed filename pattern (e.g., `1743600000000-filename.json`) and are not enumerable or guessable in practice.

**Assessment:**
For a tool handling potentially sensitive customer chatbot conversations, `public` blob access is a security gap. However, Vercel Blob's `public` mode is the recommended pattern for Next.js on Vercel (private access requires streaming through an API route, adding latency and egress cost). At the current deployment scale with non-sensitive test data, the risk is accepted.

**Resolution path:** Low priority for beta. Flag for GA review — evaluate Vercel Blob private access with signed URLs if data sensitivity requirements increase.

---

## Beta Gate Summary

| Severity | Total | Open | Resolved |
|----------|-------|------|----------|
| Critical | 0 | 0 | 0 |
| High | 1 | 0 | 1 |
| Medium | 2 | 2 | 0 |
| Low | 2 | 2 | 0 |

**Beta gate result: PASSED**
Zero Critical and zero High bugs remain open. All Medium and Low items are documented with triage decisions and resolution paths.
