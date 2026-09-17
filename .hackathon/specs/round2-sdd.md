# SDD — Decision-Policy Layer (Round 2)

**Spec-Driven Document · Patentability-First**

| Field | Value |
|---|---|
| Document | `.hackathon/specs/round2-sdd.md` |
| Version | 1.0 (2026-09-17) |
| Status | DRAFT — awaiting DECISION phase (`spec-judge`) |
| Base system | FreshVoice / codemix-skill (Round 1, shipped, live) |
| Subject | Decision-Policy Layer: mechanisms 5.1–5.4 |
| Prep window | 2026-09-17 → 2026-09-26 (9 days) |
| Build window | 2026-09-26, 24h in-person, Bangalore |
| Source of truth | `.hackathon/problem.md`, `decision-policy/` |
| Writer | spec-author role (one writer per artifact) |

> **Reading order for patent counsel:** §1 → §3 → §6 (claims) → §7 (evidence) →
> §8 (traceability) → §11 (honesty register).
> **Reading order for a judge:** §2 → §5 → §7 → §13 (demo).
> **Reading order for the implementing engineer:** §4 → §5 → §9 → §10 → §12.

---

## 1. Field of the invention

Multi-turn conversational agents for customer support that operate over
**code-mixed speech** (intra-sentential alternation between an Indic matrix
language and English), and specifically the **decision-policy layer** that
governs which conversational strategy such an agent selects at each turn, how it
conditions its output register, how it hands off to a human, and how it behaves
under degraded network conditions.

The inventions claimed here are **not** about speech recognition, language
identification, or intent classification per se. Those are the Round 1 substrate.
The contribution is the layer that sits above them and decides *what to do next*,
and how that layer's state is persisted, derived, committed, and preserved.

---

## 2. Restated problem and target users

### 2.1 The problem

A voice support agent that can *understand* code-mixed speech still fails the
caller if its **policy** is memoryless. Four concrete failure modes, all observed
in the scenarios the Round 2 brief describes:

| Failure | What the caller experiences |
|---|---|
| **Strategy amnesia** | The bot apologises. It didn't work. Next turn it apologises again, in slightly different words. By the third identical objection there is no new branch. Trust collapses. |
| **Redundant analysis cost** | Every turn pays for a separate language-identification pass whose answer the understanding layer already computed. Latency the caller feels, on a channel where 300ms is audible. |
| **Fake escalation** | "I'm transferring you to a supervisor." A ticket is created. The context payload attach failed. A human opens a ticket with no history and asks the caller to start over. |
| **Degradation reset** | Network degrades mid-call, the agent drops to a reduced or offline tier, and the new tier's handler has its own state cache. Every strategy that already failed becomes available again. The bot restarts its apology loop at the worst possible moment. |

Each failure is independently annoying. Together they are the reason multi-turn
voice support bots are abandoned.

### 2.2 Target users

| Persona | Needs from this document | Success test |
|---|---|---|
| **P1 — Patent counsel / technical reviewer** (primary) | Enablement-grade detail; explicit independent and dependent claims; prior-art delta; what the built embodiment does and does not support | Can draft claims from §6 without asking the engineer a question, and can tell from §8 which claim is backed by which line of code |
| **P2 — Hackathon judge** (secondary) | To see the mechanism run and the delta appear, in under 4 minutes | Watches §13 demo, understands the before/after without reading code |
| **P3 — Implementing engineer** (tertiary) | An unambiguous build target for the 24h on-site window | Can start work at hour 0 with no design questions open |

### 2.3 Design constraint carried from Round 1

**Degrades, never dies.** Every mechanism specified here must have a defined
behaviour on the offline tier with no API key and no network. This is a hard
constraint, not an aspiration — it is also what makes 5.4 necessary at all.

---

## 3. Background and prior art delta

This section exists so that the novelty argument in §6 is falsifiable rather than
asserted. Each mechanism is positioned against the closest art we are aware of.

### 3.1 Closest art by mechanism

| Mechanism | Closest known art | Why it does not read on the claim |
|---|---|---|
| **5.1** Strategy-failure suppression | **Dialogue state tracking (DST)** — belief/slot tracking across turns | DST tracks *what the user said / what is believed about the world* (slots, entities, goals). It does not track *which of the agent's own strategies were tried and failed*. The tracked object is different in kind. |
| | **Repetition penalty / no-repeat-ngram in decoding** | Operates at token level, inside a single generation, within one context window. It cannot suppress a semantically equivalent strategy expressed in different words, and it does not survive a session boundary. |
| | **RL / bandit dialogue policy optimisation** | Learns a policy across a *population* of conversations, typically offline. Our suppression is online, per-ticket, and takes effect on turn 2 of a single call with n=1 evidence. No training, no convergence requirement. |
| | Human agent "don't repeat yourself" scripting | Procedural/manual, not a persisted machine-readable state vector consulted pre-generation. |
| **5.2** Byproduct-derived register conditioning | **Language identification (LID) systems**, code-switching detection, context-aware detectors | These are all *dedicated passes*: input string → tokenize → classify. The claim here is architectural: the metrics are obtained with **zero marginal passes** because the token-language array is already a required output of the understanding step. The novelty is the coupling, not the arithmetic. |
| | Feature reuse / multi-task heads in ML | Multi-task learning shares *representations inside a model*. Here the reuse is across architectural layers — the understanding layer's byproduct becomes the policy layer's control signal. |
| **5.3** Atomic escalation | **Distributed transactions, two-phase commit, saga pattern** | This is the weakest novelty position and we say so plainly (see §11). Transactional boundaries are extremely well-known. The claim must be narrowed to the *specific combination*: the transaction spans strategy-state-vector compilation (from 5.1) and external ticket creation, with a commit ordering chosen so that the impossible-state is unreachable rather than compensated after the fact. |
| **5.4** Cross-tier continuity | **Graceful degradation, failover, circuit breakers** | Standard degradation art preserves *service availability*. It does not address *policy state identity* across tiers. The specific insight — that independently-implemented tier handlers each keep their own cache and therefore silently reset strategy fatigue — is a failure mode the art does not name. |

