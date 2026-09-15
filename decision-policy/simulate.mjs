/**
 * decision-policy/simulate.mjs
 *
 * Synthetic multi-turn call harness. This is real, running code measuring
 * real numbers — but against SYNTHETIC traffic (constructed from the
 * project's own benchmark utterances plus scripted escalation patterns),
 * not live customer calls. Treat the numbers below as reduction-to-practice
 * evidence for the mechanism, not as production performance claims.
 *
 * Run: node decision-policy/simulate.mjs
 */

import { CodemixSkill, BENCHMARK_DATASET, HELD_OUT_DATASET, BLIND_DATASET, EN_WORDS } from "../codemix.js";
import {
  StrategyStateStore,
  selectStrategySuppressed,
  selectStrategyBaseline,
  deriveRegisterMetricsFromTokens,
  deriveRegisterMetricsViaSeparateLID,
  mulberry32,
  FlakyTicketBackend,
  escalateNaive,
  escalateAtomic,
  selectTier,
  ContinuityDegradationController,
  NaiveDegradationController
} from "./engine.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED = 20260915; // fixed, logged seed for reproducibility
const rng = mulberry32(SEED);

const skill = new CodemixSkill();

// ---------------------------------------------------------------------------
// Candidate strategy pools per intent (Section 9's "moves tried" vocabulary)
// ---------------------------------------------------------------------------
const STRATEGY_POOLS = {
  delivery_delay: ["empathy_phrase", "technician_promise", "refund_offer", "escalate_supervisor"],
  billing_dispute: ["apology", "verify_transaction", "refund_offer", "escalate_supervisor"],
  cancellation_refund: ["apology", "verify_transaction", "refund_offer", "escalate_supervisor"],
  account_access: ["apology", "technician_promise", "human_handoff", "escalate_supervisor"],
  damaged_item: ["apology", "replacement_offer", "refund_offer", "escalate_supervisor"],
  agent_behaviour: ["apology", "human_handoff", "escalate_supervisor"],
  document_request: ["technician_promise", "human_handoff", "escalate_supervisor"],
  general_support: ["empathy_phrase", "technician_promise", "escalate_supervisor"]
};

// ---------------------------------------------------------------------------
// Build synthetic multi-turn tickets from the project's own datasets.
// Each ticket = the same caller/ticket calling back 2-4 times about the
// same unresolved issue, mirroring Scenario A / Scenario B in the brief.
// Turn text is drawn from the real dataset utterances so the "understanding"
// step (codemix.js) sees realistic code-mixed input; a scripted repeat
// suffix escalates frustration on later turns.
// ---------------------------------------------------------------------------
const REPEAT_SUFFIXES = [
  " Maine already pehle bhi bola tha, phir se kyun puch rahe ho?",
  " This is the second time I'm calling about this, nothing has changed.",
  " Naan already sonnen, edhuvum aagala innum."
];

function buildTickets() {
  const sourceItems = [...BENCHMARK_DATASET, ...HELD_OUT_DATASET, ...BLIND_DATASET];
  const tickets = [];
  sourceItems.forEach((item, idx) => {
    const turnsForTicket = 2 + (idx % 3); // 2, 3, or 4 turns per ticket
    const turns = [];
    for (let t = 0; t < turnsForTicket; t++) {
      const text = t === 0 ? item.text : item.text + REPEAT_SUFFIXES[t % REPEAT_SUFFIXES.length];
      turns.push(text);
    }
    tickets.push({
      ticketId: `ticket-${item.id}-${idx}`,
      expectedIntentId: item.expected_intent_id,
      turns
    });
  });
  return tickets;
}

// ---------------------------------------------------------------------------
// Experiment 1 — 5.1 Strategy-failure suppression: generation-call reduction
// ---------------------------------------------------------------------------
function runStrategySuppressionExperiment(tickets) {
  const store = new StrategyStateStore();
  let baselineInvocations = 0;
  let treatmentInvocations = 0;
  let suppressionEvents = 0;
  const log = [];

  for (const ticket of tickets) {
    const pool = STRATEGY_POOLS[ticket.expectedIntentId] || STRATEGY_POOLS.general_support;
    ticket.turns.forEach((utterance, turnIndex) => {
      const understanding = skill.analyseOffline(utterance);

      const baseline = selectStrategyBaseline(pool);
      baselineInvocations += baseline.generationInvocations;

      const treatment = selectStrategySuppressed(ticket.ticketId, pool, store);
      treatmentInvocations += treatment.generationInvocations;
      if (treatment.suppressed.length > 0) suppressionEvents++;

      // Scripted outcome: every turn except the last "fails" (caller calls
      // back again); the last turn resolves via escalation. This mirrors
      // Scenario A/B where repeated strategies fail until escalation.
      const isLastTurn = turnIndex === ticket.turns.length - 1;
      const outcome = isLastTurn ? "resolved" : "failed";
      store.recordOutcome(ticket.ticketId, treatment.selected, outcome, turnIndex);

      log.push({
        ticketId: ticket.ticketId, turnIndex, intent: understanding.intent_id,
        baselineSelected: baseline.selected, treatmentSelected: treatment.selected,
        suppressed: treatment.suppressed, outcome
      });
    });
  }

  const pctReduction = ((baselineInvocations - treatmentInvocations) / baselineInvocations) * 100;
  return {
    totalTickets: tickets.length,
    totalTurns: log.length,
    baselineInvocations,
    treatmentInvocations,
    suppressionEvents,
    pctReduction: Number(pctReduction.toFixed(2)),
    sampleLog: log.slice(0, 6)
  };
}

