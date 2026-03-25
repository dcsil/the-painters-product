#!/usr/bin/env bash
# =========================================================
# Oversight Alpha — Smoke Test Script
# =========================================================
# Usage:
#   ./scripts/test-scenarios.sh                  # run against localhost:3000
#   BASE_URL=https://your-deploy.vercel.app ./scripts/test-scenarios.sh
#
# Capture a log for stability evidence:
#   ./scripts/test-scenarios.sh | tee test-run-$(date +%Y%m%d-%H%M%S).log
#
# NOTE — Rate limit determinism:
#   Steps 4–6 (chat) consume the per-IP rate limit window (2/min).
#   If you re-run within 60 seconds, step 4 may immediately 429.
#   To reset the rate limit state between runs, clear the DB table:
#     npx prisma db execute --stdin <<< 'DELETE FROM "RateLimit";'
# =========================================================

BASE_URL="${BASE_URL:-http://localhost:3000}"
PASS=0
FAIL=0
COOKIE_JAR=$(mktemp)

# ---- helpers ----
pass() { echo "  [PASS] $1"; PASS=$((PASS+1)); }
fail() { echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }
section() { echo ""; echo "=== $1 ==="; }

check_json_field() {
  # check_json_field <json_string> <field_name>
  echo "$1" | grep -q "\"$2\""
}

# Unique test email so repeated runs don't conflict
TEST_EMAIL="alpha-test-$(date +%s)@example.com"
TEST_PASS="TestPass123!"

section "1. Health Check"
HEALTH=$(curl -s "${BASE_URL}/api/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  pass "GET /api/health → status: ok"
else
  # Degraded is still a valid response (missing optional env vars locally)
  if echo "$HEALTH" | grep -qE '"status":"(ok|degraded)"'; then
    pass "GET /api/health → responded (status: degraded — check env vars)"
  else
    fail "GET /api/health → unexpected response: $HEALTH"
  fi
fi

# Check DB specifically
if echo "$HEALTH" | grep -q '"db":true'; then
  pass "Health check: DB connectivity confirmed"
else
  fail "Health check: DB connectivity FAILED — $HEALTH"
fi

section "2. Auth — Register"
REGISTER=$(curl -s -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASS}\"}")

if echo "$REGISTER" | grep -q '"success":true\|"id":'; then
  pass "POST /api/auth/register → account created"
else
  fail "POST /api/auth/register → unexpected: $REGISTER"
fi

section "3. Auth — Sign In (get session cookie)"
# NextAuth v5 credentials flow requires a CSRF token:
# 1. GET /api/auth/csrf → extract csrfToken
# 2. POST /api/auth/callback/credentials with csrfToken

CSRF_RESPONSE=$(curl -s -c "$COOKIE_JAR" "${BASE_URL}/api/auth/csrf")
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$CSRF_TOKEN" ]; then
  curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" -L \
    -X POST "${BASE_URL}/api/auth/callback/credentials" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "email=${TEST_EMAIL}&password=${TEST_PASS}&csrfToken=${CSRF_TOKEN}&callbackUrl=%2F&json=true" \
    > /dev/null
  COOKIE_COUNT=$(wc -l < "$COOKIE_JAR" | tr -d ' ')
  if [ "$COOKIE_COUNT" -gt 2 ]; then
    pass "Sign-in: session cookie set ($COOKIE_COUNT cookie lines)"
  else
    fail "Sign-in: could not obtain session cookie after CSRF flow"
  fi
else
  fail "Sign-in: could not get CSRF token from /api/auth/csrf"
fi

section "4. Chat — Send Message (unauthenticated)"
CHAT=$(curl -s -X POST "${BASE_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, can you help me with my internet connection?"}')

if echo "$CHAT" | grep -q '"sessionId"'; then
  # Use head -1 to get only the first match (JSON response contains sessionId in multiple places)
  SESSION_ID=$(echo "$CHAT" | grep -o '"sessionId":"[^"]*"' | head -1 | cut -d'"' -f4)
  pass "POST /api/chat → sessionId: ${SESSION_ID}"
else
  fail "POST /api/chat → unexpected: $(echo "$CHAT" | head -c 200)"