### 3.2 The strongest position is the combination

Individually, 5.3 is vulnerable and 5.2 is an architectural argument. The
**system claim** that ties 5.1 and 5.4 to a single shared persisted
strategy-state vector — where the same vector is (a) consulted pre-generation to
suppress, (b) read identically across degradation tiers, and (c) compiled into
the escalation payload under a transactional boundary — is materially stronger
than any of its parts. **Counsel should be directed to the combination claim
first.** See Claim S-1 in §6.5.

---

## 4. In scope / out of scope

### 4.1 In scope

- Formal specification of mechanisms 5.1, 5.2, 5.3, 5.4 to enablement standard.
- Independent + dependent claim language matched to the **built** embodiment.
- A reproducible evidence harness producing per-event logs, not summary stats.
- A thin demonstration surface making the deltas visible to a non-technical judge.
- Integration contract with the Round 1 engine (`codemix.js`).
- Claim-to-code traceability matrix.
- Honest documentation of every gap between claim language and implementation.

### 4.2 Out of scope

- Re-architecting Round 1 transcription / TTS / intent classification.
- New Indic language coverage (ROADMAP Phase 4).
- Live Freshdesk / CRM integration (ROADMAP Phase 3).
- Actual patent filing or prosecution. This is a drafting reference.
- Embedding-based strategy similarity (specified as a dependent claim and a
  future embodiment; **not built** — see §11.2).
- Any claim of production or real-customer performance.

### 4.3 Explicit non-goals

- Not a benchmark paper. The numbers are reduction-to-practice evidence.
- Not a general-purpose dialogue policy framework.
- Not a replacement for human agents — 5.1's terminal branch is *escalate to one*.

---

## 5. System architecture

### 5.1 Layer position

```
  caller audio (code-mixed)
        │
        ▼
  ┌─────────────────────────────────────────────┐
  │ ROUND 1 — UNDERSTANDING SUBSTRATE           │
  │ STT → analyseOffline()/analyseLive() → merge│
  │ emits: { intent_id, entities, tokens[] }    │
  └─────────────────────────────────────────────┘
        │                          │
        │ intent_id                │ tokens[]  ◄── byproduct, already computed
        ▼                          ▼
  ┌─────────────────────────────────────────────┐
  │ ROUND 2 — DECISION-POLICY LAYER             │
  │                                             │
  │  ┌──────────────────────────────────────┐   │
  │  │ 5.1 StrategyStateStore               │◄──┼── single shared instance
  │  │  outcome-tagged vector, per ticket    │   │
  │  └──────────────────────────────────────┘   │
  │      │ getFailedFamilies()   ▲ recordOutcome│
  │      ▼                       │              │
  │  candidate pool ──► SUPPRESS ──► survivors  │
  │                       │                     │
  │                       │ (empty ⇒ forced     │
  │                       │  escalation)        │
  │      ┌────────────────┴──────────────┐      │
  │      ▼                               ▼      │
  │  5.2 register metrics          5.3 atomic   │
  │  (from tokens[])               escalation   │
  │      │                               │      │
  │      ▼                               ▼      │
  │  conditioned reply           ticket+payload │
  │                                             │
  │  5.4 ContinuityDegradationController ───────┼──► reads the SAME store
  │      full / reduced / offline               │    regardless of tier
  └─────────────────────────────────────────────┘
```

**The load-bearing architectural fact:** there is exactly one
`StrategyStateStore` instance per session, and 5.1, 5.3, and 5.4 all read it.
5.4 is not a separate state machine — it is the *absence* of one. That absence
is the invention.

### 5.2 Data model

#### 5.2.1 Strategy-state vector (the core persisted object)

```
StrategyStateEntry {
  strategyId  : string   // e.g. "empathy_phrase"
  family      : string   // equivalence class, e.g. "reassurance"
  turnIndex   : integer  // 0-based turn within the ticket
  outcome     : "resolved" | "failed"
  ts          : integer  // epoch ms
}

StrategyStateStore :  Map< ticketId , StrategyStateEntry[] >
```

The **vector** for a ticket is the ordered array of entries. It is append-only.
Its identity — not a copy of it — is what 5.4 preserves across tiers.

#### 5.2.2 Strategy family equivalence classes

This mapping is claim-relevant. It is what makes suppression semantic rather than
literal: suppressing `apology` also suppresses `empathy_phrase`, because from the
caller's point of view they are the same move.

| Family | Member strategies |
|---|---|
| `reassurance` | `apology`, `empathy_phrase` |
| `soft_commitment` | `technician_promise`, `script_repeat` |
| `resolution` | `refund_offer`, `replacement_offer`, `verify_transaction`, `reduce_call_frequency` |
| `escalation` | `escalate_supervisor`, `human_handoff` |

Unmapped strategy ids fall back to being their own singleton family
(`familyOf(x) = x`), so the mechanism is total over any strategy vocabulary.

#### 5.2.3 Register metrics (5.2 output)

```
RegisterMetrics {
  codeMixRatio : float   // hi-tagged words / (hi+en) words, ∈ [0,1]
  avgTokenLen  : float   // mean character length over hi+en words
  sampleSize   : integer // count of hi+en words; 0 ⇒ metrics are 0, undefined
}
```

`sampleSize` is mandatory in the record: a ratio computed over 2 words must not
be treated as equal in confidence to one over 40. Downstream conditioning MUST
gate on it (see §9, NFR-4).

#### 5.2.4 Degradation tier

```
Tier := "full" | "reduced" | "offline"
TierSignal { packetLossPct: float, rttMs: float, asrConfidence: float }
```

Selection function (deterministic, no hysteresis in v1 — see §11.5):

