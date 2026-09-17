# 001 — Decision-Policy Layer: Requirements

Status: Draft
Owner: Ramanathan Manikandan & Sadhana Shanmugam
Constitution principles touched: 3 (degrade, never fail), 4 (zero-dependency core), 5 (honest numbers), 7 (traceability)

## Context
Round 1 (`codemix.js`) understands a single code-mixed utterance. It has no memory
across turns of the same ticket, so a caller who phones back three times gets the
same apology three times, escalations can be half-created when a backend call fails,
and a mid-call network degradation throws away whatever the agent had learned.

The Round 2 prototype in `decision-policy/` (`engine.mjs`, `simulate.mjs`) implements
four mechanisms against these failures. This spec is written *retroactively* from that
prototype so the behaviour is pinned down, the gaps are named, and future changes are
reviewed against requirements rather than against the code.

## Goals
- Stop re-offering a strategy family that already failed on the same ticket.
- Derive caller register metrics without a second language-identification pass.
- Guarantee an escalation is either complete (ticket + context) or absent.
- Keep strategy-failure memory intact when the call drops to a lower quality tier.
- Produce reproducible, honestly labelled evidence for each mechanism.

## Non-goals
- Embedding-based strategy similarity (family matching only in this spec; see open questions).
- A real ticket backend, persistence across process restarts, or multi-instance state.
- Evaluation on live customer traffic.
- Wiring the layer into `api/`, `mcp-server/`, or `index.html` (future spec).

## Requirements

### REQ-DP-001: Per-ticket strategy outcome memory
**User story:** As a support agent skill, I want every strategy I try on a ticket recorded with its outcome, so that later turns can avoid what already failed.

**Acceptance criteria**
- WHEN `recordOutcome(ticketId, strategyId, outcome, turnIndex)` is called THE SYSTEM SHALL append an entry containing `strategyId`, its `family`, `turnIndex`, `outcome`, and a timestamp to that ticket's history.
- THE SYSTEM SHALL map strategies to families using `STRATEGY_FAMILIES` (e.g. `apology` and `empathy_phrase` → `reassurance`); an unmapped strategy SHALL be its own family.
- WHEN `getFailedFamilies(ticketId)` is called THE SYSTEM SHALL return exactly the set of families with at least one `failed` outcome for that ticket, and an empty set for an unknown ticket.
- THE SYSTEM SHALL keep histories of different tickets fully isolated.

Verify: pending (T-001)

### REQ-DP-002: Suppress failed strategy families before generation
**User story:** As a caller who is calling back, I want the agent to try something different, so that I am not given the same failed response again.

**Acceptance criteria**
- WHEN `selectStrategySuppressed(ticketId, candidates, store)` is called THE SYSTEM SHALL remove every candidate whose family is in the ticket's failed-family set *before* any generation step, and report them in `suppressed`.
- THE SYSTEM SHALL select the first surviving candidate, preserving the caller-supplied priority order.
- IF every candidate is suppressed THEN THE SYSTEM SHALL select `escalate_supervisor` and report `generationInvocations = 1`.
- THE SYSTEM SHALL report `generationInvocations` equal to the number of surviving candidates (minimum 1).

Verify: pending (T-001)

### REQ-DP-003: Register metrics derived from existing tokens
**User story:** As a reply generator, I want the caller's code-mix ratio and average word length, so that I can match their register without paying for another language-ID pass.

**Acceptance criteria**
- WHEN `deriveRegisterMetricsFromTokens(tokens)` is given the `tokens` array from `analyseOffline()` THE SYSTEM SHALL compute `codeMixRatio` = Indic words / (Indic + English words), `avgTokenLen` over those words, and `sampleSize` = their count, ignoring `xx` tokens.
- THE SYSTEM SHALL NOT re-tokenize or re-read the raw utterance.
- IF there are no Indic or English words THEN THE SYSTEM SHALL return `{ codeMixRatio: 0, avgTokenLen: 0, sampleSize: 0 }`.

Verify: pending (T-002)

### REQ-DP-004: Parity with a separate language-ID pass
**User story:** As a reviewer of the latency claim, I want the byproduct path and the separate-pass baseline to agree on the metrics, so that the comparison isolates cost rather than accuracy.

**Acceptance criteria**
- THE SYSTEM SHALL have the baseline `deriveRegisterMetricsViaSeparateLID(utterance, enWords)` use the same `EN_WORDS` lexicon as `codemix.js`.
- WHEN both paths run over every utterance in the tuned, extended, and blind datasets THE SYSTEM SHALL produce `codeMixRatio` values within 0.25 of each other for 100% of utterances.
- WHEN latency is reported THE SYSTEM SHALL include a JIT warm-up and state the repetitions per utterance.

Verify: pending (T-002)

### REQ-DP-005: Atomic escalation
**User story:** As a human supervisor receiving an escalation, I want every ticket to arrive with its context payload, so that I never pick up an empty "fake" escalation.

