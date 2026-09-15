# Decision-Policy Layer — Round 2 prototype

Reference implementation of the four mechanisms described in Section 5
("Technical Contribution — Patent-Drafting Reference") of the mentor brief,
built on top of the Round 1 engine (`../codemix.js`).

## What's here

- **`engine.mjs`** — the four mechanisms as real, runnable code:
  - 5.1 `StrategyStateStore` + `selectStrategySuppressed` — persists an
    outcome-tagged strategy-state vector per ticket and suppresses
    already-failed strategy families before they'd reach a generation step.
  - 5.2 `deriveRegisterMetricsFromTokens` — derives code-mix ratio and
    average token length directly from the token array `analyseOffline()`
    already produces, with no separate language-identification pass.
  - 5.3 `escalateAtomic` — wraps escalation-payload compilation and ticket
    creation in a single transactional boundary with rollback, so a ticket
    can't exist without its context payload or vice versa.
  - 5.4 `ContinuityDegradationController` — reads the same persisted
    strategy-state vector across full/reduced/offline tiers, so a mid-call
    degradation event doesn't reset strategy-fatigue tracking.

  Each mechanism ships with a deliberately naive baseline counterpart
  (`selectStrategyBaseline`, `deriveRegisterMetricsViaSeparateLID`,
  `escalateNaive`, `NaiveDegradationController`) so the harness below can
  report a genuine before/after delta rather than a single number.

- **`simulate.mjs`** — a synthetic multi-turn call harness built from this
  project's own `BENCHMARK_DATASET` / `HELD_OUT_DATASET` / `BLIND_DATASET`
  utterances, extended with scripted repeat/escalation turns mirroring
  Scenario A/B in the mentor brief. Seeded (`20260915`) for reproducibility.
  Run with `node decision-policy/simulate.mjs`.

- **`results/`** — timestamped JSON output from each run, kept as a dated,
  reproducible record (raw per-event logs, not just summary stats).

## Honest scope notes

This is a **reduction-to-practice artifact on synthetic traffic**, not a
production benchmark or a claim of measured real-world performance:

- Tickets are synthetically constructed from the project's own benchmark
  utterances plus scripted repeat/escalation turns — not live customer calls.
- 5.1's suppression uses category/family matching rather than the embedding
  similarity score the brief's claim language describes — a reasonable
  simplification for a hackathon-scale build, but claim language should
  either be narrowed to match this embodiment or note it as one of several.
- 5.3's 0% orphan rate is a logical guarantee verified by running the code,
  not a discovered empirical rate.
- 5.4's divergence comparison is a designed structural contrast (100% vs 0%)
  demonstrating the mechanism works, not a measured real-world bug frequency.

## Latest measured results (seed 20260915, 80 tickets / 239 turns)

| Mechanism | Metric | Result |
|---|---|---|
| 5.1 | Candidate-strategy generation reduction | 894 → 614 invocations (**31.3%** fewer) |
| 5.2 | Latency vs a separate LID pass (same lexicon both sides) | 546ns vs 5,243ns/call (**89.6%** faster), 0% metric disagreement |
| 5.3 | Orphaned-escalation rate @ 12% injected failure rate, n=2000 | Naive **10.25%** → Atomic **0%** |
| 5.4 | State-continuity across 80 forced tier transitions | Naive **100%** divergence → Continuity **0%** divergence |

See `results/*.json` for full per-event logs.

## Claim narrowing (5.1) — matched to what's built

The original Section 5.1 claim language referenced a similarity score against
stored failure vectors. The implementation here uses category/family
matching. A narrowed independent claim matching the actual embodiment, with
the similarity-score approach preserved as a dependent claim, is documented
in the mentor-brief revision history (see project conversation record) —
not yet folded back into `SUBMISSION.md`/`ARCHITECTURE.md` prose.
