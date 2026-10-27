#!/usr/bin/env bash
# Phase 2 + Phase 3 smoke: boots the real server with NO database
# available (DATABASE_URL unset) and checks the specified behavior.
# Expected: /health 200, /glossary 503, /glossary/<slug> 503,
# staff routes 401 without credentials, login 503 with no DB
# (auth reaches the DB before any credential check), unknown route
# 404 (RFC 9457), zero 500s.
set -u
cd "$(dirname "$0")"

npm run build > /tmp/muse-smoke-build.log 2>&1 || {
  echo "BUILD FAILED"
  tail -20 /tmp/muse-smoke-build.log
  exit 1
}

PORT=3100
env -u DATABASE_URL PORT=$PORT node dist/main.js > /tmp/muse-smoke-server.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT

code=""
for _ in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/health" || true)
  [ "$code" = "200" ] && break
  sleep 0.5
done
if [ "$code" != "200" ]; then
  echo "SERVER DID NOT BECOME HEALTHY"
  tail -20 /tmp/muse-smoke-server.log
  exit 1
fi

FAIL=0
check() { # $1 name, $2 path, $3 expected status
  local code body
  code=$(curl -s -o /tmp/muse-smoke-body.json -w "%{http_code}" "http://localhost:$PORT$2")
  body=$(cat /tmp/muse-smoke-body.json)
  if [ "$code" = "$3" ]; then
    echo "PASS $1 -> $code"
  else
    echo "FAIL $1 -> $code (expected $3) body: $body"
    FAIL=1
  fi
  if printf '%s' "$body" | grep -q '"status":500'; then
    echo "FAIL $1 body contains a 500"
    FAIL=1
  fi
}

check "health" "/health" 200
check "glossary list (no DB)" "/glossary" 503
check "glossary detail (no DB)" "/glossary/dharma" 503
check "staff glossary list (no session)" "/staff/glossary" 401
check "staff glossary detail (no session)" "/staff/glossary/dharma" 401
check "staff audit (no session)" "/staff/audit" 401
check "unknown route" "/no-such-route" 404

# Login with no DB: POST body, expect 503 (DB unreachable before any
# credential comparison — no account-existence signal leaks).
code=$(curl -s -o /tmp/muse-smoke-body.json -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" -d '{"email":"a@example.test","password":"x"}' \
  "http://localhost:$PORT/auth/login")
body=$(cat /tmp/muse-smoke-body.json)
if [ "$code" = "503" ]; then echo "PASS login (no DB) -> 503"; else
  echo "FAIL login (no DB) -> $code (expected 503) body: $body"; FAIL=1; fi

echo "--- sample /glossary body ---"
curl -s "http://localhost:$PORT/glossary"
echo
echo "--- sample unknown-route body ---"
curl -s "http://localhost:$PORT/no-such-route"
echo

if [ "$FAIL" = "0" ]; then echo "SMOKE OK (zero 500s)"; else echo "SMOKE FAILED"; fi
exit $FAIL