| Condition | Tier |
|---|---|
| `packetLossPct > 15` OR `rttMs > 900` | `offline` |
| `packetLossPct > 5` OR `rttMs > 400` OR `asrConfidence < 0.6` | `reduced` |
| otherwise | `full` |

#### 5.2.5 Escalation payload

```
EscalationPayload {
  ticketSummary     : string
  strategyStateVector : StrategyStateEntry[]   // ← from 5.1; this is the point
  registerMetrics   : RegisterMetrics          // ← from 5.2
  transcript        : Turn[]
}
```

That the payload *contains the strategy-state vector* is what makes 5.3 more
than a generic transaction: the human agent receives "these four moves were
already tried and failed" rather than a bare summary.

### 5.3 Internal API surface

| Symbol | Signature | Mechanism | Contract |
|---|---|---|---|
| `StrategyStateStore#recordOutcome` | `(ticketId, strategyId, outcome, turnIndex) → void` | 5.1 | Append-only. Never mutates prior entries. |
| `StrategyStateStore#getFailedFamilies` | `(ticketId) → Set<family>` | 5.1 | Derived view; MUST NOT be cached by callers. |
| `StrategyStateStore#vectorFor` | `(ticketId) → StrategyStateEntry[]` | 5.1/5.4 | Returns the vector for identity comparison and payload compilation. |
| `selectStrategySuppressed` | `(ticketId, candidates[], store) → {selected, suppressed[], generationInvocations}` | 5.1 | Filters **before** any generation call. Empty survivor set ⇒ `escalate_supervisor`. |
| `selectStrategyBaseline` | `(candidates[]) → {...}` | baseline | Deliberately memoryless. Evidence counterpart only. |
| `deriveRegisterMetricsFromTokens` | `(tokens[]) → RegisterMetrics` | 5.2 | Pure. Zero passes over the raw utterance string. |
| `deriveRegisterMetricsViaSeparateLID` | `(utterance, enWords) → RegisterMetrics` | baseline | Independent tokenization + classification. Same lexicon as treatment (see §7.3). |
| `escalateAtomic` | `(payload, backend) → {ticket, payloadAttached, orphaned, outcome}` | 5.3 | `orphaned` is unreachable by construction. Outcome ∈ {`ok`, `rolled-back`}. |
| `escalateNaive` | `(payload, backend) → {...}` | baseline | Two independent calls. Can orphan. |
| `selectTier` | `(TierSignal) → Tier` | 5.4 | Pure, deterministic. |
| `ContinuityDegradationController#getFailedFamiliesForTier` | `(ticketId, tier) → Set<family>` | 5.4 | **`tier` is accepted and deliberately ignored.** Tier-invariance is the claim. |
| `NaiveDegradationController#getFailedFamiliesForTier` | `(tier, ticketId) → Set<family>` | baseline | Per-tier cache. Models the real-world bug. |

> **Implementation note for P3:** the signature asymmetry between the continuity
> and naive controllers (`(ticketId, tier)` vs `(tier, ticketId)`) is a wart in
> the current prototype. Normalise to `(ticketId, tier)` in the hardened build,
> keeping `tier` ignored in the continuity path — the ignored parameter is
> documentation of the claim and MUST NOT be deleted.

### 5.4 External APIs

None required. The Decision-Policy Layer has **no new external dependency**.
It consumes `tokens[]` and `intent_id` from the existing Round 1 engine and
writes to a ticket backend that is abstracted behind the `FlakyTicketBackend`
interface (`createTicket()`, `attachPayload()`). This is deliberate: it keeps
the offline tier viable and removes API-death risk from the demo.

---

## 6. Claims

Claim language below is drafted **to the built embodiment**, not to the
aspiration. Where the aspiration is broader, it is preserved as a dependent
claim and flagged in §11.

### 6.1 Mechanism 5.1 — State-persisted strategy-failure suppression

**Claim 1 (independent, method).**
A computer-implemented method for controlling a multi-turn conversational agent,
comprising:

1. maintaining, for a conversation session identified by a ticket identifier, a
   persisted strategy-state vector comprising a plurality of entries, each entry
   associating a strategy identifier with (i) a strategy family identifier
   determined by mapping the strategy identifier to an equivalence class of
   functionally interchangeable strategies, (ii) a turn index, and (iii) an
   outcome label drawn from at least {resolved, failed};
2. receiving, at a subsequent turn of the session, a candidate set of strategy
   identifiers determined from a classified intent of a caller utterance;
3. deriving, from the persisted strategy-state vector, a set of failed strategy
   families comprising the family identifiers of entries whose outcome label is
   `failed`;
4. **prior to invoking a generative step for any candidate**, removing from the
   candidate set each candidate whose family identifier is a member of the set
   of failed strategy families, thereby yielding a survivor set;
5. where the survivor set is non-empty, selecting a strategy from the survivor
   set and invoking the generative step only for the selected strategy; and
6. where the survivor set is empty, bypassing the generative step and emitting a
   predetermined escalation strategy;

whereby the number of generative-step invocations over the session is reduced
relative to a memoryless selection over the same candidate sets, and a strategy
family that has previously failed within the session is not re-presented to the
caller.

> **Load-bearing limitations, for counsel:** (a) *"prior to invoking a generative
> step"* — the suppression is upstream of generation, which is both the compute
> saving and the distinction from decode-time repetition penalties; (b) *family
> equivalence class* — not exact-match, which is the distinction from trivial
> deduplication; (c) *empty survivor set ⇒ forced escalation* — the mechanism has
> a defined terminal state and cannot deadlock.

**Dependent claims.**

- **1.1** — wherein the equivalence class mapping groups at least an apology
  strategy and an empathy-phrase strategy into a common reassurance family.
- **1.2** — wherein membership in the failed-family set is determined by a
  similarity score between a candidate strategy representation and a stored
  representation of a previously-failed strategy exceeding a threshold.
  *(Not reduced to practice — see §11.2. Preserved for a future embodiment.)*
