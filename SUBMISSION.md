# Devpost Submission — FreshVoice by Freshworks

---

## Project Name

FreshVoice

## Tagline

The caller switches language mid-sentence. The ticket stays in English.

## Track

Track 1 — Customer & Employee Experience

## Video Demo Link

https://youtu.be/aGfRv_katxU

## Live Demo URL

https://codemix-skill.vercel.app/

---

## Problem

Indian customers don't speak one language on a support call. They start a sentence in Tamil and finish it in English. They switch to Hindi when they get frustrated. They drop English product and courier names into an Indic sentence.

Voice agents today advertise 70+ languages. But in practice, "language support" means picking one language per call. The moment a caller switches mid-sentence, the agent mishears the intent or asks the customer to repeat. That is where support calls break down and customer satisfaction collapses.

This hits Indian SMBs and CX teams hardest: their callers are the most likely to code-mix naturally, and their support desks cannot afford massive multi-lingual staffing for every regional dialect.

## Solution

We built **FreshVoice** — an autonomous voice AI engine for Freshworks customer support that sits between speech recognition and intent execution:

* **Listens Naturally:** The caller speaks freely, code-mixing English with regional languages (Hinglish, Tanglish, Benglish, etc.).
* **Intra-Sentential Tagging:** Detects language switch points *inside* individual sentences, not just a broad call-level language tag.
* **Unified Intent Resolution:** Resolves a single, deterministic customer intent and extracts critical entities (order ID, sentiment, urgency).
* **Bilingual Agent Response:** The agent replies immediately in the caller's own language mix to maintain empathy and rapport.
* **English Ticket Generation:** Automatically formats and logs a structured English ticket directly into Freshdesk via the Freshdesk Ticket API, ensuring company records, routing, and reporting stay standardized in English.

**The core thesis:** The customer speaks how they naturally speak, and the enterprise records stay clean, audited, and unified in one language.

Because it is packaged as a reusable skill module rather than a closed bot, any platform agent (support, sales, HR, or custom Freddy AI workflows) can import it.

## How We Built It

* **Speech-to-Text:** ElevenLabs Scribe v1 for speech transcription without forcing a single predetermined language upfront, with automatic browser Web Speech API fallback.
* **Understanding Layer:** Gemini 3.6 Flash for zero-shot token tagging, intent extraction, and English ticket drafting.
* **Voice Synthesis:** ElevenLabs Multilingual v2 to synthesize natural spoken responses mirroring the caller's dialect, with browser SpeechSynthesis fallback.
* **Zero-Dependency Core Engine (`codemix.js`):** A standalone, weighted n-gram scoring engine that executes with sub-millisecond median latency and 100% offline reliability.
* **Freshworks Freshdesk Ticket API (`api/create-ticket.js`):** Creates real Freshdesk tickets with mapped priorities, sentiment tags, and clean English descriptions.
* **Freshworks Freddy AI Endpoint (`api/codemix.js`):** Vercel serverless API ready for Freshworks Agent Studio and Freddy AI integration.
* **Model Context Protocol (`mcp-server/`):** Exposes `analyse_codemixed_call` as a standard MCP tool over stdio, allowing Claude Desktop, Cursor, and any MCP-compatible agent to process code-mixed calls.
* **Automated Benchmark Suite (`test/benchmark.test.mjs`):** CI-verified evaluation suite verifying intent, entity, and language accuracy across 80 realistic support calls.

## Evaluation Protocol & Measured Results

To prove this is a reliable production skill rather than an unverified prompt, we built an automated evaluation suite testing three distinct, disjoint datasets spanning 80 support calls:
1. **Tuned Baseline (20 calls):** Realistic multi-sentence customer support calls in Hinglish and Tanglish with order tracking, billing queries, and account issues.
2. **Extended Test Set (8 calls):** Utterances evaluated alongside rule formulation to check boundary conditions.
3. **Expanded Blind Generalization Test Set (52 calls):** A genuinely blind evaluation set with keyword rules kept completely untouched, testing generalization across 6 Indian languages: **Hindi, Tamil, Bengali, Telugu, Marathi, and Kannada**.

### Closed Intent Set Evaluated:
The engine classifies each utterance into one of 7 mutually exclusive customer support intents:
1. `delivery_delay` — Order not delivered, tracking stale (Priority: P2)
2. `billing_dispute` — Duplicate charge, refund requested (Priority: P1)
3. `cancellation_refund` — Cancelled order, amount still deducted (Priority: P1)
4. `account_access` — Cannot log in, reset link expired (Priority: P2)
5. `damaged_item` — Damaged product received, replacement needed (Priority: P2)
6. `agent_behaviour` — Support agent misbehaviour or abrupt disconnection (Priority: P1)
7. `document_request` — Tax invoice or warranty document request (Priority: P3)

