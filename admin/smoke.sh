#!/usr/bin/env bash
# Phase 3 admin smoke: builds, starts the real admin app, and checks
# the unauthenticated redirect behavior.
# Expected: /glossary 307 to /login, /login 200, zero 500s.
# (The API need not run: the login page is static and the redirect
# is middleware-only.)
set -u
cd "$(dirname "$0")"

npm run build > /tmp/muse-admin-smoke-build.log 2>&1 || {
  echo "BUILD FAILED"
  tail -20 /tmp/muse-admin-smoke-build.log
  exit 1
}

PORT=3200
PORT=$PORT npm run start -- -p $PORT > /tmp/muse-admin-smoke-server.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT

code=""
for _ in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/login" || true)
  [ "$code" = "200" ] && break
  sleep 0.5
done
if [ "$code" != "200" ]; then
  echo "SERVER DID NOT BECOME READY"
  tail -20 /tmp/muse-admin-smoke-server.log
  exit 1
fi

FAIL=0
# Unauthenticated /glossary must redirect to /login (middleware).
redir=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" "http://localhost:$PORT/glossary")
if [ "$redir" = "307 http://localhost:$PORT/login" ]; then
  echo "PASS /glossary without session -> $redir"
else
  echo "FAIL /glossary without session -> $redir (expected 307 .../login)"
  FAIL=1
fi

code=$(curl -s -o /tmp/muse-admin-smoke-body.html -w "%{http_code}" "http://localhost:$PORT/login")
if [ "$code" = "200" ]; then echo "PASS /login -> 200"; else
  echo "FAIL /login -> $code"; FAIL=1; fi

code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/glossary/dharma")
if [ "$code" = "307" ]; then echo "PASS /glossary/[slug] without session -> 307"; else
  echo "FAIL /glossary/[slug] without session -> $code (expected 307)"; FAIL=1; fi

if grep -q " 500 \|Internal Server Error" /tmp/muse-admin-smoke-server.log; then
  echo "FAIL server log contains a 500"
  FAIL=1
else
  echo "PASS server log has zero 500s"
fi

if [ "$FAIL" = "0" ]; then echo "ADMIN SMOKE OK"; else echo "ADMIN SMOKE FAILED"; fi
exit $FAIL