- **1.3** — wherein the outcome label of an entry is assigned by detecting a
  repeat contact on the same ticket identifier within a time window.
- **1.4** — wherein the persisted strategy-state vector is append-only and
  entries are never mutated after creation.
- **1.5** — wherein a strategy identifier absent from the equivalence class
  mapping is treated as a singleton family comprising only itself.
- **1.6** — wherein the predetermined escalation strategy of step 6 comprises
  transferring the session to a human agent together with the persisted
  strategy-state vector.

**Claim 2 (independent, system).** A system comprising one or more processors
and memory storing instructions that, when executed, cause the system to perform
the method of Claim 1.

**Claim 3 (independent, CRM).** A non-transitory computer-readable medium
storing instructions that, when executed, cause a processor to perform the
method of Claim 1.

### 6.2 Mechanism 5.2 — Byproduct-derived register conditioning

**Claim 4 (independent, method).**
A computer-implemented method for conditioning the output register of a
conversational agent operating on code-mixed speech, comprising:

1. performing, at an understanding stage, a single tokenization-and-language-
   tagging pass over a caller utterance to produce an intent classification and,
   as a byproduct of the same pass, a token array in which each token is
   associated with a language tag;
2. deriving one or more register-control metrics directly from the token array,
   the metrics comprising at least a code-mix ratio computed as the proportion
   of tokens bearing a first language tag among tokens bearing either the first
   or a second language tag, and a mean token character length;
3. recording, with the derived metrics, a sample-size value equal to the count of
   tokens contributing to the metrics;
4. conditioning generation of an agent response using the derived metrics; and
5. performing steps 2–4 **without executing any additional tokenization pass or
   language-identification pass over the utterance beyond the pass of step 1**;

whereby the register-control metrics are obtained at zero marginal analysis cost
relative to a method employing a language-identification pass separate from the
understanding stage.

> **Load-bearing limitation:** step 5. The novelty is the *absence* of a second
> pass. If a reviewer reads this claim as "computing a ratio", the claim has been
> mis-scoped — the arithmetic is trivial and admitted to be so. The claim is to
> the architectural coupling that makes the arithmetic sufficient.

**Dependent claims.**

- **4.1** — wherein the conditioning is suppressed and a default register used
  when the sample-size value is below a threshold.
- **4.2** — wherein the first language tag denotes an Indic language and the
  second denotes English, and language tagging employs a closed English
  vocabulary with an Indic-by-default fallback.
- **4.3** — wherein tokenization is Unicode-property-aware, matching
  `\p{L}\p{M}\p{N}` such that Indic combining marks are not treated as token
  delimiters.
- **4.4** — wherein the derived metrics are included in an escalation payload
  transmitted to a human agent.

### 6.3 Mechanism 5.3 — Transactionally-atomic escalation

**Claim 5 (independent, method).**
A computer-implemented method for escalating a conversational session to a human
agent, comprising:

1. compiling an escalation payload comprising at least a persisted strategy-state
   vector for the session, the vector identifying strategies previously attempted
   and their outcome labels;
2. executing, within a single transactional boundary, (i) an attach operation
   committing the compiled escalation payload and (ii) a create operation
   creating a ticket record in an external ticketing system, wherein the attach
   operation is ordered before the create operation;
3. responsive to failure of either operation, rolling back the transactional
   boundary such that neither a ticket record without an associated escalation
   payload nor a committed escalation payload without an associated ticket record
   persists; and
4. responsive to the rollback, retaining the session in an unescalated state such
   that escalation is re-attempted at a subsequent turn;

whereby the state in which a ticket record exists without caller context is
structurally unreachable rather than detected and compensated after occurrence.

> **Load-bearing limitations:** (a) the payload *is* the strategy-state vector,
> tying this claim to Claim 1 — this is what lifts it above a generic transaction;
> (b) the **ordering** (attach before create) is what makes the bad state
> unreachable rather than compensable; (c) step 4 — the session is retained, so
> rollback is not silent data loss.
>
> **Counsel warning:** absent limitations (a) and (b), this claim is likely
> anticipated by ordinary transaction/saga art. Do not file it broad. See §11.3.

**Dependent claims.**

- **5.1** — wherein the escalation payload further comprises register-control
  metrics derived according to Claim 4.
- **5.2** — wherein retention under step 4 causes the escalation strategy to
  remain in the candidate set for the subsequent turn notwithstanding the
  suppression of Claim 1.
- **5.3** — wherein throughput of successful escalations under the method is
  equal to that of a non-transactional method under an identical failure
  sequence. *(Supported by evidence — see §7.4.)*

### 6.4 Mechanism 5.4 — Multi-tier degradation with state continuity

**Claim 6 (independent, method).**
A computer-implemented method for maintaining conversational policy state across
service degradation, comprising:

1. selecting, from a plurality of operating tiers comprising at least a full
   tier, a reduced tier, and an offline tier, an active tier as a function of a
   channel-quality signal comprising at least one of packet-loss rate,
   round-trip time, and recognition confidence;
2. maintaining a single persisted strategy-state vector for a conversation
   session, the vector being stored independently of the active tier;
3. responsive to a transition from a first active tier to a second active tier
   during the session, continuing to resolve strategy-suppression queries against
   **the same** persisted strategy-state vector, without re-derivation,
   duplication, or per-tier caching of said vector; and
4. selecting a strategy at the second active tier using a failed-family set
   derived from said vector, including entries recorded while the first tier was
   active;

whereby strategy-failure history recorded before a degradation event continues to
suppress strategies after the degradation event.

> **Load-bearing limitation:** step 3's *"the same ... without re-derivation,
> duplication, or per-tier caching"*. The invention is a negative — the deliberate
> refusal to let each tier own state. In the embodiment this is visible as an
> accepted-but-ignored `tier` parameter.

**Dependent claims.**

