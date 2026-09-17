# STATE

<!--
CANONICAL SCHEMA. One key per line, `key: value`. No nesting.
hackathon-conductor is the ONLY agent that writes this file.
Every other agent ends its turn with a HANDOFF block; the conductor merges it.
Empty value = unknown. Never delete a key; leave it empty.
-->

phase: INTAKE
status: idle
hackathon_url:
hours_total:
hours_remaining:
winner_spec:
stack:
repo_url:
preview_url:
blockers: []
last_agent:
next_agent: hackathon-conductor
demo_freeze: false

<!--
phase        : INTAKE|PROBLEM|RESEARCH|SPEC|DECISION|ARCHITECTURE|PLAN|DESIGN|
               BUILD|INTEGRATE|TEST|HARDEN|GIT|DEPLOY|SHOW|SUBMIT|FREEZE
status       : idle|running|blocked|done
hackathon_url: official event URL from intake.md
hours_total  : integer hours from kickoff to submission deadline
hours_remaining: integer; conductor recomputes from the deadline in intake.md
winner_spec  : path, e.g. .hackathon/specs/b.md (set by DECISION only)
stack        : one line, e.g. "Next.js 15 + SQLite + Vercel"
repo_url     : https remote URL; must be a real reachable remote, not a path
preview_url  : https URL that returned 2xx/3xx to curl; localhost is INVALID
blockers     : [] or ["one line per blocker"]
last_agent   : agent name that just finished
next_agent   : agent name the conductor will dispatch next
demo_freeze  : true|false; true => only the freeze allowlist in CLAUDE.md may run
-->
