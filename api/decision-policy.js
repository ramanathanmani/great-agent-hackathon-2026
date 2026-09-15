/**
 * api/decision-policy.js
 *
 * Live endpoint wiring the Round 2 "Decision-Policy Layer" mechanisms
 * (decision-policy/engine.mjs, Section 5.1/5.2/5.4 of the mentor brief)
 * into a real, callable HTTP surface for Freshworks AI Agent Studio.
 *
 * WHY THIS FILE EXISTS (honesty note): api/codemix.js only ever called
 * skill.analyseOffline() — the Round 1 rule-based understanding step. It
 * never invoked the Round 2 decision-policy mechanisms and never called
 * the live Gemini path. That gap is real; this endpoint closes it rather
 * than papering over it.
 *
 * STATELESSNESS (honesty note): a Vercel serverless function has no memory
 * between invocations, but StrategyStateStore's suppression (5.1) and the
 * continuity controller (5.4) are only meaningful if strategy-outcome state
 * persists ACROSS the turns of one call. There is no database wired up
 * here. Instead this endpoint is designed to be rehydrated: the caller
 * (the Agent Studio flow, via a conversation-scoped context variable) is
 * expected to store `strategyState` from the response and send it back as
 * `strategyState` on the next turn of the same ticket/call. This is an
 * honest trade-off for a hackathon-scale build, not an in-process database
 * pretending to be persistent. A production deployment would likely swap
 * this for Vercel KV/Upstash keyed by ticketId instead of a pass-back.
 *
 * Expected request body:
 * {
 *   "ticketId": "string (required — stable per call/conversation)",
 *   "utterance": "string (required — the caller's turn, ASR transcript)",
 *   "turnIndex": 0,                     // optional, informational
 *   "strategyState": [],                // optional — from previous turn's response.strategyState
 *   "lastStrategyOutcome": {            // optional — outcome of the PREVIOUS turn's selected strategy
 *     "strategyId": "empathy_phrase",
 *     "outcome": "failed" | "resolved"
 *   },
 *   "signal": { "packetLossPct": 0, "rttMs": 0, "asrConfidence": 1 }, // optional, for 5.4 tier selection
 *   "useLiveGemini": false              // optional — requires GEMINI_API_KEY env var
 * }
 */

import { CodemixSkill } from "../codemix.js";
import {
  StrategyStateStore,
  selectStrategySuppressed,
  deriveRegisterMetricsFromTokens,
  selectTier,
  ContinuityDegradationController,
  STRATEGY_POOLS
} from "../decision-policy/engine.mjs";

const skill = new CodemixSkill({
  locales: ["hi-IN", "ta-IN", "bn-IN", "en-IN"],
  reply_in: "caller_mix",
  record_in: "en"
});

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN ||
    (process.env.NODE_ENV === "production" ? "https://codemix-skill.vercel.app" : "*");

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: { code: "METHOD_NOT_ALLOWED", message: "Only POST requests are supported." } });
  }

  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: { code: "INVALID_PAYLOAD", message: "Request body must be a valid JSON object." } });
  }

  const ticketId = typeof body.ticketId === "string" && body.ticketId.trim() ? body.ticketId.trim() : null;
  const utterance = (typeof body.utterance === "string" ? body.utterance :
                     typeof body.text === "string" ? body.text : "").trim();

  if (!ticketId) {
    return res.status(400).json({ error: { code: "MISSING_TICKET_ID", message: "'ticketId' is required so strategy-state can be rehydrated per call." } });
  }
  if (!utterance) {
    return res.status(400).json({ error: { code: "MISSING_UTTERANCE", message: "The 'utterance' field is required and cannot be empty." } });
  }

  try {
    // --- Rehydrate persisted strategy state for THIS call (5.1 / 5.4) ---
    const store = new StrategyStateStore();
    store.loadState(ticketId, Array.isArray(body.strategyState) ? body.strategyState : []);

    // Record the outcome of whatever strategy was tried last turn, if told.
    const lastOutcome = body.lastStrategyOutcome;
    if (lastOutcome && lastOutcome.strategyId && (lastOutcome.outcome === "failed" || lastOutcome.outcome === "resolved")) {
      store.recordOutcome(ticketId, lastOutcome.strategyId, lastOutcome.outcome, (body.turnIndex || 1) - 1);
    }

    // --- Understanding step (Round 1 engine) ---
    let understanding;
    let understandingMode = "offline";
    if (body.useLiveGemini && process.env.GEMINI_API_KEY) {
      try {
        understanding = await skill.analyseLive(utterance, process.env.GEMINI_API_KEY);
        understandingMode = "live_gemini";
      } catch (liveErr) {
        // Honest fallback: don't fail the call because the live LLM path
        // errored — fall back to the deterministic offline path and say so.
        understanding = skill.analyseOffline(utterance);
        understandingMode = "offline_fallback_after_live_error";
      }
    } else {
      understanding = skill.analyseOffline(utterance);
    }

    // --- 5.2 Byproduct-derived register conditioning (no extra LID pass) ---
    const registerMetrics = deriveRegisterMetricsFromTokens(understanding.tokens || []);

    // --- 5.1 Strategy-failure suppression ---
    // NOTE: keyed off intent_id (the machine key, e.g. "delivery_delay"),
    // not `understanding.intent` (the human-readable label, e.g. "Delivery
    // delay / where is my order"). Using the label here would silently
    // collapse every ticket onto the general_support fallback pool.
    const pool = STRATEGY_POOLS[understanding.intent_id] || STRATEGY_POOLS.general_support;
    const selection = selectStrategySuppressed(ticketId, pool, store);

    // --- 5.4 Tier selection + continuity (reads the SAME store, no fork) ---
    const signal = body.signal && typeof body.signal === "object" ? body.signal : { packetLossPct: 0, rttMs: 0, asrConfidence: 1 };
    const tier = selectTier(signal);
    const continuity = new ContinuityDegradationController(store);
    const failedFamiliesAtTier = Array.from(continuity.getFailedFamiliesForTier(ticketId));

    return res.status(200).json({
      status: "success",
      understanding_mode: understandingMode,
      tier,
      freshworks_payload: {
        agent_reply: understanding.reply_mixed,
        detected_intent: understanding.intent,
        intent_confidence: understanding.confidence,
        selected_strategy: selection.selected,
        suppressed_strategies: selection.suppressed,
        ticket: {
          subject: understanding.ticket_en.subject || `Support Request: ${understanding.intent}`,
          priority: understanding.ticket_en.priority || "P2",
          body: understanding.ticket_en.summary,
          tags: ["codemix-skill", "decision-policy", tier, ...(understanding.languages || [])],
          detected_order_id: understanding.entities.order_id || null
        },
        language_metrics: {
          switch_points: understanding.switch_points,
          languages: understanding.languages,
          token_tags: understanding.tokens,
          register: registerMetrics
        },
        failed_strategy_families: failedFamiliesAtTier
      },
      // Pass this back verbatim as `strategyState` on the NEXT turn's
      // request for this same ticketId — see the stateless-rehydration
      // note at the top of this file.
      strategyState: store.serialize(ticketId),
      raw: understanding
    });
  } catch (err) {
    return res.status(500).json({ error: { code: "ANALYSIS_FAILED", message: "Failed to process code-mixed utterance.", detail: String(err && err.message || err) } });
  }
}