- **6.1** — wherein the offline tier operates with no network dependency and
  resolves suppression queries against the same vector.
- **6.2** — wherein the transition is bidirectional and recovery to a higher tier
  likewise performs no re-derivation.
- **6.3** — wherein the vector is compiled into an escalation payload according
  to Claim 5 irrespective of the active tier at the time of escalation.

### 6.5 Combination claim — the strongest position

**Claim S-1 (independent, system).**
A conversational agent system comprising:

- an understanding stage producing, from a single pass over a code-mixed caller
  utterance, an intent classification and a language-tagged token array;
- a register-derivation stage deriving register-control metrics from said token
  array without an additional pass over the utterance;
- a **single** strategy-state store persisting, per session, an outcome-tagged,
  family-mapped, append-only strategy-state vector;
- a strategy-selection stage that consults said store to remove failed-family
  candidates prior to invoking a generative step, and that emits a
  predetermined escalation strategy when no candidate survives;
- a degradation controller that selects among a plurality of operating tiers as a
  function of a channel-quality signal and that resolves all strategy-selection
  queries against said single strategy-state store irrespective of the selected
  tier; and
- an escalation stage that compiles said strategy-state vector and said
  register-control metrics into an escalation payload and commits the payload and
  a ticket record within a single transactional boundary, the payload attach
  preceding the ticket create;

wherein said single strategy-state store is the sole persistence point for
strategy-outcome history and is read by the strategy-selection stage, the
degradation controller, and the escalation stage.

> **Why this is the strong one:** the final `wherein` clause is a genuine
> architectural constraint that a prior-art system assembled from independent
> DST + LID + saga + failover components would not satisfy. Each component is
> individually known; the *single shared vector read by all three consumers* is
> the non-obvious integration and is what produces all four measured effects.
> **Direct counsel here first.**

---

## 7. Reduction-to-practice evidence

### 7.1 Status

The four mechanisms are **implemented and executing** at
`/home/user/great-agent-hackathon-2026/decision-policy/engine.mjs`, with a
harness at `simulate.mjs`. Verified executing on 2026-09-17; results written to
`decision-policy/results/run-<ISO8601>.json` with full per-event logs.

Harness: seed `20260915`, 80 synthetic tickets, 239 turns, built from the
project's own `BENCHMARK_DATASET` / `HELD_OUT_DATASET` / `BLIND_DATASET`
utterances plus scripted repeat/escalation suffixes.

### 7.2 Mechanism 5.1 — generation-invocation reduction

| Quantity | Value |
|---|---|
| Tickets / turns | 80 / 239 |
| Baseline generative invocations | 894 |
| Treatment generative invocations | 614 |
| **Reduction** | **31.32%** |
| Turns on which suppression fired | 159 |

Per-event log confirms the intended behaviour, e.g. `ticket-2-1`
(`billing_dispute`): turn 0 `apology` → failed; turn 1 baseline selects `apology`
again while treatment selects `verify_transaction`; turn 2 baseline still selects
`apology` while treatment escalates. **The baseline column is a verbatim
reproduction of the Scenario-B failure mode** — this log excerpt is the single
most persuasive exhibit in the document and should be reproduced in the pitch.

**Reproducibility:** deterministic. Same seed ⇒ identical counts.

### 7.3 Mechanism 5.2 — latency delta

| Quantity | Run A (recorded in `decision-policy/README.md`) | Run B (2026-09-17, this machine) |
|---|---|---|
| Byproduct path | 546 ns/call | 303.8 ns/call |
| Separate-LID path | 5,243 ns/call | 3,646.7 ns/call |
| **Speedup** | **89.6%** | **91.67%** |
| Metric disagreement rate | 0% | 0% |
| Comparisons | — | 71,700 (239 utterances × 300 reps) |

> **⚠ FINDING — REPRODUCIBILITY DEFECT, must be fixed before the claim is relied
> upon.** The absolute nanosecond figures are **not reproducible across
> machines** — they differ by ~45% between runs. The *ratio* is stable
> (~10–12×, i.e. 89–92% faster) because both paths move together with host speed.
> **The specification therefore requires that 5.2 be claimed and reported as a
> ratio with a stated interval, never as an absolute latency.** Any external
> document (`SUBMISSION.md`, pitch, patent draft) quoting "546ns" as a property
> of the invention is making an unsupportable claim about a host machine. See
> §10, task H-2, and §11.4.

**Fairness control (important, and to our credit):** the baseline uses
`codemix.js`'s own `EN_WORDS` lexicon — the *same* lexicon as the treatment path.
An earlier draft used a hand-written 24-word lexicon, which made the separate
pass look both slower *and* less accurate; that accuracy gap was an artifact of a
weak lexicon, not a property of running a separate pass. Using an identical
lexicon on both sides isolates the single variable under test: **one pass vs two**.
The resulting 0% metric disagreement is the proof that the control worked — the
two paths compute the same answer, so only cost differs. Counsel should cite this
as evidence of experimental discipline.

### 7.4 Mechanism 5.3 — orphaned-escalation rate

n = 2,000 trials, injected failure rate 12%, identical seeded failure sequence on
both arms (`SEED+1` for both) — a paired comparison, not two independent runs.

| Outcome | Naive | Atomic |
|---|---|---|
| `ok` (ticket + context) | 1,563 | **1,563** |
| `ticket-without-context` (orphan) | **205** | 0 |
| `no-ticket-no-context` | 232 | 0 |
| `rolled-back` (clean, retryable) | — | 437 |
| **Orphan rate** | **10.25%** | **0%** |

**The strongest fact in this table is the first row.** Successful escalations are
*identical* at 1,563 on both arms. Atomicity costs **zero** throughput; it
converts 205 orphans + 232 silent failures into 437 clean, retryable rollbacks.
This is the evidence for dependent claim 5.3 and it pre-empts the obvious
reviewer objection ("your transaction must reduce escalation success rate").

