# Problem — Round 2: Decision-Policy Layer

**Source of truth:** human declaration (2026-09-17) + in-repo `decision-policy/`
(README.md, engine.mjs, simulate.mjs). The Stage 2 mentor brief document itself
is still not in the repo; the human has declared the four mechanisms below as
the authoritative Round 2 scope. Blocker B1 is closed on that basis.

## Context

Round 1 (FreshVoice / codemix-skill) is SHIPPED and live at
https://codemix-skill.vercel.app/ — a code-mixed (Hinglish/Indic) voice support
agent: token-level language tagging, score-based intent classification,
code-mixed voice reply + clean-English CRM ticket, three-layer fallback.

Round 2 adds a **Decision-Policy Layer** on top of it. This is the layer that
decides *what the agent does next* across a multi-turn call, and it is where the
defensible, patentable technical contribution lives.

## The four mechanisms (Section 5)

| # | Name | Core idea | Failure mode it kills |
|---|---|---|---|
| 5.1 | Strategy State Store | Persist an outcome-tagged strategy-state vector per ticket; suppress already-failed strategy families **before** a generation step is invoked | Bot repeats an apology/empathy phrase that already failed; no new branch on the 3rd identical objection |
| 5.2 | Metrics Derivation | Derive code-mix ratio + avg token length as a **byproduct** of the token array `analyseOffline()` already produces — no separate language-ID pass | Redundant LID pass costs latency on every turn |
| 5.3 | Escalation Atomicity | Payload compilation + ticket creation inside one transactional boundary with rollback | "Fake escalation": ticket exists with no context, or context with no ticket |
| 5.4 | Continuity Degradation Controller | full/reduced/offline tiers read the **same** persisted strategy-state vector | Mid-call network degradation resets strategy-fatigue tracking |

## Measured prototype results (seed 20260915, 80 tickets / 239 turns)

- 5.1 — 894 → 614 candidate-generation invocations (**31.3%** fewer)
- 5.2 — 546ns vs 5,243ns per call (**89.6%** faster), 0% metric disagreement
- 5.3 — orphaned-escalation rate @12% injected failure, n=2000: 10.25% → **0%**
- 5.4 — state continuity across 80 forced tier transitions: 100% → **0%** divergence

## Known honesty gaps (must be carried into the SDD, not buried)

1. Synthetic traffic, not live customer calls. Reduction-to-practice, not a
   production benchmark.
2. 5.1 uses category/family matching, **not** the embedding-similarity score the
   original claim language described. Claim must be narrowed to the built
   embodiment, with similarity-score as a dependent claim.
3. 5.3's 0% is a logical guarantee verified by execution, not a discovered
   empirical rate.
4. 5.4's 100%-vs-0% is a designed structural contrast, not a measured real-world
   bug frequency.
5. Claim-narrowing for 5.1 is documented only in conversation record — not yet
   folded into `SUBMISSION.md` / `ARCHITECTURE.md`.

## Chosen angle (conductor decision)

**Patentability-first SDD.** Of the available angles — (a) ship more product
surface, (b) broaden Indic language coverage, (c) formalize the Decision-Policy
Layer as a patent-grade specification with reproducible evidence — we take (c).

Rationale: demo-wow per build-hour is highest here because the prototype already
runs and already produces measured deltas. The remaining work is specification,
claim discipline, evidence reproducibility, and a thin demonstration surface —
not new algorithm invention. Lowest build risk for the 9-day prep window.

## Target users

1. **Primary — patent counsel / technical reviewer.** Needs enablement-grade
   detail: what is novel, what is prior art, what is claimed, what embodiment
   supports each claim, what evidence reduces it to practice.
2. **Secondary — hackathon judge (6 criteria: Innovation, Technical Execution,
   AI/Agentic Design, Relevance, Presentation, Impact).** Needs to see the
   mechanism run and the delta appear.
3. **Tertiary — the implementing engineer** in the 24h on-site build.

## Timeline

- Now → 2026-09-26: 9-day prep window. This SDD is the deliverable of that window.
- 2026-09-26: 24h in-person Stage 2 build, Bangalore (shortlisted teams).
- Risk carried forward: on-site rounds often hand out a *fresh* problem
  statement. The SDD must therefore be valuable as a standalone artifact, not
  only as a build plan.

## Out of scope for Round 2

- Re-architecting Round 1's transcription/TTS/intent path.
- New Indic language coverage (ROADMAP Phase 4).
- Live CRM/Freshdesk integration (ROADMAP Phase 3).
- Actual patent filing. The deliverable is a drafting-reference specification.
