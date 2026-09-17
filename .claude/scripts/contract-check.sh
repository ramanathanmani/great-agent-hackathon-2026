#!/bin/sh
# Verify the running app against .hackathon/contract.json.
#
# The seams between frontend, backend and third-party services are where
# hackathons die, and they die silently: the app compiles, the page renders,
# and the endpoint returns the wrong shape. This turns "walk the golden path
# and hope you noticed" into a gate.
#
#   ./contract-check.sh [contract.json] [base-url]
#
# exit 0  every declared endpoint, env var and CORS rule holds
# exit 1  at least one failed
# exit 2  contract missing or malformed
#
# The contract is written by `architect` and is the single source of truth for
# the seams. Builders code to it; this script decides whether they did.

set -u
CONTRACT=${1:-.hackathon/contract.json}
[ -f "$CONTRACT" ] || { echo "contract-check: no $CONTRACT (architect writes it)"; exit 2; }
jq -e . "$CONTRACT" >/dev/null 2>&1 || { echo "contract-check: $CONTRACT is not valid JSON"; exit 2; }

BASE=${2:-$(jq -r '.base // "http://localhost:3000"' "$CONTRACT")}
FAIL=0
PASS=0

say_pass() { PASS=$((PASS+1)); echo "  PASS  $1"; }
say_fail() { FAIL=$((FAIL+1)); echo "  FAIL  $1"; }

# ------------------------------------------------------------------ endpoints
N=$(jq '.endpoints // [] | length' "$CONTRACT")
echo "contract-check: $N endpoint(s) against $BASE"
i=0
while [ "$i" -lt "$N" ]; do
  M=$(jq -r ".endpoints[$i].method // \"GET\"" "$CONTRACT")
  P=$(jq -r ".endpoints[$i].path" "$CONTRACT")
  WANT=$(jq -r ".endpoints[$i].expect_status // 200" "$CONTRACT")
  BODY=$(jq -r ".endpoints[$i].body // empty" "$CONTRACT")
  i=$((i+1))

  TMP=$(mktemp)
  if [ -n "$BODY" ]; then
    GOT=$(curl -sS -X "$M" -H 'Content-Type: application/json' -d "$BODY" \
          -o "$TMP" -w '%{http_code}' --max-time 10 "$BASE$P" 2>/dev/null)
  else
    GOT=$(curl -sS -X "$M" -o "$TMP" -w '%{http_code}' --max-time 10 "$BASE$P" 2>/dev/null)
  fi

  if [ "$GOT" != "$WANT" ]; then
    say_fail "$M $P  status $GOT, contract says $WANT"
    rm -f "$TMP"; continue
  fi

  # declared top-level response keys must be present
  KEYS=$(jq -r ".endpoints[$((i-1))].expect_keys // [] | .[]" "$CONTRACT")
  MISSING=""
  for k in $KEYS; do
    jq -e --arg k "$k" 'has($k)' "$TMP" >/dev/null 2>&1 || MISSING="$MISSING $k"
  done
  if [ -n "$MISSING" ]; then
    say_fail "$M $P  status ok but response is missing:$MISSING"
  else
    say_pass "$M $P  $GOT"
  fi
  rm -f "$TMP"
done

# ----------------------------------------------------------------------- CORS
ORIGIN=$(jq -r '.cors.allowed_origins[0] // empty' "$CONTRACT")
if [ -n "$ORIGIN" ]; then
  FIRST=$(jq -r '.endpoints[0].path // "/"' "$CONTRACT")
  ACAO=$(curl -sS -I -H "Origin: $ORIGIN" --max-time 10 "$BASE$FIRST" 2>/dev/null \
         | tr -d '\r' | awk -F': ' 'tolower($1)=="access-control-allow-origin"{print $2}')
  if [ -z "$ACAO" ]; then
    say_fail "CORS  no Access-Control-Allow-Origin for $ORIGIN (browser calls will fail)"
  elif [ "$ACAO" = "*" ] && [ "$(jq -r '.cors.credentials // false' "$CONTRACT")" = true ]; then
    say_fail "CORS  wildcard with credentials — browsers reject this combination"
  else
    say_pass "CORS  $ACAO"
  fi
fi

# ------------------------------------------------------------------- env vars
if [ -f .env.example ]; then
  for v in $(jq -r '.env // [] | .[].name' "$CONTRACT"); do
    grep -q "^$v=" .env.example 2>/dev/null \
      && say_pass "env   $v declared in .env.example" \
      || say_fail "env   $v is in the contract but missing from .env.example"
  done
else
  [ "$(jq '.env // [] | length' "$CONTRACT")" -gt 0 ] && say_fail "env   .env.example does not exist"
fi

# ---------------------------------------------------------------- mock ledger
LIVE=$(jq -r '.mocks // [] | map(select(.status != "live")) | length' "$CONTRACT")
if [ "$LIVE" -gt 0 ]; then
  echo "  NOTE  $LIVE mock(s) still active:"
  jq -r '.mocks // [] | .[] | select(.status != "live") | "          " + .name + "  (" + .path + ")"' "$CONTRACT"
fi

echo ""
if [ "$FAIL" -gt 0 ]; then
  echo "contract-check: $PASS passed, $FAIL FAILED"
  exit 1
fi
echo "contract-check: $PASS passed, 0 failed"
exit 0