**Nature of the result:** 0% is a *logical guarantee verified by execution*, not
a discovered empirical rate. Stated as such in §11.

### 7.5 Mechanism 5.4 — cross-tier state continuity

| Quantity | Value |
|---|---|
| Forced tier transitions | 80 (alternating → `offline` / → `reduced`) |
| Naive divergences | 80 (**100%**) |
| Continuity divergences | 0 (**0%**) |

Per-event log: every ticket shows `continuityKnows: true, naiveKnows: false`
after transition.

**Nature of the result:** a *designed structural contrast* demonstrating the
mechanism, not a measured real-world bug frequency. The 100% figure describes
the constructed baseline, not an observed production system. Stated in §11.

### 7.6 Evidence integrity requirements (normative)

| ID | Requirement |
|---|---|
| **EV-1** | Every reported figure MUST be regenerable by `node decision-policy/simulate.mjs` with the logged seed. |
| **EV-2** | Results files MUST retain per-event logs, not only summary statistics. |
| **EV-3** | Every treatment MUST ship a runnable baseline counterpart in the same file. A single absolute number is not evidence. |
| **EV-4** | Timing claims MUST be reported as ratios with host metadata (CPU, Node version, OS) recorded in `meta`. |
| **EV-5** | Paired comparisons MUST use an identical seeded failure sequence across arms. |
| **EV-6** | Any figure whose nature is *logical guarantee* or *designed contrast* MUST be labelled as such at every point of quotation, including slides. |

---

## 8. Claim-to-embodiment traceability

The matrix counsel needs: which claim limitation is supported by which code.

| Claim | Limitation | Embodiment | Support |
|---|---|---|---|
| 1 / step 1 | outcome-tagged, family-mapped vector | `engine.mjs` `StrategyStateStore#recordOutcome`, `STRATEGY_FAMILIES` | **Full** |
| 1 / step 3 | derive failed-family set | `StrategyStateStore#getFailedFamilies` | **Full** |
| 1 / step 4 | suppress **before** generation | `selectStrategySuppressed` — filters, then returns `generationInvocations` = survivor count | **Full** |
| 1 / step 6 | empty ⇒ forced escalation | `survivors[0] \|\| "escalate_supervisor"` | **Full** |
| 1.1 | apology + empathy → reassurance | `STRATEGY_FAMILIES` | **Full** |
| **1.2** | **similarity-score membership** | — | **NOT BUILT** (§11.2) |
| 1.4 | append-only | `recordOutcome` pushes only | **Full** |
| 1.5 | singleton fallback | `familyOf()` `\|\| strategyId` | **Full** |
| 4 / step 1 | token array as byproduct | `codemix.js` `analyseOffline()` → `.tokens` | **Full** (Round 1 substrate) |
| 4 / step 2 | metrics from token array | `deriveRegisterMetricsFromTokens` | **Full** |
| 4 / step 3 | sample size recorded | returns `sampleSize` | **Full** |
| 4 / step 4 | **conditioning generation using metrics** | — | **PARTIAL — metrics are derived and measured but not yet wired into reply generation** (§11.6) |
| 4 / step 5 | no additional pass | treatment reads `understanding.tokens`; never touches the raw string | **Full** |
| 4.3 | Unicode-aware tokenization | `codemix.js` `/[\p{L}\p{M}\p{N}']+/gu` | **Full** |
| 5 / step 1 | payload contains strategy vector | `vectorFor()` exists; **harness payload is `{ticketSummary}` only** | **PARTIAL** (§11.7) |
| 5 / step 2 | attach ordered before create | `escalateAtomic` — `attachPayload()` then `createTicket()` | **Full** |
| 5 / step 3 | rollback, no half-state | `catch` → `{ticket:null, payloadAttached:false}` | **Full** |
| 5 / step 4 | session retained for retry | — | **NOT BUILT** — retry semantics unimplemented (§11.7) |
| 5.3 | equal successful throughput | 1,563 = 1,563, §7.4 | **Full** |
| 6 / step 1 | tier from channel signal | `selectTier` | **Full** |
| 6 / step 3 | same vector, no per-tier cache | `ContinuityDegradationController` holds a store reference; `tier` ignored | **Full** |
| 6.1 | offline tier, no network | no network dependency anywhere in `engine.mjs` | **Full** |
| **S-1** | single store read by all three consumers | 5.1 + 5.4 share the instance; **5.3 does not yet read it** | **PARTIAL — closing this is the single highest-value build task** (§10, H-1) |

**Summary for counsel:** 20 limitations fully supported, 3 partial, 2 not built.
The partials are all small, well-understood wiring tasks (§10), not research.

---

## 9. Non-functional requirements

| ID | Requirement | Rationale | Test |
|---|---|---|---|
| **NFR-1** | Decision-policy overhead ≤ 1 ms per turn on the offline tier | Round 1 understanding is 0.78 ms; policy must not dominate | Harness timing |
| **NFR-2** | Zero new external API dependencies | Removes API-death demo risk; keeps offline tier viable | Static import audit |
| **NFR-3** | Full function with no API key and no network | Round 1's "degrades, never dies" constraint | Run with network disabled |
| **NFR-4** | Register conditioning MUST be gated on `sampleSize ≥ 4` | A ratio over 2 words is noise (dependent claim 4.1) | Unit test |
| **NFR-5** | All randomness seeded and the seed logged | EV-1 | Inspect `meta.seed` |
| **NFR-6** | Strategy-state vector append-only; no mutation after write | Claim 1.4; audit integrity | Unit test attempting mutation |
| **NFR-7** | Tier transition MUST NOT allocate a new state store | Claim 6 step 3 | Object-identity assertion across transition |
| **NFR-8** | Escalation MUST NOT leave a half-committed state under any injected failure | Claim 5 | 2,000-trial fault injection, assert orphans = 0 |
| **NFR-9** | Demo must run fully offline | Venue wifi is a known hackathon failure mode | Airplane-mode rehearsal |
| **NFR-10** | Results files immutable; new run ⇒ new timestamped file | Evidence integrity | Filename check |

