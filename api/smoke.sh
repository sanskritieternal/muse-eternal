#!/usr/bin/env bash
# Phase 2 smoke: boots the real server with NO database available
# (DATABASE_URL unset) and checks the specified behavior.
# Expected: /health 200, /glossary 503, /glossary/<slug> 503,
# unknown route 404 (RFC 9457), zero 500s.
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
check "unknown route" "/no-such-route" 404

echo "--- sample /glossary body ---"
curl -s "http://localhost:$PORT/glossary"
echo
echo "--- sample unknown-route body ---"
curl -s "http://localhost:$PORT/no-such-route"
echo

if [ "$FAIL" = "0" ]; then echo "SMOKE OK (zero 500s)"; else echo "SMOKE FAILED"; fi
exit $FAIL
