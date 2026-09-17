#!/bin/sh
# Deterministic secret scan for the hackathon fleet.
#
# git-pusher runs this BEFORE every commit. It is intentionally dumb: fixed
# rules, no judgement, same answer every time. The model's only job is to obey
# the exit code.
#
#   ./secret-scan.sh              scan files staged for commit (default)
#   ./secret-scan.sh --files A B  scan the named files (testing, pre-push hooks)
#   ./secret-scan.sh --all        scan every tracked file
#
# exit 0  clean
# exit 1  findings — DO NOT COMMIT
# exit 2  bad usage / not a git repo
#
# Matched values are never printed in full: only the first 4 characters and the
# length, so a scan result is safe to paste into a transcript.
#
# If `gitleaks` is on PATH it runs too, and its verdict is additive.

set -u

MODE=staged
FILES=""

while [ $# -gt 0 ]; do
  case "$1" in
    --files) MODE=files; shift; FILES="$*"; break ;;
    --all)   MODE=all; shift ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "secret-scan: unknown argument: $1" >&2; exit 2 ;;
  esac
done

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "secret-scan: not a git repository" >&2; exit 2; }

case "$MODE" in
  staged) LIST=$(git diff --cached --name-only --diff-filter=ACM) ;;
  all)    LIST=$(git ls-files) ;;
  files)  LIST=$FILES ;;
esac

FINDINGS=0

# ---------------------------------------------------------------- forbidden paths
# These never belong in a commit, whatever is inside them.
for f in $LIST; do
  case "$f" in
    *.env.example|*.env.sample|*.env.template) continue ;;
    .env|.env.*|*/.env|*/.env.*) ;;
    *.pem|*.p12|*.pfx|*.key|*.keystore|*.jks) ;;
    id_rsa|id_dsa|id_ecdsa|id_ed25519|*/id_rsa|*/id_ed25519) ;;
    credentials.json|*/credentials.json) ;;
    service-account*.json|*/service-account*.json) ;;
    *.mobileprovision|*.cer|*.der) ;;
    *) continue ;;
  esac
  echo "FORBIDDEN PATH  $f"
  FINDINGS=$((FINDINGS + 1))
done

# ---------------------------------------------------------------- value patterns
# tab-separated: severity <TAB> case-flag (i = ignore case) <TAB> rule <TAB> regex
PATTERNS=$(cat <<'PAT'
HIGH	-	aws-access-key-id	AKIA[0-9A-Z]{16}
HIGH	-	anthropic-api-key	sk-ant-[A-Za-z0-9_-]{24,}
HIGH	-	openai-api-key	sk-(proj-)?[A-Za-z0-9]{32,}
HIGH	-	github-token	gh[pousr]_[A-Za-z0-9]{36,}
HIGH	-	gitlab-token	glpat-[A-Za-z0-9_-]{20,}
HIGH	-	slack-token	xox[baprs]-[A-Za-z0-9-]{10,}
HIGH	-	google-api-key	AIza[0-9A-Za-z_-]{35}
HIGH	-	stripe-live-key	sk_live_[0-9a-zA-Z]{20,}
HIGH	-	sendgrid-key	SG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}
HIGH	-	private-key-block	BEGIN [A-Z ]*PRIVATE KEY
HIGH	i	db-url-with-password	(postgres(ql)?|mongodb(\+srv)?|mysql|redis|amqp)://[^:/ ]+:[^@ ]{6,}@
MED	-	jwt	eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+
MED	i	generic-assignment	(api[_-]?key|secret|token|passwd|password|credential)["\']?[[:space:]]*[:=][[:space:]]*["\'][^"\']{16,}["\']
PAT
)

# Values that look like secrets but are placeholders. Keep this list tight:
# a false positive costs a pause, a false negative costs a rotation.
PLACEHOLDER='YOUR_|your_|<[^>]*>|\$\{|process\.env|os\.environ|import\.meta\.env|xxxx|XXXX|CHANGEME|changeme|placeholder|PLACEHOLDER|example|EXAMPLE|dummy|DUMMY|fake|FAKE|redacted|REDACTED|\.\.\.|\*\*\*\*'

skip_file() {
  case "$1" in
    *.env.example|*.env.sample|*.env.template) return 0 ;;
    package-lock.json|yarn.lock|pnpm-lock.yaml|*/package-lock.json|*/yarn.lock) return 0 ;;
    *.min.js|*.map|*.lock|*.svg|*.png|*.jpg|*.jpeg|*.gif|*.pdf|*.woff*|*.mp4) return 0 ;;
    .claude/scripts/secret-scan.sh) return 0 ;;
    *) return 1 ;;
  esac
}

for f in $LIST; do
  [ -f "$f" ] || continue
  skip_file "$f" && continue
  grep -Iq . "$f" 2>/dev/null || continue   # skip binaries

  echo "$PATTERNS" | while IFS='	' read -r sev flag rule re; do
    [ -n "${re:-}" ] || continue
    if [ "$flag" = i ]; then GFLAGS=-nEoi; else GFLAGS=-nEo; fi
    grep "$GFLAGS" -e "$re" "$f" 2>/dev/null | while IFS=: read -r line match; do
      [ -n "${match:-}" ] || continue
      echo "$match" | grep -Eq "$PLACEHOLDER" && continue
      head=$(printf '%s' "$match" | cut -c1-4)
      len=$(printf '%s' "$match" | wc -c | tr -d ' ')
      echo "$sev  $rule  $f:$line  ${head}…(${len} chars, redacted)"
    done
  done
done > /tmp/secret-scan-hits.$$ 2>/dev/null

if [ -s /tmp/secret-scan-hits.$$ ]; then
  cat /tmp/secret-scan-hits.$$
  FINDINGS=$((FINDINGS + $(wc -l < /tmp/secret-scan-hits.$$ | tr -d ' ')))
fi
rm -f /tmp/secret-scan-hits.$$

# ---------------------------------------------------------------- gitleaks (additive)
if command -v gitleaks >/dev/null 2>&1; then
  if [ "$MODE" = staged ]; then
    gitleaks protect --staged --redact --no-banner >/dev/null 2>&1 || {
      echo "GITLEAKS  findings — run: gitleaks protect --staged --redact"
      FINDINGS=$((FINDINGS + 1)); }
  fi
fi

if [ "$FINDINGS" -gt 0 ]; then
  echo ""
  echo "secret-scan: $FINDINGS finding(s). DO NOT COMMIT."
  echo "Remove the value, replace it with an env var reference, and if it was"
  echo "ever pushed, rotate the credential — deleting the file is not enough."
  exit 1
fi

echo "secret-scan: clean ($MODE)"
exit 0
