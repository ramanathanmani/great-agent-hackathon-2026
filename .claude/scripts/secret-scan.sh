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
#   ./secret-scan.sh --history    scan every commit reachable from any branch
#   ./secret-scan.sh --gitignore  check the required ignore entries are present
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
    --history) MODE=history; shift ;;
    --gitignore) MODE=gitignore; shift ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "secret-scan: unknown argument: $1" >&2; exit 2 ;;
  esac
done

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "secret-scan: not a git repository" >&2; exit 2; }

# ---------------------------------------------------------------- gitignore mode
if [ "$MODE" = gitignore ]; then
  # Ask git, do not reimplement gitignore semantics: `.env.*` already covers
  # `.env.local`, and a literal grep would report a false positive. A gate that
  # cries wolf gets ignored, which is worse than no gate.
  MISSING=0
  check() {  # check <path-to-test> <reason>
    if ! git check-ignore -q "$1" 2>/dev/null; then
      echo "NOT IGNORED   $1   ($2)"
      MISSING=$((MISSING + 1))
    fi
  }

  # Always relevant, whatever the stack.
  check .env "local secrets"
  check .env.local "local secrets"

  # Build output: only flag a directory that actually exists on disk. Inferring
  # it from a "build" script guesses wrong (a build may emit a single file), and
  # a directory that does not exist cannot be committed by accident yet.
  for d in node_modules dist build .next out target __pycache__ .venv venv coverage; do
    [ -d "$d" ] && check "$d/x" "generated, should never be committed"
  done
  true

  if [ "$MISSING" -gt 0 ]; then
    echo ""
    echo "secret-scan: $MISSING path(s) not ignored that should be."
    exit 1
  fi
  echo "secret-scan: .gitignore covers everything relevant to this stack"
  exit 0
fi

case "$MODE" in
  staged)  LIST=$(git diff --cached --name-only --diff-filter=ACM) ;;
  all)     LIST=$(git ls-files) ;;
  files)   LIST=$FILES ;;
  history) LIST=$(git log --all --pretty=format: --name-only --diff-filter=A | sort -u) ;;
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

# ---------------------------------------------------------------- history mode
# A secret deleted in a later commit is still in the history and still leaked.
# Scans every added line reachable from any branch and attributes it to a commit.
if [ "$MODE" = history ]; then
  NCOMMITS=$(git rev-list --all --count 2>/dev/null || echo 0)
  echo "secret-scan: scanning $NCOMMITS commit(s) of history"
  PATFILE=$(mktemp); printf '%s\n' "$PATTERNS" > "$PATFILE"
  HITS=$(git log --all -p --unified=0 --no-color --format='commit %H' 2>/dev/null |
    awk -v patfile="$PATFILE" -v ph="$PLACEHOLDER" '
      BEGIN {
        n = 0
        while ((getline ln < patfile) > 0) {
          if (ln == "") continue
          split(ln, a, "\t")
          n++; sev[n] = a[1]; flg[n] = a[2]; rule[n] = a[3]; re[n] = a[4]
        }
      }
      /^commit [0-9a-f]+$/ { sha = substr($2, 1, 8); next }
      /^\+\+\+ b\// { file = substr($0, 7); next }
      /^\+/ && !/^\+\+\+/ {
        line = substr($0, 2)
        if (line ~ ph) next
        for (i = 1; i <= n; i++) {
          probe = (flg[i] == "i") ? tolower(line) : line
          if (match(probe, re[i])) {
            head = substr(line, RSTART, 4)
            printf "%s  %s  commit %s  %s  %s…(%d chars, redacted)\n",
                   sev[i], rule[i], sha, file, head, RLENGTH
            next
          }
        }
      }
    ' | sort -u)
  rm -f "$PATFILE"
  if [ -n "$HITS" ]; then
    echo "$HITS"
    FINDINGS=$((FINDINGS + $(printf '%s\n' "$HITS" | wc -l | tr -d ' ')))
  fi
fi

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
  [ "$MODE" = history ] && break
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