### 9.1 Offline demo fallback

The entire Decision-Policy Layer is pure computation over local data. There is no
degraded demo path because there is no network path. If venue wifi dies, the demo
is unaffected — and that is itself a talking point for 5.4.

---

## 10. Build plan — 9-day prep window

Tasks ordered by claim value per hour. **H-1 through H-3 close traceability gaps
identified in §8 and are the highest-value work in the document.**

| ID | Task | Closes | Est. | Priority |
|---|---|---|---|---|
| **H-1** | Wire `escalateAtomic` to compile the real `vectorFor(ticketId)` into the payload | Claim 5 step 1 + **Claim S-1** | 2h | **P0** |
| **H-2** | Report 5.2 as a ratio + interval; record host metadata in `meta`; purge absolute-ns figures from all prose | EV-4, §11.4 | 2h | **P0** |
| **H-3** | Implement escalation retry-on-rollback; session retained unescalated | Claim 5 step 4 | 2h | **P0** |
| **H-4** | Fold the 5.1 claim-narrowing into `SUBMISSION.md` / `ARCHITECTURE.md` | §11.2 (open since Round 1) | 1h | **P0** |
| H-5 | Wire `RegisterMetrics` into reply generation with `sampleSize ≥ 4` gate | Claim 4 step 4, NFR-4 | 3h | P1 |
| H-6 | Unit tests for NFR-6, NFR-7, NFR-8 (identity + immutability assertions) | Evidence hardening | 3h | P1 |
| H-7 | Normalise controller signatures to `(ticketId, tier)` | §5.3 wart | 30m | P1 |
| H-8 | Demo surface: side-by-side baseline/treatment transcript viewer | §13 | 4h | P1 |
| H-9 | Multi-seed sweep (≥5 seeds) to show 5.1's ~31% is not seed-luck | Robustness | 2h | P2 |
| H-10 | Tier hysteresis to prevent flapping | §11.5 | 2h | P2 |
| H-11 | Embedding-similarity suppression as a second embodiment | Claim 1.2 | 6h | P3 — only if H-1…H-8 are done |

### 10.1 Scope ladder — the decision for `spec-judge`

| | **Option A — Evidence-complete** (recommended) | **Option B — Breadth** |
|---|---|---|
| Content | H-1 … H-8 | H-1 … H-11 incl. embeddings |
| Effort | ~17h of a 9-day window | ~25h |
| Claim outcome | Every claim filed is fully supported; 1.2 stays aspirational | 1.2 becomes supported |
| Risk | Low. All tasks are wiring, not research. | H-11 adds a model dependency, breaking NFR-2 and NFR-3 |
| Patent view | Strong. Narrow, fully-enabled claims. | Broader, but a partially-supported claim is worse than an honest dependent one |

**Recommendation to `spec-judge`: Option A.** For patentability, a narrow claim
you can fully enable beats a broad claim you cannot. H-11 also breaks the
zero-dependency property that makes the demo bulletproof offline (NFR-2/3/9),
which is a bad trade nine days before a venue with unknown wifi.

### 10.2 The 24-hour on-site cut

**Risk carried from `problem.md`:** in-person rounds frequently hand out a *fresh*
problem statement on the day. Mitigation: this SDD is written to be valuable as a
standalone artifact. If the on-site brief differs, the Decision-Policy Layer is
still a demonstrable, evidence-backed component that can be re-pointed, and §7 is
still a reproducible experimental record.

If the on-site brief matches: hours 0–4 H-1/H-2/H-3, hours 4–8 H-8, hours 8–12
H-5/H-6, hours 12–18 rehearsal + pitch, hours 18–24 buffer and freeze.

---

## 11. Honesty register

This section is deliberately prominent. Every item is a known gap between what is
claimed and what exists. **Nothing here may be quietly dropped from downstream
documents.** A patent application that overstates its embodiment is a liability;
a hackathon pitch that does so is a disqualification risk.

| ID | Gap | Impact | Disposition |
|---|---|---|---|
| **11.1** | All traffic is **synthetic** — constructed from the project's own benchmark utterances plus scripted repeat turns. Not live customer calls. | Numbers are reduction-to-practice evidence, not production performance. | State at every quotation point. Never say "in production". |
| **11.2** | 5.1 uses **category/family matching, not embedding similarity**, which the original claim language described. | Original independent claim was broader than the embodiment. | **Resolved by drafting:** Claim 1 narrowed to family matching; similarity preserved as dependent 1.2 marked NOT BUILT. Task H-4 folds this into `SUBMISSION.md`/`ARCHITECTURE.md`, where it is still unreflected. |
| **11.3** | 5.3's 0% is a **logical guarantee verified by execution**, not a discovered empirical rate. Transactional boundaries are also well-trodden art. | Weakest claim of the four. | Label the figure honestly; keep the claim narrow via the payload-content and commit-ordering limitations. Do not file broad. |
| **11.4** | 5.2's absolute ns figures are **not reproducible across machines** (546 vs 304 ns; 5,243 vs 3,647 ns). | An absolute-latency claim is unsupportable. | **New finding, this document.** Claim and report as a ratio only. Task H-2. Purge absolutes from all prose. |
| **11.5** | 5.4's 100%-vs-0% is a **designed structural contrast**, not a measured real-world bug frequency. Tier selection also has **no hysteresis** — an oscillating signal will flap tiers. | Overstating invites a fair challenge; flapping is a real defect. | Label as structural. Task H-10 for hysteresis. |
| **11.6** | Register metrics are derived and measured but **not yet wired into reply generation** (Claim 4 step 4). | Claim 4 is partially enabled. | Task H-5. Until done, do not claim the agent's register actually adapts. |
| **11.7** | Escalation payload in the harness is `{ticketSummary}` only — it does **not** yet carry the strategy-state vector. Retry-on-rollback is unimplemented. | Weakens Claim 5 step 1/step 4 **and Claim S-1**, the strongest claim. | Tasks H-1, H-3. **Highest priority in the document.** |
| **11.8** | The Stage 2 mentor brief document itself is still absent from the repo; scope rests on human declaration of 2026-09-17. | If the brief's Section 5 differs in detail, claim language may need revision. | Re-verify against the brief when available. |