### Entity Precision Definition:
Entity extraction precision measures exact normalized match of the 5-digit order identifier (e.g., `48211`, `33417`, `99120`, `55102`, `77841`) and customer sentiment classification (`frustrated` vs. `concerned`).

### Verified Test Suite Output (`npm test`):
```text
RESULTS: tuned 20/20 (100%) | extended 7/8 (87.5%) | blind 50/52 (96.2%) | entity-precision 100% | latency 3.67ms avg (0.29ms median)
```

| Metric | Tuned Baseline (20 Calls) | Extended Test Set (8 Calls) | Blind Test Set (52 Calls) |
|---|---|---|---|
| **Intent Classification Accuracy** | **20 / 20 (100%)** | **7 / 8 (87.5%)** | **50 / 52 (96.2%)** |
| **Language Identification Accuracy** | **19 / 20 (95.0%)** | **7 / 8 (87.5%)** | **48 / 52 (92.3%)** |
| **Entity Extraction Precision** | **20 / 20 (100%)** | **8 / 8 (100%)** | **52 / 52 (100%)** |
| **Median Execution Latency** | **0.34 ms** | **0.16 ms** | **0.29 ms** |
| **Offline Reliability / Uptime** | **100% (Zero Dependencies)** | **100% (Zero Dependencies)** | **100% (Zero Dependencies)** |

## Freshworks Alignment

FreshVoice was engineered specifically for Freshworks Platform 3.0 ecosystems:
* **Freshdesk Ticket API (`api/create-ticket.js`):** Instantly creates structured support tickets directly in Freshdesk. Formats priority (Urgent/High/Medium), maps caller emotions into sentiment tags, attaches the English ticket summary for auditability, and preserves the raw code-mixed transcript.
* **Freddy AI & Agent Studio Ready (`api/codemix.js`):** Provides a clean JSON REST endpoint compatible with Freshworks Agent Studio AI Actions, emitting structured `freshworks_payload` with agent replies, token tags, and switch points.
* **Open MCP Interoperability (`mcp-server/`):** Exposes `analyse_codemixed_call` as a Model Context Protocol tool for integration into modern enterprise multi-agent workflows.

## Challenges & Engineering Insights

1. **Unicode Script Tokenization:** Standard regex tokenizers (`\w+`) are ASCII-centric and shredded Indic scripts (like Tamil `உரையாடல்`) into individual detached characters, destroying word boundaries. We engineered a Unicode-aware tokenizer using Unicode property escapes (`[\p{L}\p{M}\p{N}']+`) to preserve complex ligatures and vowel signs.
2. **The Lexicon Inversion Insight:** Most multilingual systems attempt to list Indic words and default everything else to English. Because Indian languages have virtually infinite inflected word forms while customer support English is a small, closed vocabulary (~150 words), we inverted the detection logic: English is our closed set, and unknown tokens default to Indic.
3. **Resilience & Graceful Degradation:** During development, a cloud API 503 error temporarily halted the demo. We engineered a three-layer degradation strategy: Gemini retries with exponential backoff before falling back to our deterministic offline engine; ElevenLabs gracefully degrades to the browser voice; and partial model responses are safely merged with base extractions.

## Honest Limitations & What's Next

* **Streaming ASR Classification:** The current implementation operates on completed utterance chunks; next milestone is word-by-word streaming token classification directly over live audio streams for sub-50ms conversational turnaround.
* **Expanded Dialect Lexicons:** Extending coverage to deeper regional colloquialisms in Gujarati and Malayalam.
* **Multi-Tenant Key Management:** Moving browser-held demonstration keys to an enterprise proxy vault for production deployments.

---

## Why Should We Select You

We are two engineers building for the millions of callers who communicate exactly like our own families.

When exploring the hackathon space, we noticed many teams building wrappers around standard chatbots. But none solved the fundamental breaking point in Indian CX: **what happens when a caller switches languages within a single sentence?**

In less than 48 hours, we delivered a comprehensive, end-to-end solution:
1. A live, zero-install web console running on Vercel with real-time token tagging and voice feedback.
2. A single-source-of-truth JavaScript skill module (`codemix.js`) that runs identically in browsers, Node.js, and serverless environments.
3. A real Freshdesk ticketing integration logging structured English summaries from mixed speech.
4. An open MCP server for immediate interoperability with modern AI agent tooling.
5. An automated 80-utterance benchmark suite proving 96.2% blind classification accuracy and 100% entity precision with sub-millisecond execution.

We built a practical, resilient, and thoroughly validated capability that solves a genuine problem in modern customer service.

---

## Team

* **Ramanathan Manikandan** — [Devpost](https://devpost.com/ramanathan-manikandan)
* **Sadhana Shanmugam** — [Devpost](https://devpost.com/sadhanashanmugam-cse2025)

## Links

* **Live Demo:** https://codemix-skill.vercel.app/
* **Demo Video:** https://youtu.be/aGfRv_katxU
* **GitHub Repository:** https://github.com/ramanathanmani/great-agent-hackathon-2026