fi

section "5. Chat — Second Message (same session)"
if [ -n "$SESSION_ID" ]; then
  CHAT2=$(curl -s -X POST "${BASE_URL}/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\":\"${SESSION_ID}\",\"message\":\"My internet keeps dropping every few hours.\"}")
  if echo "$CHAT2" | grep -q '"messages"'; then
    pass "POST /api/chat (session continuation) → messages array returned"
  else
    fail "POST /api/chat (session continuation) → unexpected: $(echo "$CHAT2" | head -c 200)"
  fi
else
  fail "POST /api/chat (session continuation) → skipped (no sessionId from step 4)"
fi

section "6. Chat Rate Limit — Rapid Fire"
# Fire 3 more messages rapidly; with limit of 2/min the 3rd should be a 429
# (If steps 4+5 already used 2, the next one will 429)
echo "  Sending 3 rapid chat messages to trigger rate limit..."
RL_HIT=false
for i in 1 2 3; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/chat" \
    -H "Content-Type: application/json" \
    -d '{"message":"Rate limit test message"}')
  if [ "$STATUS" = "429" ]; then
    RL_HIT=true
    pass "Chat rate limit triggered on message $i (HTTP 429)"
    break
  fi
done
if [ "$RL_HIT" = false ]; then
  fail "Chat rate limit: no 429 received after 3 rapid messages (check RATE_LIMITS config or window reset)"
fi

section "7. Upload — File Upload (authenticated)"
SAMPLE_FILE=""
for f in "sample-conversation.json" "sample-telus-clean.json"; do
  if [ -f "${f}" ]; then
    SAMPLE_FILE="${f}"
    break
  fi
done

if [ -z "$SAMPLE_FILE" ]; then
  fail "Upload test: no sample JSON file found in project root — skipping"
else
  UPLOAD=$(curl -s -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/upload" \
    -F "file=@${SAMPLE_FILE};type=application/json" \
    -F "fileName=${SAMPLE_FILE}" \
    -F "fileSize=$(wc -c < "${SAMPLE_FILE}" | tr -d ' ')")
  if echo "$UPLOAD" | grep -q '"uploadId"'; then
    UPLOAD_ID=$(echo "$UPLOAD" | grep -o '"uploadId":"[^"]*"' | cut -d'"' -f4)
    pass "POST /api/upload → uploadId: ${UPLOAD_ID}"
  elif echo "$UPLOAD" | grep -q '"error":"Unauthorized"'; then
    fail "POST /api/upload → 401 Unauthorized (session cookie not set — auth step may have failed)"
  elif echo "$UPLOAD" | grep -q '"error":"Rate limit exceeded"'; then
    pass "POST /api/upload → Rate limit hit (expected if previous runs used quota)"
  else
    fail "POST /api/upload → unexpected: $(echo "$UPLOAD" | head -c 300)"
  fi
fi

section "8. Settings — Read Preferences"
SETTINGS=$(curl -s -b "$COOKIE_JAR" "${BASE_URL}/api/settings")
if echo "$SETTINGS" | grep -q '"defaultAnalysisMode"'; then
  pass "GET /api/settings → preferences returned"
else
  fail "GET /api/settings → unexpected: $(echo "$SETTINGS" | head -c 200)"
fi

section "9. Feedback — Submit (authenticated)"
FEEDBACK=$(curl -s -b "$COOKIE_JAR" -X POST "${BASE_URL}/api/feedback" \
  -H "Content-Type: application/json" \
  -d '{"category":"general","message":"Smoke test feedback submission — automated test run"}')
if echo "$FEEDBACK" | grep -q '"success":true'; then
  pass "POST /api/feedback → success"
elif echo "$FEEDBACK" | grep -q '"error":"Unauthorized"'; then
  fail "POST /api/feedback → 401 (session issue)"
else
  fail "POST /api/feedback → unexpected: $FEEDBACK"
fi

# ---- Summary ----
echo ""
echo "========================================="
echo "  Results: ${PASS} passed, ${FAIL} failed"
echo "  Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "  Target: ${BASE_URL}"
echo "========================================="

rm -f "$COOKIE_JAR"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
