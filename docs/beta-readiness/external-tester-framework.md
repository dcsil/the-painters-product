# External Tester Framework

**Version:** 1.0
**Date:** 2026-04-02
**Team:** The pAInters (CSC491)

This document defines the process for collecting, classifying, and acting on feedback from external beta testers. The framework is set up and ready for population — tester sessions have not yet been conducted.

---

## Overview

External testers validate that the product is stable, self-explanatory, and usable without team presence. Their feedback is the primary signal for determining beta readiness. This framework provides:

1. A structured onboarding template for each tester session
2. A standardized feedback table for recording and classifying issues
3. An aggregation template for summarizing cohort results
4. Clear criteria for when feedback items are promoted to GitHub issues

---

## Tester Onboarding Template

Complete one block per tester session:

```
Tester ID:        T-__ (anonymized, e.g. T-01)
Session date:     YYYY-MM-DD
Environment:      [ ] Production (Vercel)  [ ] Vercel Preview  [ ] Local
Account created:  [ ] Yes — tester self-registered  [ ] No — team provided credentials
Session duration: __ minutes

Features tested (check all that apply):
  [ ] Sign-up / login flow
  [ ] Single file upload + analysis
  [ ] Batch upload (multiple files)
  [ ] Dashboard (hallucination / bias / toxicity tabs)
  [ ] Live chatbot (/chat)
  [ ] Live monitoring dashboard (/monitor)
  [ ] Trends page
  [ ] Settings (analysis mode, alert email, bias threshold)
  [ ] Ground truth management

Starting prompt given to tester:
  [ ] Unguided — "Explore the app as if you were a new analyst"
  [ ] Scenario — (paste scenario text below)
  [ ] Followed scripts/test-scenarios.sh walkthrough

Notes / observations:
```

---

## Feedback Table

Record each distinct piece of feedback as a row. One tester session may produce multiple rows.

| ID | Tester | Date | Feature | Type | Severity | Description | Reproducible? | Status |
|----|--------|------|---------|------|---------|-------------|--------------|--------|
| FB-001 | T-01 | YYYY-MM-DD | Upload | Bug | Medium | Example placeholder | Yes | Pending |

**Column definitions:**

| Column | Values |
|--------|--------|
| **Type** | Bug / UX / Feature Request / Performance / Other |
| **Severity** | Critical / High / Medium / Low (use taxonomy from `bug-severity-audit.md`) |
| **Reproducible?** | Yes / No / Not tested |
| **Status** | Pending / Promoted to GH Issue / Resolved / Deferred / Wont-fix |

---

## Issue Promotion Criteria

Not all feedback becomes a GitHub issue. Use these rules:

| Severity | Promotion rule |
|----------|---------------|
| **Critical** | Automatically promoted to a GitHub issue within 24 hours of being recorded |
| **High** | Automatically promoted to a GitHub issue within 24 hours of being recorded |
| **Medium** | Promoted if reported independently by 2 or more testers, or if the team judges it to have outsized impact |
| **Low** | Batched into a "polish pass" issue once per week during the beta period |

When promoting a feedback item:
1. Open a GitHub issue using the Bug Report or Feature Suggestion template
2. Update the `Status` column in the feedback table to `Promoted to GH Issue` and add the issue number
3. Link the issue back to this document in the issue body if relevant

---

## Cohort Aggregation Summary Template

Complete one summary after each group of tester sessions (aim for cohorts of 3–5 testers):

```
Cohort:            Beta Cohort #__
Period:            YYYY-MM-DD to YYYY-MM-DD
Tester count:      __
Total sessions:    __
Total feedback items: __

--- Breakdown by type ---
Bug:              __
UX:               __
Feature Request:  __
Performance:      __
Other:            __

--- Breakdown by severity ---
Critical:         __
High:             __
Medium:           __
Low:              __

--- Top 3 themes ---
1.
2.
3.

--- GitHub issues opened ---
(List issue numbers and titles)

--- Items resolved before next cohort ---
(List feedback IDs and resolution summary)

--- Carryover items ---
(List unresolved Medium/Low items deferred to next cohort or backlog)
```

---

## Tester Walkthrough Guide

When giving testers an unguided starting prompt, suggest this sequence to ensure coverage of the main workflows:

1. **Sign up** for a new account (use any email/password)
2. **Upload a single file** — use `sample-telus-one-hallucination.json` from the repo (share this file)
3. **Wait for analysis** to complete and **review the dashboard** — explore all four tabs (Overview, Hallucination, Bias, Toxicity)
4. **Upload a batch** of 2–3 files with the same settings
5. **Open the chatbot** at `/chat` — have a multi-turn conversation, then click "End Chat"
6. **Check the live monitoring dashboard** at `/monitor` (requires login) — find the session just completed
7. **Configure settings** at `/settings` — change bias threshold, set an alert email
8. **Upload a ground truth** document at `/ground-truth` and re-run an upload using it

For structured testing, the `scripts/test-scenarios.sh` script covers the upload and API flows programmatically.

---

## Stability Metrics

In addition to qualitative tester feedback, collect the following quantitative signals during the beta period:

| Metric | Source | Target |
|--------|--------|--------|
| Uptime | Vercel deployment dashboard | > 99% during beta window |
| HTTP 5xx error rate | Vercel function logs | < 1% of requests |
| Upload analysis success rate | DB: `Upload.status = 'completed'` vs total | > 95% |
| Chat session completion rate | DB: `ChatSession.endedAt` not null vs total | Track baseline |
| Rate limit hit rate | DB: `RateLimit` table, 429 response count | Track; investigate spikes |

These metrics should be sampled at the start and end of each tester cohort and included in the cohort aggregation summary.
