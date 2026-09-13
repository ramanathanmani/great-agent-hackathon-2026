/**
 * Codemix Skill — Automated Benchmark & Verification Suite
 * Executes across Tuned Baseline (20), Extended Set (8), and Blind Generalization Set (52).
 * Verifies accuracy thresholds, entity precision, and single source of truth integrity.
 */

import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { CodemixSkill, BENCHMARK_DATASET, HELD_OUT_DATASET, BLIND_DATASET, INTENT_RULES, EN_WORDS } from "../codemix.js";

console.log("================================================================");
console.log("         CODEMIX SKILL — AUTOMATED BENCHMARK SUITE             ");
console.log("================================================================\n");

const skill = new CodemixSkill();

// Helper to benchmark dataset with detailed per-call latency
function evaluateWithLatencies(dataset) {
  let intentMatches = 0;
  let entityMatches = 0;
  let langMatches = 0;
  const latencies = [];

  for (const item of dataset) {
    const start = performance.now();
    const result = skill.analyseOffline(item.text);
    const latency = performance.now() - start;
    latencies.push(latency);

    if (result.intent_id === item.expected_intent_id) intentMatches++;
    if ((result.entities.order_id || null) === (item.expected_order || null)) entityMatches++;
    const predLang = result.languages && result.languages[0] ? result.languages[0].toLowerCase() : "";
    const expLang = item.expected_lang ? item.expected_lang.toLowerCase() : "";
    if (predLang === expLang) langMatches++;
  }

  const total = dataset.length;
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / total;
  const sorted = [...latencies].sort((a, b) => a - b);
  const medianLatency = sorted[Math.floor(total / 2)];

  const fmtPct = (m, t) => {
    const val = (m / t) * 100;
    return val % 1 === 0 ? `${val}%` : `${val.toFixed(1)}%`;
  };

  return {
    total,
    intentMatches,
    intentAccuracy: fmtPct(intentMatches, total),
    entityMatches,
    entityAccuracy: fmtPct(entityMatches, total),
    langMatches,
    langAccuracy: fmtPct(langMatches, total),
    avgLatencyMs: Math.round(avgLatency * 100) / 100,
    medianLatencyMs: Math.round(medianLatency * 100) / 100,
    latencies
  };
}

// 1. Evaluate Datasets
const tuned = evaluateWithLatencies(BENCHMARK_DATASET);
console.log("1. EVALUATING TUNED BASELINE (20 Call Utterances):");
console.log(`   - Intent Accuracy:   ${tuned.intentAccuracy} (${tuned.intentMatches}/${tuned.total})`);
console.log(`   - Entity Accuracy:   ${tuned.entityAccuracy} (${tuned.entityMatches}/${tuned.total})`);
console.log(`   - Language Accuracy: ${tuned.langAccuracy} (${tuned.langMatches}/${tuned.total})`);
console.log(`   - Latency:           ${tuned.avgLatencyMs} ms avg (${tuned.medianLatencyMs} ms median)`);

assert.equal(tuned.intentMatches, 20, "Tuned baseline intent accuracy must be 20/20 (100%)");
assert.equal(tuned.entityMatches, 20, "Tuned baseline entity precision must be 20/20 (100%)");

const extended = evaluateWithLatencies(HELD_OUT_DATASET);
console.log("\n2. EVALUATING EXTENDED TEST SET (8 Call Utterances):");
console.log(`   - Intent Accuracy:   ${extended.intentAccuracy} (${extended.intentMatches}/${extended.total})`);
console.log(`   - Entity Accuracy:   ${extended.entityAccuracy} (${extended.entityMatches}/${extended.total})`);
console.log(`   - Language Accuracy: ${extended.langAccuracy} (${extended.langMatches}/${extended.total})`);
console.log(`   - Latency:           ${extended.avgLatencyMs} ms avg (${extended.medianLatencyMs} ms median)`);

const extAccuracyNum = parseInt(extended.intentAccuracy, 10);
assert.ok(extAccuracyNum >= 85, `Extended set intent accuracy (${extAccuracyNum}%) should be >= 85%`);

const blind = evaluateWithLatencies(BLIND_DATASET);
console.log("\n3. EVALUATING EXPANDED BLIND TEST SET (52 Call Utterances):");
console.log(`   - Intent Accuracy:   ${blind.intentAccuracy} (${blind.intentMatches}/${blind.total})`);
console.log(`   - Entity Accuracy:   ${blind.entityAccuracy} (${blind.entityMatches}/${blind.total})`);
console.log(`   - Language Accuracy: ${blind.langAccuracy} (${blind.langMatches}/${blind.total})`);
console.log(`   - Latency:           ${blind.avgLatencyMs} ms avg (${blind.medianLatencyMs} ms median)`);

const blindAccuracyNum = parseInt(blind.intentAccuracy, 10);
assert.ok(blindAccuracyNum >= 90, `Blind test intent accuracy (${blindAccuracyNum}%) should be >= 90%`);

// Overall Aggregate Metrics
const allLatencies = [...tuned.latencies, ...extended.latencies, ...blind.latencies];
const totalCalls = allLatencies.length;
const totalAvgLatency = Math.round((allLatencies.reduce((a, b) => a + b, 0) / totalCalls) * 100) / 100;
allLatencies.sort((a, b) => a - b);
const totalMedianLatency = Math.round(allLatencies[Math.floor(totalCalls / 2)] * 100) / 100;
const totalEntityMatches = tuned.entityMatches + extended.entityMatches + blind.entityMatches;
const totalEntityPrecision = Math.round((totalEntityMatches / totalCalls) * 100);

// 4. Multi-script Sentiment Parsing & Integrity Checks
console.log("\n4. MULTI-SCRIPT SENTIMENT & INTEGRITY CHECKS:");
assert.ok(EN_WORDS.has("delivery"), "EN_WORDS contains 'delivery'");
assert.ok(EN_WORDS.has("order"), "EN_WORDS contains 'order'");
assert.ok(INTENT_RULES.length === 7, "All 7 closed intent rules defined");

// Multi-script sentiment checks: Tamil, Hindi, Bengali
const tamilAngry = skill.analyseOffline("Customer care was extremely rude, kovam aayiduchu enakku");
assert.equal(tamilAngry.entities.sentiment, "frustrated", "Tamil sentiment token kovam should be frustrated");

const hindiAngry = skill.analyseOffline("Mujhe bohot ghussa aa raha hai parcel tracking status nahi mila");
assert.equal(hindiAngry.entities.sentiment, "frustrated", "Hindi sentiment token ghussa should be frustrated");

const bengaliAngry = skill.analyseOffline("Ekdom খারাপ service, deliver korenni order 48211");
assert.equal(bengaliAngry.entities.sentiment, "frustrated", "Bengali sentiment token খারাপ (kharap) should be frustrated");

const calmSample = skill.analyseOffline("Please send GST invoice copy for order 48211");
assert.equal(calmSample.entities.sentiment, "concerned", "Calm query should default to concerned");

console.log("   - Tamil, Hindi, and Bengali sentiment tokens verified.");
console.log("   - Closed English vocabulary and intent definitions verified.");

console.log("\n================================================================");
// Single parseable summary line required by specification
console.log(`RESULTS: tuned ${tuned.intentMatches}/${tuned.total} (${tuned.intentAccuracy}) | extended ${extended.intentMatches}/${extended.total} (${extended.intentAccuracy}) | blind ${blind.intentMatches}/${blind.total} (${blind.intentAccuracy}) | entity-precision ${totalEntityPrecision}% | latency ${totalAvgLatency}ms avg (${totalMedianLatency}ms median)`);
console.log("================================================================\n");