**Acceptance criteria**
- WHEN `escalateAtomic(payload, backend)` completes with outcome `ok` THE SYSTEM SHALL have both a ticket and an attached payload.
- IF payload attachment fails THEN THE SYSTEM SHALL NOT create a ticket and SHALL return outcome `rolled-back`.
- IF ticket creation fails after the payload was attached THEN THE SYSTEM SHALL invoke a compensating discard on the backend and SHALL return outcome `rolled-back`.
- THE SYSTEM SHALL never return `orphaned: true` from `escalateAtomic`, for any injected failure rate in [0, 1].
- WHEN the naive and atomic paths are compared THE SYSTEM SHALL drive both with identically seeded failure sequences.

Verify: pending (T-003)

### REQ-DP-006: Degradation tier selection
**User story:** As the call controller, I want a deterministic tier from network and ASR signals, so that behaviour under poor conditions is predictable and testable.

**Acceptance criteria**
- WHEN `packetLossPct > 15` OR `rttMs > 900` THE SYSTEM SHALL select `offline`.
- WHEN not offline AND (`packetLossPct > 5` OR `rttMs > 400` OR `asrConfidence < 0.6`) THE SYSTEM SHALL select `reduced`.
- OTHERWISE THE SYSTEM SHALL select `full`.
- Boundary values (exactly 15, 900, 5, 400, 0.6) SHALL fall into the *better* tier.

Verify: pending (T-004)

### REQ-DP-007: Strategy memory survives tier transitions
**User story:** As a caller whose connection degrades mid-call, I want the agent to remember what already failed, so that the fallback tier does not repeat it.

**Acceptance criteria**
- THE SYSTEM SHALL back every tier with one shared `StrategyStateStore` instance via `ContinuityDegradationController`.
- WHEN a family fails on tier `full` and the call transitions to `reduced` or `offline` THE SYSTEM SHALL report that family as failed on the new tier.
- WHEN the naive per-tier controller is used as the baseline THE SYSTEM SHALL be documented as a deliberately constructed contrast, not a measured bug rate.

Verify: pending (T-005)

### REQ-DP-008: Reproducible synthetic harness
**User story:** As a judge or mentor, I want to re-run the evidence and get the same numbers, so that I can trust the claims.

**Acceptance criteria**
- THE SYSTEM SHALL seed all randomness from a single logged seed (currently `20260915`).
- WHEN run twice with the same seed THE SYSTEM SHALL produce identical results for experiments 5.1, 5.3 and 5.4 (5.2 timings excepted).
- THE SYSTEM SHALL write a JSON results file containing seed, ticket and turn counts, and a note that traffic is synthetic.
- WHEN run with `--check` THE SYSTEM SHALL exit non-zero if any mechanism violates its acceptance thresholds (5.1 reduction > 0, 5.3 atomic orphans = 0, 5.4 continuity divergence = 0, 5.2 disagreement = 0), and SHALL NOT write a results file.
- The location of results files SHALL be either committed or git-ignored, and `decision-policy/README.md` SHALL say which.

Verify: pending (T-006)

### REQ-DP-009: Honest reporting of decision-policy results
**User story:** As a reader of the submission, I want to know which numbers are measured and which are true by construction, so that I am not misled.

**Acceptance criteria**
- THE SYSTEM SHALL label 5.3 (0% orphans) and 5.4 (0% divergence) as structural guarantees in every document that cites them.
- THE SYSTEM SHALL label 5.1's reduction as dependent on the scripted outcome model (every turn fails except the last).
- THE SYSTEM SHALL state in SUBMISSION.md and ARCHITECTURE.md that 5.1 uses family matching, not embedding similarity.
- WHEN any decision-policy number is cited THE SYSTEM SHALL cite the seed and the command that reproduces it.

Verify: pending (T-007)

## Non-functional requirements
- **NFR-1 Zero dependencies:** `engine.mjs` and `simulate.mjs` import only Node built-ins and `../codemix.js` (constitution §4).
- **NFR-2 Speed:** the full harness completes in under 30 s on a CI runner.
- **NFR-3 Purity:** engine functions other than store mutation and backend calls are side-effect free.

## Known gaps in the current prototype (drive the tasks)
1. There are no automated tests for `engine.mjs`; `simulate.mjs` prints results but asserts nothing.
2. `escalateAtomic` has no compensating discard, so REQ-DP-005's third criterion is unmet.
3. There is no `--check` mode, and `decision-policy/results/` is referenced in its README but is neither committed nor git-ignored.
4. SUBMISSION.md and ARCHITECTURE.md don't yet contain the narrowed 5.1 claim wording.

## Open questions
- **Q1:** Should a future spec replace family matching with embedding similarity, or narrow the claim permanently?
- **Q2:** Should strategy state persist beyond process lifetime (e.g. keyed to the Freshdesk ticket ID)?
- **Q3:** Which surface integrates the layer first: `api/`, `mcp-server/`, or the demo UI?
