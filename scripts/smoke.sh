#!/bin/sh
set -eu

API_URL="${AIGATE_SMOKE_API_URL:-http://localhost:8080}"
GATEWAY_URL="${AIGATE_SMOKE_GATEWAY_URL:-http://localhost:8081}"
FRONTEND_URL="${AIGATE_SMOKE_FRONTEND_URL:-http://localhost:5173}"

curl --fail --silent --show-error "$API_URL/healthz"
curl --fail --silent --show-error "$API_URL/readyz"
curl --fail --silent --show-error "$GATEWAY_URL/healthz"
curl --fail --silent --show-error "$GATEWAY_URL/readyz"
curl --fail --silent --show-error "$FRONTEND_URL/healthz"
printf '\nAiGate compose smoke passed.\n'