// ---------------------------------------------------------------------------
// Experiment 2 — 5.2 Byproduct-derived register conditioning: latency delta
// ---------------------------------------------------------------------------
function runRegisterConditioningExperiment(tickets, repsPerTurn = 300) {
  const utterances = tickets.flatMap(t => t.turns);
  let byproductTotalNs = 0n;
  let separateLidTotalNs = 0n;
  let comparisons = 0;
  let metricDisagreements = 0;

  // Warm-up (JIT) before timing, standard micro-benchmark hygiene.
  for (const u of utterances.slice(0, 20)) {
    const understanding = skill.analyseOffline(u);
    deriveRegisterMetricsFromTokens(understanding.tokens);
    deriveRegisterMetricsViaSeparateLID(u, EN_WORDS);
  }

  for (const utterance of utterances) {
    const understanding = skill.analyseOffline(utterance); // tokens are a byproduct of this call

    const t0 = process.hrtime.bigint();
    for (let r = 0; r < repsPerTurn; r++) deriveRegisterMetricsFromTokens(understanding.tokens);
    const t1 = process.hrtime.bigint();
    for (let r = 0; r < repsPerTurn; r++) deriveRegisterMetricsViaSeparateLID(utterance, EN_WORDS);
    const t2 = process.hrtime.bigint();

    byproductTotalNs += (t1 - t0);
    separateLidTotalNs += (t2 - t1);
    comparisons += repsPerTurn;

    const byproduct = deriveRegisterMetricsFromTokens(understanding.tokens);
    const separate = deriveRegisterMetricsViaSeparateLID(utterance, EN_WORDS);
    if (Math.abs(byproduct.codeMixRatio - separate.codeMixRatio) > 0.25) metricDisagreements++;
  }

  const byproductAvgNs = Number(byproductTotalNs) / comparisons;
  const separateAvgNs = Number(separateLidTotalNs) / comparisons;
  const pctFaster = ((separateAvgNs - byproductAvgNs) / separateAvgNs) * 100;

  return {
    utterancesTested: utterances.length,
    repsPerTurn,
    totalComparisons: comparisons,
    byproductAvgNsPerCall: Number(byproductAvgNs.toFixed(1)),
    separateLidAvgNsPerCall: Number(separateAvgNs.toFixed(1)),
    pctFaster: Number(pctFaster.toFixed(2)),
    metricDisagreements,
    metricDisagreementRatePct: Number(((metricDisagreements / utterances.length) * 100).toFixed(2))
  };
}

// ---------------------------------------------------------------------------
// Experiment 3 — 5.3 Atomic escalation payload generation: orphan rate
// ---------------------------------------------------------------------------
function runEscalationAtomicityExperiment(trials = 2000, failureRate = 0.12) {
  const rngNaive = mulberry32(SEED + 1);
  const rngAtomic = mulberry32(SEED + 1); // same seed => same failure sequence, fair comparison

  const naiveBackend = new FlakyTicketBackend(failureRate, rngNaive);
  const atomicBackend = new FlakyTicketBackend(failureRate, rngAtomic);

  let naiveOrphans = 0;
  let atomicOrphans = 0;
  let naiveOk = 0;
  let atomicOk = 0;
  const outcomes = { naive: {}, atomic: {} };

  for (let i = 0; i < trials; i++) {
    const payload = { ticketSummary: `synthetic-escalation-${i}` };
    const rNaive = escalateNaive(payload, naiveBackend);
    const rAtomic = escalateAtomic(payload, atomicBackend);
    if (rNaive.orphaned) naiveOrphans++;
    if (rAtomic.orphaned) atomicOrphans++;
    if (rNaive.outcome === "ok") naiveOk++;
    if (rAtomic.outcome === "ok") atomicOk++;
    outcomes.naive[rNaive.outcome] = (outcomes.naive[rNaive.outcome] || 0) + 1;
    outcomes.atomic[rAtomic.outcome] = (outcomes.atomic[rAtomic.outcome] || 0) + 1;
  }

  return {
    trials, failureRate,
    naiveOrphanCount: naiveOrphans,
    naiveOrphanRatePct: Number(((naiveOrphans / trials) * 100).toFixed(2)),
    atomicOrphanCount: atomicOrphans,
    atomicOrphanRatePct: Number(((atomicOrphans / trials) * 100).toFixed(2)),
    naiveOkCount: naiveOk,
    atomicOkCount: atomicOk,
    outcomeBreakdown: outcomes
  };
}

