# Contributing to the-painters-product

Thank you for contributing to this project. This guide covers how to set up your environment, submit issues, and get your changes reviewed.

---

## Table of Contents

1. [Development Setup](#development-setup)
2. [Issue Reporting](#issue-reporting)
3. [Triage SLA](#triage-sla)
4. [Issue Lifecycle](#issue-lifecycle)
5. [Making Changes](#making-changes)
6. [Pull Request Process](#pull-request-process)
7. [Security Issues](#security-issues)
8. [Code of Conduct](#code-of-conduct)

---

## Development Setup

### Prerequisites

- Node.js v18 or later
- A PostgreSQL database (we use [Neon](https://neon.tech) — free tier works)
- A Google Gemini API key (free at [ai.google.dev](https://ai.google.dev))
- A Vercel Blob token (required for file storage)

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/dcsil/the-painters-product.git
   cd the-painters-product
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   This also runs `prisma generate` automatically via the `postinstall` script.

3. **Create `.env.local`** in the project root:
   ```
   DATABASE_URL=your_neon_postgres_pooled_connection_string
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-2.5-flash
   BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
   NEXTAUTH_SECRET=your_random_32_char_secret
   GROQ_API_KEY=your_groq_api_key
   ```
   Generate `NEXTAUTH_SECRET` with: `openssl rand -base64 32`

4. **Run database migrations**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```
   The app runs at [http://localhost:3000](http://localhost:3000).

6. **Inspect the database** (optional)
   ```bash
   npx prisma studio
   ```
   Opens a DB GUI at [http://localhost:5555](http://localhost:5555).

### Testing Changes

There is no automated test framework. Use the sample files in the project root for upload testing:

| File | Purpose |
|------|---------|
| `sample-conversation.json` | Generic test conversation |
| `sample-telus-clean.json` | No hallucinations |
| `sample-telus-one-hallucination.json` | Single fabricated citation |
| `sample-telus-many-hallucinations.json` | Multiple hallucination types |

Run the smoke test script against your local server before submitting a PR:
```bash
bash scripts/test-scenarios.sh
```

---

## Issue Reporting

Use GitHub Issues for all bug reports and feature suggestions. Blank issues are disabled — please use the provided templates:

- **[Bug Report](.github/ISSUE_TEMPLATE/bug_report.yml)** — for reproducible defects
- **[Feature Suggestion](.github/ISSUE_TEMPLATE/suggestion.yml)** — for improvements or new capabilities

When filing a bug, self-classify severity using the dropdown in the template. See [`docs/beta-readiness/bug-severity-audit.md`](docs/beta-readiness/bug-severity-audit.md) for the full severity taxonomy.

---

## Triage SLA

The team commits to the following response times for all externally filed issues:

| Stage | Commitment |
|-------|-----------|
| **First response** | Within 24 hours of issue creation — a team member acknowledges the issue, may ask for clarification, and applies initial labels |
| **Triage decision** | Within 72 hours of first response — the issue is assigned a severity label and milestone, or closed with explanation |

Fix timelines by severity once triaged:

| Severity | Fix commitment |
|----------|---------------|
| Critical | Patch in progress within 24h of triage; deployed within 48h |
| High | Targeted for next sprint / milestone |
| Medium | Tracked in backlog; prioritized when sprint capacity allows |
| Low | Logged in backlog; no fixed timeline |

---

## Issue Lifecycle

Issues move through the following states:

```
needs-triage → triaged → in-progress → resolved
```

- `needs-triage` — applied automatically on issue creation; awaiting team review
- `triaged` — severity and milestone assigned; work not yet started
- `in-progress` — a team member is actively working on this
- `resolved` — fix merged and deployed, or formally deferred with documented rationale
- `wont-fix` — valid close state; explanation required in a comment

Issues with no activity for 30 days are labelled `stale` and closed after 7 additional days with a comment.

---

## Making Changes

### Branch naming

| Type | Pattern | Example |
|------|---------|---------|
| Bug fix | `fix/<short-description>` | `fix/rate-limit-header` |
| Feature | `feat/<short-description>` | `feat/analyst-annotations` |
| Documentation | `docs/<short-description>` | `docs/contributing-guide` |
| Chore | `chore/<short-description>` | `chore/update-prisma` |

### Database schema changes

If your change modifies `prisma/schema.prisma`, create a migration before committing:
```bash
npx prisma migrate dev --name <descriptive-name>
```
Commit the generated migration file alongside your schema change.

### New environment variables

If your change requires a new environment variable, document it in:
- `CLAUDE.md` (Environment Setup section)
- `README.md` (Environment Variables section)

### New API routes

Every new API route must either:
- Call `await auth()` at the top and return 401 if the session is null, or
- Be explicitly documented as intentionally public (with rationale in a code comment)

---

## Pull Request Process

1. Open a PR against the `main` branch using the PR template
2. Link the related issue (`Closes #<number>`)
3. Complete the testing checklist in the PR template
4. Request review from at least one other team member
5. Address all review comments before merging
6. Do not merge your own PR without at least one approval

Direct pushes to `main` are not permitted.

---

## Security Issues

**Do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately by messaging the team directly via the course communication channel or by emailing a team member. We will acknowledge within 24 hours and coordinate a fix before public disclosure.

For guidance on what constitutes a security issue, see [`docs/beta-readiness/security-controls.md`](docs/beta-readiness/security-controls.md).

---

## Code of Conduct

All contributors are expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project, you agree to abide by its terms.
