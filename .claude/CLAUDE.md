# Hackathon factory

You are the parent session. Do not build the product yourself. Do not write specs, app code, or git history yourself.

## Boot

On the first user message, immediately invoke `hackathon-conductor` if ANY of these are true:

- they pasted a hackathon URL (Devpost, MLH, DoraHacks, Unstop, Notion, PDF, …)
- they pasted a problem statement, brief, or rubric
- they said start, run, kick off, or resume the hackathon
- `.hackathon/STATE.md` exists

Pass the user message through unchanged.

If `.hackathon/STATE.md` exists, conductor **resumes** from `phase` / `next_agent`. Do not restart at INTAKE.

Never invoke spec-author, builders, git-pusher, or devops-deploy until `hackathon-conductor` dispatches them.

## Layout

.claude/CLAUDE.md
.claude/agents/*.md
.hackathon/STATE.md
.hackathon/*.md
Create .hackathon/ if missing. Do not commit .env or secrets.

Pipeline (conductor owns this)
INTAKE → PROBLEM → RESEARCH → SPEC → DECISION → ARCHITECTURE → PLAN → DESIGN → BUILD → INTEGRATE → TEST → HARDEN → GIT → DEPLOY → SHOW → SUBMIT → FREEZE

Dispatch:

INTAKE → hackathon-intake
PROBLEM → problem-analyst then idea-generator. If multiple angles, pick highest demo-wow / lowest build risk for remaining hours. Write the choice into problem.md
RESEARCH → research-scout
SPEC → spec-author (2–3 competing specs)
DECISION → spec-judge
ARCHITECTURE → architect
PLAN → planner then pm-timebox
DESIGN → brand-namer, ux-designer, copywriter
BUILD → backend-builder and frontend-builder in parallel if paths differ, then data-seeder. On failure → debugger
INTEGRATE → integration-agent
TEST → test-runner then qa-demo-path. P0 → debugger, then re-test
HARDEN → security-linter, code-reviewer, ui-polish
GIT → git-pusher
DEPLOY → devops-deploy
SHOW → demo-director, pitch-writer, judge-simulator
SUBMIT → readme-submit then git-pusher
FREEZE → pm-timebox, scribe
Always: scribe after decisions; pm-timebox after every phase
Exit conditions
GIT: STATE.md repo_url is a real remote and the current branch is pushed
DEPLOY: STATE.md preview_url is a live http(s) URL. Markdown-only is failure. Localhost is failure
Do not skip SPEC/DECISION before BUILD
After DECISION, implement the winning spec only
After demo_freeze: true, only debugger, test-runner, git-pusher, devops-deploy, demo-director, pitch-writer, readme-submit, scribe, pm-timebox may run
git-pusher
Conductor invokes it. Builders never push.

Required:

GIT phase — first push after HARDEN
SUBMIT phase — second push so README/submit kit are on the remote
Never run git-pusher in parallel with any code writer. Never force-push main/master.

DEPLOY runs after GIT so the host can pull repo_url.

devops-deploy
Ships a running preview. It does not complete by writing a markdown plan.

Failed if: only docs were written, preview_url missing, localhost, or the URL does not respond.

Blocked (not done) if this environment cannot deploy. Record the exact missing credential/command. Do not pretend DEPLOY succeeded.

Parallelism
Safe: frontend-builder ∥ backend-builder (different paths); brand-namer ∥ ux-designer; pitch-writer ∥ demo-director after QA; security-linter ∥ test-runner.

Never: spec-author ∥ spec-judge; two writers on the same file; git-pusher ∥ any code writer; devops-deploy ∥ git-pusher.

Rules
Prefer a working golden path over a half-broken platform
One writer per artifact
Never commit secrets
Stop and set status: blocked if there is no problem statement, a required API is dead with no fallback, git push failed on secrets/auth, or SUBMIT has no preview_url and no human-approved fallback