// ---------------------------------------------------------------------------
// Experiment 4 — 5.4 Cross-tier strategy-state continuity: divergence count
// ---------------------------------------------------------------------------
function runDegradationContinuityExperiment(tickets) {
  const sharedStore = new StrategyStateStore();
  const continuity = new ContinuityDegradationController(sharedStore);
  const naive = new NaiveDegradationController();

  let transitions = 0;
  let continuityDivergences = 0;
  let naiveDivergences = 0;
  const events = [];

  tickets.forEach((ticket, idx) => {
    if (ticket.turns.length < 2) return; // need at least 2 turns for a transition
    const pool = STRATEGY_POOLS[ticket.expectedIntentId] || STRATEGY_POOLS.general_support;
    const failingStrategy = pool[0];

    // Turn 1: on the "full" tier, this strategy is tried and fails.
    sharedStore.recordOutcome(ticket.ticketId, failingStrategy, "failed", 0);
    naive.recordOutcome("full", ticket.ticketId, failingStrategy, "failed");

    // Signal degrades — force a tier transition (deterministic per ticket
    // via a simple hash of index, not RNG, since this is a structural test).
    const signal = idx % 2 === 0
      ? { packetLossPct: 20, rttMs: 950, asrConfidence: 0.5 }   // -> offline
      : { packetLossPct: 8, rttMs: 500, asrConfidence: 0.55 };  // -> reduced
    const newTier = selectTier(signal);
    transitions++;

    // Turn 2 (post-transition): does each controller still know the
    // strategy failed, so it won't be re-suggested?
    const continuityKnows = continuity.getFailedFamiliesForTier(ticket.ticketId, newTier).size > 0;
    const naiveKnows = naive.getFailedFamiliesForTier(newTier, ticket.ticketId).size > 0;

    if (!continuityKnows) continuityDivergences++;
    if (!naiveKnows) naiveDivergences++;

    events.push({ ticketId: ticket.ticketId, newTier, continuityKnows, naiveKnows });
  });

  return {
    ticketsWithTransition: transitions,
    continuityDivergences,
    naiveDivergences,
    continuityDivergenceRatePct: Number(((continuityDivergences / transitions) * 100).toFixed(2)),
    naiveDivergenceRatePct: Number(((naiveDivergences / transitions) * 100).toFixed(2)),
    sampleEvents: events.slice(0, 6)
  };
}

// ---------------------------------------------------------------------------
// Run everything and write a dated, reproducible results file.
// ---------------------------------------------------------------------------
function main() {
  const tickets = buildTickets();

  const results = {
    meta: {
      seed: SEED,
      generatedAt: new Date().toISOString(),
      totalTickets: tickets.length,
      totalTurns: tickets.reduce((s, t) => s + t.turns.length, 0),
      note: "Synthetic multi-turn call harness built from the project's own BENCHMARK_DATASET/HELD_OUT_DATASET/BLIND_DATASET utterances plus scripted repeat/escalation turns. Not live customer traffic."
    },
    experiment_5_1_strategy_suppression: runStrategySuppressionExperiment(tickets),
    experiment_5_2_register_conditioning: runRegisterConditioningExperiment(tickets),
    experiment_5_3_atomic_escalation: runEscalationAtomicityExperiment(),
    experiment_5_4_degradation_continuity: runDegradationContinuityExperiment(tickets)
  };

  const outDir = path.join(__dirname, "results");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `run-${results.meta.generatedAt.replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));

  console.log("=== Decision-Policy Layer — Synthetic Benchmark Run ===");
  console.log(`seed=${SEED}  tickets=${results.meta.totalTickets}  turns=${results.meta.totalTurns}`);
  console.log("");
  console.log("-- 5.1 Strategy-Failure Suppression --");
  console.log(results.experiment_5_1_strategy_suppression);
  console.log("");
  console.log("-- 5.2 Byproduct-Derived Register Conditioning --");
  console.log(results.experiment_5_2_register_conditioning);
  console.log("");
  console.log("-- 5.3 Atomic Escalation Payload Generation --");
  console.log(results.experiment_5_3_atomic_escalation);
  console.log("");
  console.log("-- 5.4 Cross-Tier Strategy-State Continuity --");
  console.log(results.experiment_5_4_degradation_continuity);
  console.log("");
  console.log(`Full results written to: ${outFile}`);
}

main();