---

## 12. Acceptance criteria

Testable, checkbox, demoable. Grouped by what they protect.

### 12.1 Mechanism correctness

- [ ] `node decision-policy/simulate.mjs` completes without error and writes a timestamped results file containing per-event logs.
- [ ] 5.1 reduction is ≥ 25% at seed 20260915 (observed 31.32%).
- [ ] 5.1 reduction is ≥ 20% across **all** of ≥ 5 distinct seeds (H-9).
- [ ] A per-event log excerpt exists showing baseline re-selecting a failed strategy on ≥ 3 consecutive turns while treatment diverges then escalates.
- [ ] 5.2 metric disagreement rate is 0% between byproduct and separate-LID paths using an identical lexicon.
- [ ] 5.2 speedup ratio is ≥ 8× on at least two different host machines.
- [ ] 5.3 atomic orphan count is exactly 0 over 2,000 trials at 12% injected failure.
- [ ] 5.3 atomic successful-escalation count equals naive successful-escalation count under the identical seeded failure sequence.
- [ ] 5.4 continuity divergence is exactly 0 over ≥ 80 forced tier transitions; naive baseline diverges.

### 12.2 Claim support

- [ ] Escalation payload contains the actual `vectorFor(ticketId)` output, asserted in a test (H-1).
- [ ] A rolled-back escalation leaves the session unescalated and re-attempts next turn, asserted in a test (H-3).
- [ ] Register metrics reach the reply-generation path and are gated on `sampleSize ≥ 4` (H-5).
- [ ] Object-identity assertion proves the store instance is unchanged across a tier transition (NFR-7).
- [ ] Mutation attempt on a written strategy-state entry fails or is rejected (NFR-6).
- [ ] The traceability matrix in §8 shows zero rows marked NOT BUILT other than dependent claim 1.2.

### 12.3 Evidence integrity

- [ ] Every figure in `SUBMISSION.md`, the pitch deck, and this SDD is regenerable from a logged seed.
- [ ] No absolute nanosecond figure appears in any external-facing document (H-2).
- [ ] Host metadata (CPU, Node version, OS) is recorded in `results/*.json` `meta`.
- [ ] Every "logical guarantee" and "designed contrast" figure is labelled as such at each point of quotation, **including slides**.
- [ ] `SUBMISSION.md` and `ARCHITECTURE.md` reflect the narrowed 5.1 claim (H-4).

### 12.4 Demo

- [ ] The full demo runs with networking disabled.
- [ ] A judge can see the baseline/treatment divergence without reading code.
- [ ] The demo completes in under 4 minutes.

---

## 13. Demo script hooks

Four minutes, four beats. Each beat shows a **baseline failing next to the
treatment succeeding** — never a single number.

| Beat | What the judge sees | Claim | Source |
|---|---|---|---|
| **1. The loop** (75s) | Split transcript of `ticket-2-1`. Left: bot apologises three times. Right: apology → verify transaction → escalate. Suppressed strategies greyed out with strike-through as they are removed. | 1 | §7.2 log |
| **2. The free metric** (45s) | Two counters on one utterance: passes over the string, 1 vs 2. Then the ratio bar. Say "the same answer — 0% disagreement — for one pass instead of two." **Do not say a nanosecond figure.** | 4 | §7.3 |
| **3. The fake escalation** (60s) | Inject failures live. Naive: a ticket appears with an empty context pane — "a human just picked this up knowing nothing." Atomic: clean rollback, retry next turn. Then the punchline counter: **successful escalations 1,563 vs 1,563 — it costs nothing.** | 5 | §7.4 |
| **4. The dropout** (60s) | Drag a network-quality slider to force full → offline mid-call. Naive controller's suppression list empties and the bot re-apologises. Continuity controller's list persists and the bot escalates. | 6 | §7.5 |

**Closing line (30s):** "One shared state vector, read by the strategy selector,
the degradation controller, and the escalation compiler. That's the combination
claim — and it's why all four numbers move together."

**Demo non-goals:** do not demo the Round 1 STT/TTS path (already judged in Round
1); do not show raw JSON to a non-technical judge; do not present absolute
latency figures.

---

## 14. Open questions for the human

1. **Is the Stage 2 mentor brief available?** Scope currently rests on your
   2026-09-17 declaration. If the brief's Section 5 differs in detail, §6 claim
   language needs revision (§11.8).
2. **Is a patent attorney reviewing this?** If yes, §6 and §8 are the handoff and
   should go over as-is. If no, §6 is a drafting reference only and should not be
   represented as filed or filing-ready.
3. **Confirm Option A over Option B** (§10.1), or state a preference for breadth.
4. **Was the team shortlisted for the Bangalore on-site round?** The 9-day plan
   assumes yes.
5. **Is the on-site brief expected to be fresh on the day?** This determines
   whether §10.2's contingency cut becomes the primary plan.

---

## 15. Document control

| Artifact | Writer | Status |
|---|---|---|
| `.hackathon/problem.md` | conductor | Written 2026-09-17 |
| `.hackathon/specs/round2-sdd.md` | spec-author role | **This document** |
| `.hackathon/decisions.md` | spec-judge | Pending |
| `decision-policy/engine.mjs` | backend-builder | Exists; H-1…H-7 pending |
| `SUBMISSION.md`, `ARCHITECTURE.md` | readme-submit | Stale re: 5.1 narrowing (H-4) |

One writer per artifact. After DECISION, this SDD is frozen except by numbered
amendment in `decisions.md`.
