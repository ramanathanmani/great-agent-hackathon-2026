# 000 — FreshVoice System: Software Requirements Specification

Status: Draft
Owner: Ramanathan Manikandan & Sadhana Shanmugam
Version: 1.1 (baseline of `main` @ 14df722; team decisions D-1…D-3 applied)
Constitution principles touched: all (1–7)
Companion documents: [`design.md`](design.md) (Software Design Description) · [`tasks.md`](tasks.md) (implementation plan) · [`../001-decision-policy-layer/`](../001-decision-policy-layer/requirements.md)

> **How to read this document.** Every requirement has a stable ID, a MoSCoW
> `Priority`, a `Current` assessment of the code at the baseline commit
> (`Met` / `Partial` / `Unmet`), EARS-style acceptance criteria, and a `Verify:`
> line naming the test that proves it today and/or the task that will add one.
> `npm run check:specs` enforces this structure in CI.

---

## 1. Introduction

### 1.1 Purpose
This SRS defines what FreshVoice must do, how well it must do it, and how each
requirement is verified. It is the reference for code review, test design,
hackathon judging claims, and all future changes (constitution §1).

### 1.2 Product scope
FreshVoice is a **reusable skill**, not a standalone bot. It takes one support
utterance in which an Indian caller switches between an Indic language and English
*inside a sentence*, and it:

1. tags every word by language and counts the intra-sentential switch points,
2. understands the call — one intent, order ID, sentiment and urgency — **primarily with Gemini**, with the deterministic offline engine as an always-available backup,
3. drafts a reply in the caller's own language mix, and
4. writes an **English-only** ticket, pushed to Freshdesk on request.

It is delivered through four surfaces that share one `analyse()` orchestrator: an
importable JS module, Vercel HTTP endpoints, an MCP tool, and a zero-setup web demo.
**All third-party API keys live on the server**; visitors never enter keys.

**In scope:** Gemini understanding and the backup engine, server-side proxies for
Gemini and ElevenLabs, browser voice fallbacks, the HTTP APIs, the MCP server, the demo
UI, benchmarks for both understanding paths, build/CI, security and privacy. The
decision-policy layer is specified separately in 001.

**Out of scope (this version):** multi-intent utterances, streaming STT, real CRM/order
lookup, persistent conversation state, Freshworks marketplace packaging, analytics.

### 1.3 Stakeholders
| Stakeholder | Interest |
|---|---|
| Caller (end customer) | Be understood without switching to one language; get a relevant reply |
| Support agent / supervisor | Receive a clean English ticket with correct priority and context |
| Integrating developer | Call the API/MCP tool or import the skill with a stable contract |
| Hackathon judges & mentors | Open the demo with zero setup; trust every published number |
| Maintainers (team) | Change prompts and rules safely, with fast deterministic tests |
| Account owner (Gemini, ElevenLabs, Freshdesk) | No quota abuse, no spam tickets, keys never exposed |

### 1.4 Definitions & acronyms
| Term | Meaning |
|---|---|
| Code-mixing | Using two languages within one utterance, here intra-sentential |
| Switch point | A boundary between consecutive word tokens tagged with different languages (`hi`↔`en`) |
| `hi` tag | "Indic" — *any* Indic-language word (Hindi, Tamil, Bengali, …), not only Hindi |
| `xx` tag | Number or punctuation token |
| Romanized | An Indic language written in English letters, e.g. `nahi hua` instead of `नहीं हुआ` |
| Closed English lexicon | `EN_WORDS`: ~150 support-call English words; any other Latin word is treated as Indic |
| **Primary understanding** | Gemini analysis via `analyseLive`, validated against the result schema |
| **Backup engine** | `analyseOffline` — deterministic, rule-based, no network; used when Gemini is unavailable or invalid, and to fill gaps |
| `analyse()` | The single orchestrator: Gemini first, backup on failure, validated merge |
| `intent_source` | `gemini` or `backup` — which path produced the result |
| Proxy | A FreshVoice server endpoint that calls Gemini/ElevenLabs with a server-held key |
| Tuned / Extended / Blind set | 20 / 8 / 52 labelled utterances in `codemix.js`; rules and prompts may be tuned on the first, were written alongside the second, and must never be tuned on the third |
| EARS | Easy Approach to Requirements Syntax (`WHEN … THE SYSTEM SHALL …`) |
| STT / TTS | Speech-to-text / text-to-speech |
| MCP | Model Context Protocol |

### 1.5 References
`README.md`, `ARCHITECTURE.md`, `docs/technical-design.md`, `docs/fallback-strategy.md`,
`ROADMAP.md`, `SUBMISSION.md`, `mcp-server/README.md`, `specs/constitution.md`,
`specs/001-decision-policy-layer/`.

---

## 2. Overall description

### 2.1 Product perspective
```
Visitor ─voice/text─▶ Demo UI (index.html, no keys)
                          ├─▶ /api/codemix ─▶ analyse() ─┬─▶ Gemini (primary, server key)
                          │                              └─▶ backup engine (on failure)
                          ├─▶ /api/stt, /api/tts, /api/voices ─▶ ElevenLabs (server key)
                          └─▶ /api/create-ticket ─▶ analyse() ─▶ Freshdesk (on explicit request)
Agent platforms ─HTTP + token─▶ /api/codemix, /api/create-ticket
MCP clients ─stdio─▶ mcp-server ─▶ analyse() (Gemini if GEMINI_API_KEY set, else backup)
Static copy (no server) ─▶ backup engine in the browser + browser voice
```

### 2.2 User classes
- **Visitor:** uses the hosted demo; no keys and no setup.
- **Server integrator:** calls the HTTP API with a FreshVoice API token.
- **MCP client:** Claude, Cursor and similar, run locally with optional `GEMINI_API_KEY`.
- **Maintainer:** runs tests, CI, the live benchmark and the spec check.

### 2.3 Operating environment
- Browsers: any modern browser for the hosted demo; Chrome/Edge for browser voice fallbacks.
- Node.js ≥ 18 (global `fetch`) for the module, API, tests and MCP server; CI runs Node 20 and 22.
- Vercel serverless (Node runtime) for `api/`; static hosting for the rest.

### 2.4 Constraints
- **C-1:** The engine (`codemix.js`, including `analyse()`) has zero runtime npm dependencies (constitution §4).
- **C-2:** `codemix.js` is the single source of truth; `codemix.cjs` is generated (§2).
- **C-3:** Gemini and ElevenLabs quotas cost money or are rate-limited, so the Gemini benchmark runs on demand, not in CI.
- **C-4:** Third-party API keys exist only in server environment variables (D-2).

### 2.5 Assumptions & dependencies
- **A-1:** An utterance is a single support turn of ≤ 2,000 characters.
- **A-2:** Order and transaction IDs are 5 digits in the demo CRM fixture.
- **A-3:** Gemini honours `responseMimeType: application/json` most of the time, but not always, so every response is validated.
- **A-4:** Freshdesk API v2 ticket semantics (priority 1–4, status 2 = Open, source 3 = Phone) stay stable.
- **A-5:** Vercel may run several instances of a function; in-memory state is per instance (see Q-2).

---

## 3. Functional requirements

Requirements `REQ-ENG-*` describe the **backup engine**. It must stay complete and
deterministic because it is the safety net for every call and the source of token tags,
the rule table, and gap-filling for Gemini results.

### REQ-ENG-001: Unicode tokenization and language tagging
Priority: Must
Current: Met
**User story:** As an integrator, I want every word tagged `hi`, `en`, or `xx`, so that I can see exactly where the caller switches language.

**Acceptance criteria**
- THE SYSTEM SHALL split the utterance with `/[\p{L}\p{M}\p{N}']+|[^\s\p{L}\p{M}\p{N}]/gu`, preserving token order.
- WHEN a token is all digits or contains no letter THE SYSTEM SHALL tag it `xx`.
- WHEN a token contains a character from any of the 9 Indic script blocks THE SYSTEM SHALL tag it `hi` and record the script.
- WHEN a Latin token's lower-case form is in `EN_WORDS` THE SYSTEM SHALL tag it `en`; otherwise `hi`.
- THE SYSTEM SHALL NOT split native-script words into single characters (e.g. `கோபம்` stays one token).

Verify: pending (T-008)

### REQ-ENG-002: Intra-sentential switch-point count
Priority: Must
Current: Met
**User story:** As an analyst, I want the number of language switches, so that I can quantify how mixed a call is.

**Acceptance criteria**
- THE SYSTEM SHALL count one switch point each time a `hi`/`en` token differs from the previous `hi`/`en` token, skipping `xx` tokens.
- WHEN the utterance contains only one language THE SYSTEM SHALL report `switch_points = 0`.

Verify: pending (T-008)

### REQ-ENG-003: Weighted score-based intent resolution
Priority: Must
Current: Met
**User story:** As a support agent, I want an intent even when Gemini is unavailable, so that the ticket is still routed.

**Acceptance criteria**
- THE SYSTEM SHALL evaluate all 7 `INTENT_RULES` (`delivery_delay`, `billing_dispute`, `cancellation_refund`, `account_access`, `damaged_item`, `agent_behaviour`, `document_request`).
- THE SYSTEM SHALL add a group's weight at most once per rule when any keyword in that group matches.
- WHEN a keyword is Latin THE SYSTEM SHALL match it case-insensitively on Unicode word boundaries (so `pin` does not match `shipping`); WHEN a keyword is in an Indic script THE SYSTEM SHALL match it as a substring.
- THE SYSTEM SHALL select the highest-scoring rule; IF two rules tie THEN the rule declared first SHALL win.
- IF the best score is below 3 THEN THE SYSTEM SHALL return `intent_id = "general_support"` with priority `P3`.
- THE SYSTEM SHALL expose the winning score as `intent_score`.

Verify: `test/benchmark.test.mjs`; pending (T-008)

### REQ-ENG-004: Order / transaction ID extraction
Priority: Must
Current: Partial
**User story:** As a support agent, I want the order number pulled out, so that I don't have to ask the caller again.

**Acceptance criteria**
- WHEN the utterance contains a standalone 5-digit number THE SYSTEM SHALL return it as `entities.order_id`; otherwise `null`.
- WHEN several 5-digit numbers are present THE SYSTEM SHALL prefer one within 3 tokens after `order`, `id`, `transaction`, or `number`, before falling back to the first. *(Gap: today it always takes the first.)*
- THE SYSTEM SHALL NOT extract a number immediately preceded by `₹`, `rs`, or `inr`, or followed by `rupees`. *(Gap.)*
- THE SYSTEM SHALL keep 100% entity precision on all three datasets.

Verify: `test/benchmark.test.mjs`; pending (T-016)

### REQ-ENG-005: Sentiment detection
Priority: Should
Current: Partial
**User story:** As a supervisor, I want frustrated callers flagged, so that tone-sensitive tickets get attention.

**Acceptance criteria**
- WHEN the utterance contains a frustration marker in Latin script (e.g. `rude`, `fraud`, `ghussa`, `kovam`) or native script (`கோபம்`, `गुस्सा`, `খারাপ`) THE SYSTEM SHALL return `sentiment = "frustrated"`; otherwise `"concerned"`.
- THE SYSTEM SHALL NOT mark an utterance frustrated on a neutral filler alone (`yaar`, `scene`). *(Gap: both currently trigger.)*
- THE SYSTEM SHALL pass the Tamil, Hindi, and Bengali sentiment checks and the calm-query check in the benchmark suite.

Verify: `test/benchmark.test.mjs`; pending (T-017)

### REQ-ENG-006: Urgency derived from priority
Priority: Must
Current: Met
**User story:** As a routing system, I want urgency as a simple level, so that I can queue tickets.

**Acceptance criteria**
- THE SYSTEM SHALL map priority `P1` → `high`, `P2` → `medium`, `P3` → `low`.

Verify: pending (T-008)

### REQ-ENG-007: Primary Indic language identification
Priority: Must
Current: Met
**User story:** As an analyst, I want the named Indic language, so that I can report which communities are calling.

**Acceptance criteria**
- WHEN native-script tokens are present THE SYSTEM SHALL name the first detected script's language.
- OTHERWISE THE SYSTEM SHALL test the romanized marker-word lists in the order Tamil → Bengali → Marathi → Hindi and name the first match.
- THE SYSTEM SHALL return `languages = [<Indic>, "English"]`, or `["English"]` when no Indic language is found.
- THE SYSTEM SHALL reach ≥ 95% primary-language accuracy on the tuned set and ≥ 90% on the blind set (see REQ-BEN-003).

Verify: pending (T-009)

### REQ-ENG-008: Meaningful backup confidence
Priority: Should
Current: Unmet
**User story:** As an agent platform, I want the backup engine's confidence to reflect how sure the intent is, so that I can decide when to ask a clarifying question.

**Acceptance criteria**
- THE SYSTEM SHALL derive backup `confidence` from the intent score and its margin over the runner-up, not from the switch-point count. *(Gap: today `switch_points > 2 ? "high" : "medium"`.)*
- WHEN `intent_id = "general_support"` THE SYSTEM SHALL return `confidence = "low"`.
- WHEN best score ≥ 8 AND margin over runner-up ≥ 3 THE SYSTEM SHALL return `"high"`; otherwise `"medium"`.
- THE SYSTEM SHALL choose these thresholds using the tuned set only (D-3).

Verify: pending (T-018)

### REQ-ENG-009: Backup reply in the caller's mix
Priority: Must
Current: Met
**User story:** As a caller, I want a reply in my own mix even when Gemini is down.

**Acceptance criteria**
- WHEN Tamil or Devanagari script was used THE SYSTEM SHALL reply in that script mixed with English support words.
- WHEN romanized Tamil, Hindi, or Bengali was detected THE SYSTEM SHALL reply in romanized Tanglish, Hinglish, or Benglish.
- WHEN the order ID exists in the order table THE SYSTEM SHALL include the order ID and its status in romanized replies.
- IF no Indic language is detected THEN THE SYSTEM SHALL reply in English.
- THE SYSTEM SHALL never return an empty `reply_mixed`.

Verify: pending (T-008)

### REQ-ENG-010: English-only ticket template
Priority: Must
Current: Met
**User story:** As a support organisation, I want every ticket in English, so that search, QA, and reporting read one language.

**Acceptance criteria**
- THE SYSTEM SHALL return `ticket_en` with non-empty `subject`, `summary`, `action`, and `priority ∈ {P1, P2, P3}`.
- THE SYSTEM SHALL build `summary` from: the intent name, the order reference and its known status (or "No order reference given"), the sentiment, and the languages spoken.
- THE SYSTEM SHALL write `subject`, `summary`, and `action` in English only; the original transcript is attached separately (REQ-API-002).

Verify: pending (T-008)

### REQ-ENG-011: Stable, deterministic output contract
Priority: Must
Current: Met
**User story:** As an integrator, I want a fixed result shape and repeatable backup results, so that my code and tests don't break.

**Acceptance criteria**
- THE SYSTEM SHALL return `{ intent_id, intent_score, tokens, languages, switch_points, intent, entities{order_id, sentiment, urgency}, confidence, reply_mixed, ticket_en{subject, summary, action, priority} }` from both paths; `analyse()` adds `intent_source` and `fallback_reason` (REQ-LIVE-007).
- WHEN the backup engine is called twice with the same utterance and config THE SYSTEM SHALL return deep-equal results.
- THE SYSTEM SHALL produce deep-equal backup results from the ESM (`codemix.js`) and CJS (`codemix.cjs`) builds.
- THE SYSTEM SHALL treat any removal or rename of a field as a breaking change requiring a spec update.

Verify: `scripts/build-cjs.js`; pending (T-008)

### REQ-ENG-012: Injectable order data
Priority: Could
Current: Met
**User story:** As an integrator, I want to supply my own order table, so that replies reflect my data.

**Acceptance criteria**
- WHEN `new CodemixSkill({ orders })` is given THE SYSTEM SHALL merge `orders` over the built-in `CRM_ORDERS`, with caller values winning.
- THE SYSTEM SHALL NOT mutate the shared `CRM_ORDERS` object.

Verify: pending (T-008)

### REQ-LIVE-001: Server-side Gemini request
Priority: Must
Current: Partial
**User story:** As the team, I want Gemini called only from our server with our key, so that visitors need no key and the key is never exposed.

**Acceptance criteria**
- THE SYSTEM SHALL call Gemini only from server-side code (`api/`, `mcp-server/`), using `GEMINI_API_KEY` and `GEMINI_MODEL` (default `gemini-3.6-flash`). *(Gap: today the browser calls Gemini with a visitor-entered key.)*
- IF no key is configured THEN THE SYSTEM SHALL skip the network call and use the backup with `fallback_reason = "not_configured"`.
- THE SYSTEM SHALL POST to `v1beta/models/<model>:generateContent`, stripping a `models/` prefix, with the key only in the `x-goog-api-key` header, never in the URL.
- THE SYSTEM SHALL request `responseMimeType: "application/json"` with a prompt specifying the schema in REQ-LIVE-003.

Verify: pending (T-010, T-027)

### REQ-LIVE-002: Retry and error policy
Priority: Must
Current: Met
**User story:** As a demo presenter, I want transient overloads retried, so that one 503 doesn't lose Gemini's understanding.

**Acceptance criteria**
- WHEN Gemini returns 429 or 503 THE SYSTEM SHALL retry up to 2 more times, waiting `1200 × attempt²` ms (1.2 s, then 4.8 s), within the overall deadline (REQ-NFR-005).
- WHEN Gemini returns 404 THE SYSTEM SHALL stop immediately with an error naming the model.
- WHEN Gemini returns any other non-OK status THE SYSTEM SHALL stop immediately with the status and provider message (kept server-side, REQ-API-004).

Verify: pending (T-010)

### REQ-LIVE-003: Closed-schema response parsing
Priority: Must
Current: Partial
**User story:** As a maintainer, I want malformed or out-of-vocabulary model output detected, so that it never reaches a ticket raw.

**Acceptance criteria**
- THE SYSTEM SHALL ignore candidate parts flagged `thought` and strip Markdown code fences before `JSON.parse`.
- IF there is no candidate, empty text, or invalid JSON THEN THE SYSTEM SHALL treat the call as failed with `fallback_reason = "invalid_output"`.
- THE SYSTEM SHALL require Gemini to return `intent_id` chosen from the 7 rule IDs plus `general_support`. *(Gap: the prompt asks for free-text `intent` only.)*

Verify: pending (T-010, T-019)

### REQ-LIVE-004: Gemini primary, backup on failure
Priority: Must
Current: Partial
**User story:** As a caller and support agent, I want Gemini's understanding used whenever it is available, with the backup engine taking over automatically, so that calls are understood as well as possible and never fail.

**Acceptance criteria**
- THE SYSTEM SHALL treat Gemini's validated result as the primary output on every surface (demo, HTTP API, ticketing, MCP). *(Gap: only the browser demo uses Gemini; the API, ticketing and MCP use the offline engine only.)*
- THE SYSTEM SHALL compute the backup result on every call (sub-millisecond), so it is ready without a second round-trip.
- WHEN Gemini returns a valid result THE SYSTEM SHALL use it, fill only missing or invalid fields from the backup, and set `intent_source = "gemini"`.
- IF Gemini is not configured, times out, exhausts retries, or returns invalid output THEN THE SYSTEM SHALL return the backup result with `intent_source = "backup"` and `fallback_reason ∈ {not_configured, timeout, rate_limited, provider_error, invalid_output}`.

Verify: pending (T-027)

### REQ-LIVE-005: Validated, consistent merge
Priority: Must
Current: Partial
**User story:** As an agent platform, I want merged results that are internally consistent, so that intent, ID and priority always agree.

**Acceptance criteria**
- THE SYSTEM SHALL overlay only valid Gemini fields onto a deep copy of the backup result.
- THE SYSTEM SHALL accept `confidence` only in `high|medium|low`, `switch_points` only as a non-negative integer, and `tokens` only if every item has string `t` and `l ∈ {hi,en,xx}`; otherwise it SHALL keep the backup value. *(Gap: no validation today.)*
- WHEN Gemini's `intent_id` is valid THE SYSTEM SHALL set `intent_id`, and derive `intent`, `ticket_en.priority`, `ticket_en.subject`, `ticket_en.action` and `entities.urgency` from that rule, so that no field contradicts another. *(Gap: `intent_id` stays from the offline engine.)*

Verify: pending (T-019)

### REQ-LIVE-006: Injection-safe ticket fields
Priority: Must
Current: Partial
**User story:** As a Freshdesk owner, I want a caller unable to steer Gemini into forging priority or actions, since Gemini output now drives tickets.

**Acceptance criteria**
- THE SYSTEM SHALL wrap the utterance in explicit delimiters and instruct the model to treat it only as caller speech, never as instructions.
- THE SYSTEM SHALL take `priority`, `urgency`, `subject` and `action` from the rule table for the validated `intent_id`, never from model free text.
- THE SYSTEM SHALL accept model-written `ticket_en.summary` only if ≤ 600 characters, and `reply_mixed` only if ≤ 300 characters, each with no URLs or HTML; otherwise it SHALL use the backup template.
- THE SYSTEM SHALL tag tickets with `intent_source` so reviewers can audit Gemini-driven tickets.

Verify: pending (T-019)

### REQ-LIVE-007: One `analyse()` orchestrator for every surface
Priority: Must
Current: Unmet
**User story:** As a maintainer, I want Gemini-first logic in one place, so that the demo, API, ticketing and MCP behave identically.

**Acceptance criteria**
- THE SYSTEM SHALL provide `async analyse(utterance, { apiKey, model, deadlineMs, fetch })` in `codemix.js` that runs the backup engine, attempts Gemini, validates, merges, and returns an `AnalysisResult` with `intent_source` and `fallback_reason`.
- THE SYSTEM SHALL use `analyse()` in `api/codemix.js`, `api/create-ticket.js` and `mcp-server/index.js`; no other code SHALL call `analyseLive` directly.
- THE SYSTEM SHALL accept an injectable `fetch` and sleep function so the orchestrator can be tested without the network.
- THE SYSTEM SHALL never throw from `analyse()` for provider or parsing failures.

Verify: pending (T-027)

### REQ-VOICE-001: Speech-to-text via server proxy
Priority: Should
Current: Partial
**User story:** As a visitor, I want to speak naturally in a mix without providing an ElevenLabs key.

**Acceptance criteria**
- WHEN "Record caller" is pressed and the server has ElevenLabs configured THE SYSTEM SHALL record with `MediaRecorder` and send the `audio/webm` to `/api/stt`, which calls ElevenLabs Scribe (`scribe_v1`) with the server key. *(Gap: the browser calls ElevenLabs with a visitor key.)*
- THE SYSTEM SHALL strip bracketed non-speech tags (e.g. `[music]`) and collapse whitespace.
- IF the transcript is empty THEN THE SYSTEM SHALL ask the user to check the mic and record again.
- IF microphone access is denied THEN THE SYSTEM SHALL show "Mic blocked" with the reason.

Verify: pending (T-028, T-013)

### REQ-VOICE-002: Browser speech-recognition fallback
Priority: Should
Current: Partial
**User story:** As a visitor, I want to dictate even when the STT proxy is unavailable.

**Acceptance criteria**
- WHEN `/api/stt` is unavailable or not configured and `SpeechRecognition` exists THE SYSTEM SHALL transcribe continuously with interim results into the input.
- THE SYSTEM SHALL let the user choose the recognition locale from `hi-IN`, `ta-IN`, `bn-IN`, `en-IN`. *(Gap: hard-coded `hi-IN`.)*
- IF `SpeechRecognition` is unavailable THEN THE SYSTEM SHALL say "Voice input needs Chrome or Edge — type the call instead".

Verify: pending (T-020)

### REQ-VOICE-003: Text-to-speech via server proxy
Priority: Should
Current: Partial
**User story:** As a demo viewer, I want to hear the mixed reply in a natural voice without entering keys.

**Acceptance criteria**
- WHEN "Play reply" is pressed THE SYSTEM SHALL request audio from `/api/tts`, which synthesises with `eleven_multilingual_v2` and the server's default voice or a voice chosen from `/api/voices`. *(Gap: the browser calls ElevenLabs with a visitor key.)*
- IF autoplay is blocked THEN THE SYSTEM SHALL show the audio player for manual play.

Verify: pending (T-028, T-013)

### REQ-VOICE-004: Browser speech-synthesis fallback
Priority: Should
Current: Unmet
**User story:** As a visitor, I want the reply spoken in a matching language voice when the TTS proxy is unavailable.

**Acceptance criteria**
- IF `/api/tts` is unavailable or fails (other than autoplay-blocked) THEN THE SYSTEM SHALL speak with `speechSynthesis`.
- THE SYSTEM SHALL set the voice locale from the detected primary language (Tamil → `ta-IN`, Hindi/Marathi → `hi-IN`, Bengali → `bn-IN`, English → `en-IN`). *(Gap: hard-coded `ta-IN`.)*

Verify: pending (T-020)

### REQ-API-001: `POST /api/codemix` analysis endpoint
Priority: Must
Current: Partial
**User story:** As the demo UI or an agent platform (e.g. Freshworks Freddy), I want one endpoint that returns Gemini-first understanding plus a ticket-ready payload.

**Acceptance criteria**
- WHEN the method is `OPTIONS` THE SYSTEM SHALL return 204 with CORS headers (REQ-API-005).
- WHEN the method is not `POST` THE SYSTEM SHALL return 405 `METHOD_NOT_ALLOWED`.
- IF the body is not an object THEN 400 `INVALID_PAYLOAD`; IF none of `utterance | text | message` is a non-empty string THEN 400 `MISSING_UTTERANCE`.
- WHEN valid THE SYSTEM SHALL analyse with `analyse()` and return 200 `{ status: "success", freshworks_payload: { agent_reply, detected_intent, intent_confidence, intent_source, ticket{subject, priority, body, tags, detected_order_id}, language_metrics{switch_points, languages, token_tags} }, raw }`. *(Gap: uses the offline engine only; no `intent_source`.)*
- IF analysis throws unexpectedly THEN 500 `ANALYSIS_FAILED` with no internal detail.

Verify: pending (T-011, T-027)

### REQ-API-002: `POST /api/create-ticket` Freshdesk ticketing
Priority: Must
Current: Partial
**User story:** As a support organisation, I want the analysed call filed as a real Freshdesk ticket, using Gemini's understanding.

**Acceptance criteria**
- WHEN a permitted request (REQ-SEC-001) arrives THE SYSTEM SHALL re-analyse the utterance server-side with `analyse()`, never trusting analysis sent by the client. *(Gap: uses the offline engine only.)*
- THE SYSTEM MAY reuse a result cached by utterance hash for up to 10 minutes on the same instance, to avoid a second Gemini call right after `/api/codemix`.
- THE SYSTEM SHALL POST to `https://<FRESHDESK_DOMAIN>/api/v2/tickets` with Basic auth `<key>:X`, mapping priority `P1→3`, `P2→2`, `P3→1`, `status = 2` (Open), `source = 3` (Phone), and tags `codemix-skill`, `source-<intent_source>` and lower-case languages.
- THE SYSTEM SHALL build the description from: the English summary, recommended action, agent reply, and the original mixed transcript under a separator.
- WHEN Freshdesk succeeds THE SYSTEM SHALL return 200 `{ status: "success", ticket_id, ticket_url, raw }`; WHEN it rejects, Freshdesk's status with code `PROVIDER_REJECTED`.

Verify: pending (T-011, T-027)

### REQ-API-003: Server configuration validation
Priority: Must
Current: Partial
**User story:** As a deployer, I want misconfiguration reported clearly, so that tickets never go to the wrong helpdesk.

**Acceptance criteria**
- IF `FRESHDESK_API_KEY` or `FRESHDESK_DOMAIN` is unset THEN `/api/create-ticket` SHALL return 501 `CONFIGURATION_ERROR` without calling Freshdesk. *(Gap: falls back to a hard-coded `citchennai-assist.freshdesk.com`.)*
- THE SYSTEM SHALL accept `FRESHDESK_DOMAIN` only as a bare hostname ending in `.freshdesk.com`.
- IF `ELEVENLABS_API_KEY` is unset THEN the voice proxies SHALL return 501 `CONFIGURATION_ERROR`, so the UI switches to browser voice.
- THE SYSTEM SHALL list every server variable in `.env.example`: `GEMINI_API_KEY`, `GEMINI_MODEL`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `FRESHDESK_API_KEY`, `FRESHDESK_DOMAIN`, `ALLOWED_ORIGIN`, `FRESHVOICE_API_TOKEN`.

Verify: pending (T-005)

### REQ-API-004: Error-response hygiene
Priority: Must
Current: Unmet
**User story:** As an account owner, I want error responses that reveal nothing internal.

**Acceptance criteria**
- THE SYSTEM SHALL return errors only as `{ status: "error", error: { code, message } }` with fixed, non-sensitive messages.
- THE SYSTEM SHALL NOT include upstream provider text, `error.message`, stack traces, domains, model errors, or credentials in any response. *(Gap: `create-ticket.js` echoes Freshdesk's `description` and `error.message`.)*

Verify: pending (T-005)

### REQ-API-005: Correct, single-source CORS
Priority: Must
Current: Unmet
**User story:** As a deployer, I want browsers to accept only my origins, so that other sites can't spend my quotas through my endpoints.

**Acceptance criteria**
- THE SYSTEM SHALL set CORS headers in exactly one place per endpoint.
- THE SYSTEM SHALL set `Access-Control-Allow-Origin` to the request origin only if it is in `ALLOWED_ORIGIN` (comma-separated), with `Vary: Origin`.
- THE SYSTEM SHALL NOT send `Access-Control-Allow-Credentials: true` together with `*`. *(Gap: `vercel.json` sends `*` + credentials for `/api/*`.)*

Verify: pending (T-004)

### REQ-API-006: Voice proxy endpoints
Priority: Should
Current: Unmet
**User story:** As a visitor, I want real voices without keys, while the team's ElevenLabs key stays on the server.

**Acceptance criteria**
- `POST /api/stt` SHALL accept one audio file ≤ 10 MB (`audio/webm`, `audio/wav`, `audio/mpeg`) and return `{ text }`.
- `POST /api/tts` SHALL accept `{ text ≤ 500 chars, voice_id? }` and return `audio/mpeg`; `voice_id` SHALL be one returned by `/api/voices`, else the server default.
- `GET /api/voices` SHALL return `[{ voice_id, name, accent }]`, cached for 10 minutes per instance.
- THE SYSTEM SHALL apply REQ-API-004, REQ-API-005 and REQ-SEC-001 to all three endpoints.

Verify: pending (T-028)

### REQ-MCP-001: MCP tool registration
Priority: Must
Current: Met
**User story:** As an MCP client (Claude, Cursor), I want a discoverable tool for code-mixed calls.

**Acceptance criteria**
- THE SYSTEM SHALL run a stdio MCP server named `codemix-skill` that registers `analyse_codemixed_call` with input `{ utterance: string }` and a description of when to use it.
- THE SYSTEM SHALL import the engine from `../codemix.js`, never from a copy.

Verify: `mcp-server/verify.mjs`

### REQ-MCP-002: MCP tool result contract
Priority: Must
Current: Partial
**User story:** As an MCP client, I want Gemini-first results when a key is configured, and clear errors.

**Acceptance criteria**
- THE SYSTEM SHALL analyse with `analyse()`, using `GEMINI_API_KEY` from the MCP server's environment when present. *(Gap: offline engine only.)*
- WHEN called with a non-blank utterance THE SYSTEM SHALL return one text content item containing JSON with `intent_id, intent, intent_source, confidence, languages, switch_points, order_id, sentiment, urgency, reply_mixed, ticket_subject, ticket_summary, ticket_action, ticket_priority`.
- IF the utterance is empty or whitespace THEN THE SYSTEM SHALL return `isError: true` with text `utterance is required`.

Verify: `mcp-server/verify.mjs`; pending (T-012, T-030)

### REQ-UI-001: "Handle call" pipeline presentation
Priority: Must
Current: Met
**User story:** As a judge, I want to watch each stage of understanding, so that the value is obvious in 30 seconds.

**Acceptance criteria**
- WHEN "Handle call" is pressed with non-empty input THE SYSTEM SHALL disable the button, show progress, and reveal in order: *Language mix detected*, *What the agent understood*, *Actions taken*, *Agent reply*, *English ticket*.
- THE SYSTEM SHALL render tokens coloured by tag with a visible marker at each switch point, plus languages, switch count, and the Indic/English token split.
- THE SYSTEM SHALL list actions taken, including order lookup (found, not found, or not given).
- THE SYSTEM SHALL provide one-click sample utterances for Hinglish, Tanglish, Benglish, agent misbehaviour, and GST invoice.

Verify: pending (T-013)

### REQ-UI-002: Understanding-source indicator
Priority: Should
Current: Partial
**User story:** As a visitor, I want to see whether Gemini or the backup engine understood this call, and why.

**Acceptance criteria**
- THE SYSTEM SHALL show "Understood by Gemini (<model>)" WHEN `intent_source = "gemini"`, and "Backup engine" plus a plain-language reason WHEN `intent_source = "backup"` (e.g. "Gemini timed out"). *(Gap: the indicator reflects whether the visitor typed a key.)*
- THE SYSTEM SHALL show the voice source: "ElevenLabs" or "Browser voice".

Verify: pending (T-029)

### REQ-UI-003: No keys in the browser, zero setup
Priority: Must
Current: Partial
**User story:** As a judge, I want the full experience without accounts or keys.

**Acceptance criteria**
- THE SYSTEM SHALL NOT ask visitors for API keys and SHALL remove the "Keys" panel. *(Gap: the panel asks for Gemini and ElevenLabs keys.)*
- THE SYSTEM SHALL analyse via `/api/codemix` on the hosted site.
- WHEN `index.html` is opened without the API (static file) THE SYSTEM SHALL analyse in the browser with the backup engine and label it "Backup engine — server not reachable".

Verify: pending (T-029)

### REQ-UI-004: In-browser benchmark explorer
Priority: Should
Current: Partial
**User story:** As a judge, I want to inspect per-utterance results for each dataset and each understanding path.

**Acceptance criteria**
- THE SYSTEM SHALL offer Tuned, Extended, and Blind tabs showing intent, language, and entity accuracy, latency, and a per-row pass/fail table.
- THE SYSTEM SHALL label in-browser results as "Backup engine", and SHALL show the latest recorded Gemini benchmark (REQ-BEN-007) with its model name and date when available.
- WHEN "Test Call" is pressed on a row THE SYSTEM SHALL load that utterance and run the analysis, without creating a ticket (REQ-UI-005).
- THE SYSTEM SHALL label the intent score truthfully (raw score, not "/10"). *(Gap: shows "x/10" although scores reach 18.)*

Verify: pending (T-021, T-031)

### REQ-UI-005: Explicit consent before creating a real ticket
Priority: Must
Current: Unmet
**User story:** As a Freshdesk owner, I want tickets created only when a user deliberately asks, so that demo clicks and benchmark runs don't flood the helpdesk.

**Acceptance criteria**
- THE SYSTEM SHALL NOT call `/api/create-ticket` automatically after analysis. *(Gap: every Handle call, including benchmark "Test Call", creates a real ticket.)*
- WHEN the ticket card is shown THE SYSTEM SHALL offer a "Create Freshdesk ticket" button; only pressing it SHALL send the request.
- WHEN a ticket is created THE SYSTEM SHALL show its ID as a link; on failure a generic message.

Verify: pending (T-001)

### REQ-BEN-001: Backup tuned-set regression gate
Priority: Must
Current: Met
**User story:** As a maintainer, I want rule changes that break known calls to fail CI.

**Acceptance criteria**
- THE SYSTEM SHALL fail `npm test` unless the backup engine's tuned-set intent accuracy is 20/20 and entity precision is 20/20.

Verify: `test/benchmark.test.mjs`

### REQ-BEN-002: Backup generalisation gates
Priority: Must
Current: Met
**User story:** As a judge, I want evidence that the backup rules generalise beyond the tuned set.

**Acceptance criteria**
- THE SYSTEM SHALL fail `npm test` if backup extended-set intent accuracy < 85% or blind-set intent accuracy < 90%.
- THE SYSTEM SHALL print one parseable `RESULTS:` summary line.

Verify: `test/benchmark.test.mjs`

### REQ-BEN-003: Backup language-ID accuracy gate
Priority: Should
Current: Unmet
**User story:** As a maintainer, I want language-ID regressions caught, not just printed.

**Acceptance criteria**
- THE SYSTEM SHALL fail `npm test` if backup primary-language accuracy is < 95% on tuned, < 85% on extended, or < 90% on blind. *(Gap: printed but not asserted.)*

Verify: pending (T-009)

### REQ-BEN-004: Blind-set integrity
Priority: Must
Current: Unmet
**User story:** As a judge, I want "blind" to stay blind, so that blind-set numbers mean generalisation for both paths.

**Acceptance criteria**
- THE SYSTEM SHALL record a SHA-256 fingerprint of `BLIND_DATASET`, the backup rule surface (`INTENT_RULES`, `EN_WORDS`, dialect and sentiment lists), and the Gemini prompt text at the last blind evaluation.
- IF the rule surface or prompt changes and blind accuracy is re-reported without new, unseen blind items THEN THE SYSTEM SHALL fail CI until the blind set is extended or relabelled "no longer blind" in the docs.

Verify: pending (T-014)

### REQ-BEN-005: Published numbers match recorded results
Priority: Must
Current: Partial
**User story:** As a reader, I want every published figure to equal what the benchmarks actually produced (constitution §5).

**Acceptance criteria**
- THE SYSTEM SHALL provide a check that fails if accuracy figures in `README.md`, `ARCHITECTURE.md`, or `SUBMISSION.md` differ from the latest `npm test` `RESULTS:` line (backup) or the latest recorded Gemini benchmark file.
- THE SYSTEM SHALL present Gemini figures as the headline and backup figures as "backup engine", each with its dataset.
- THE SYSTEM SHALL describe model and version names consistently across docs and UI (e.g. Scribe `v1`).

Verify: pending (T-015, T-024)

### REQ-BEN-006: Backup latency budget
Priority: Should
Current: Partial
**User story:** As an integrator, I want the backup engine fast enough to run on every call.

**Acceptance criteria**
- THE SYSTEM SHALL fail `npm test` if the backup's median `analyseOffline` latency across all 80 utterances exceeds 2 ms, or p95 exceeds 10 ms, on the CI runner. *(Gap: measured, not asserted.)*

Verify: pending (T-009)

### REQ-BEN-007: Gemini benchmark
Priority: Must
Current: Unmet
**User story:** As a judge, I want the accuracy of the primary path measured, since Gemini's understanding is the main output.

**Acceptance criteria**
- THE SYSTEM SHALL provide `npm run benchmark:gemini`, run on demand (not in CI) with `GEMINI_API_KEY`, that sends all 80 utterances through `analyse()` with the backup disabled, at most 1 request per second.
- THE SYSTEM SHALL record, per dataset: intent accuracy, primary-language accuracy, order-ID precision, invalid-output rate, median and p95 latency, model name, prompt fingerprint and date.
- THE SYSTEM SHALL write results to `benchmarks/gemini-<model>-<YYYY-MM-DD>.json` and commit them.
- THE SYSTEM SHALL report failed calls as failures, never silently drop them.

Verify: pending (T-031)

### REQ-SEC-001: Abuse and cost protection on every endpoint
Priority: Must
Current: Unmet
**User story:** As an account owner, I want our Gemini, ElevenLabs and Freshdesk quotas protected now that our server holds the keys.

**Acceptance criteria**
- THE SYSTEM SHALL apply per-client-IP limits: `/api/codemix` 20/min, `/api/stt` 10/min, `/api/tts` 20/min, `/api/voices` 10/min, `/api/create-ticket` 5/min, returning 429 `RATE_LIMITED` with `Retry-After`.
- WHEN a request's `Origin` is in `ALLOWED_ORIGIN` THE SYSTEM SHALL treat it as the demo UI; OTHERWISE it SHALL require `X-FreshVoice-Token` equal to `FRESHVOICE_API_TOKEN` (constant-time compare), else 401 `UNAUTHORIZED`.
- THE SYSTEM SHALL cap utterances at 2,000 characters, audio at 10 MB and TTS text at 500 characters, returning 413 `PAYLOAD_TOO_LARGE`.
- THE SYSTEM SHALL document that `Origin` can be forged outside browsers, so rate limits are the backstop (see Q-2).

Verify: pending (T-002)

### REQ-SEC-002: Requester identity integrity
Priority: Must
Current: Partial
**User story:** As a Freshdesk owner, I want nobody able to file tickets impersonating arbitrary customers.

**Acceptance criteria**
- THE SYSTEM SHALL accept a client-supplied `email` only from token-authenticated integrators and only if it matches a strict email pattern; otherwise it SHALL use the synthetic `caller-<order>@codemix-skill.demo` address. *(Gap: any string containing `@` is accepted from anyone.)*

Verify: pending (T-003)

### REQ-SEC-003: Server-only secrets
Priority: Must
Current: Partial
**User story:** As the team, I want keys never exposed to browsers, committed, or logged.

**Acceptance criteria**
- THE SYSTEM SHALL read every third-party key only from server environment variables, and keep `.env*` (except `.env.example`) git-ignored.
- THE SYSTEM SHALL NOT send any API key to the browser, and the browser SHALL NOT call Gemini or ElevenLabs directly. *(Gap: the demo asks visitors for keys and calls both providers from the browser.)*
- THE SYSTEM SHALL run a secret-pattern scan (`AIza…`, `sk_…`, Freshdesk key formats) in CI and fail on a match.

Verify: pending (T-007, T-029)

### REQ-SEC-004: Output encoding in the UI
Priority: Must
Current: Partial
**User story:** As a visitor, I want model- or user-supplied text never executed as HTML.

**Acceptance criteria**
- THE SYSTEM SHALL insert dynamic text via `textContent`, or via an escaper covering `& < > " '`. *(Gap: `esc()` omits quotes but is used inside `title="…"`.)*
- THE SYSTEM SHALL NOT build inline event handlers from data (e.g. `onclick="loadBenchCase('…')"`).
- THE SYSTEM SHALL open provider links with `rel="noopener"`.

Verify: pending (T-006)

### REQ-BLD-001: Generated CommonJS build with parity
Priority: Must
Current: Met
**User story:** As a CommonJS consumer, I want `require()` to behave exactly like `import`.

**Acceptance criteria**
- THE SYSTEM SHALL generate `codemix.cjs` from `codemix.js`, failing if the source has top-level `import` or `import.meta`.
- THE SYSTEM SHALL assert identical export surfaces and deep-equal backup output for a smoke utterance.
- THE SYSTEM SHALL fail CI if the committed `codemix.cjs` differs from a fresh build.

Verify: `scripts/build-cjs.js`; `.github/workflows/ci.yml`

### REQ-BLD-002: Continuous integration gates
Priority: Must
Current: Met
**User story:** As a maintainer, I want every push and PR to prove specs, build, tests, and MCP interop.

**Acceptance criteria**
- WHEN code is pushed to `main` or a PR targets `main` THE SYSTEM SHALL run, on Node 20 and 22: spec check, MCP dependency install, CJS build, drift check, benchmark suite, MCP verification.
- THE SYSTEM SHALL NOT require any third-party key in CI; Gemini-dependent tests use stubbed `fetch`.

Verify: `.github/workflows/ci.yml`

### REQ-BLD-003: Packaging and deployment
Priority: Must
Current: Met
**User story:** As a deployer, I want zero-config hosting and dual-module packaging.

**Acceptance criteria**
- THE SYSTEM SHALL declare `"type": "module"`, `exports.import = ./codemix.js`, `exports.require = ./codemix.cjs`, and `engines.node >= 18`.
- THE SYSTEM SHALL deploy on Vercel with no build command, serving the repo root statically and `api/*.js` as functions, with `no-store` caching on API responses.

Verify: `package.json`; `vercel.json`

### REQ-INT-001: Decision-policy layer conformance
Priority: Should
Current: Partial
**User story:** As the team, I want the Round 2 layer governed by its own spec and linked here.

**Acceptance criteria**
- THE SYSTEM SHALL implement the decision-policy layer per `specs/001-decision-policy-layer/requirements.md`.
- WHEN 001 reaches `Status: Implemented` THE SYSTEM SHALL mark this requirement `Met`.

Verify: `specs/001-decision-policy-layer/requirements.md`; pending (T-025)

---

## 4. Non-functional requirements

### REQ-NFR-001: Backup availability
Priority: Must
Current: Met
**User story:** As a presenter on unreliable venue wifi, I want calls understood even when Gemini is unreachable.

**Acceptance criteria**
- THE SYSTEM SHALL perform tokenization, intent, entities, reply, and ticket drafting with the backup engine and no network access.
- WHEN every external service is unreachable THE SYSTEM SHALL still produce a complete REQ-ENG-011 result.

Verify: `test/benchmark.test.mjs`

### REQ-NFR-002: Portability without side effects
Priority: Should
Current: Partial
**User story:** As an integrator, I want to import the module without it altering my global scope.

**Acceptance criteria**
- THE SYSTEM SHALL run unchanged in modern browsers (ES module), Node ESM, and Node CJS.
- THE SYSTEM SHALL attach globals only when `window` exists and SHALL NOT write to `globalThis` in Node. *(Gap: always writes 7 globals.)*

Verify: `scripts/build-cjs.js`; pending (T-022)

### REQ-NFR-003: Privacy and data minimisation
Priority: Must
Current: Partial
**User story:** As a caller, I want my words sent only where needed and not retained unnecessarily.

**Acceptance criteria**
- THE SYSTEM SHALL NOT log utterances, transcripts, audio, emails, or keys in API functions or the MCP server.
- THE SYSTEM SHALL send transcripts to Gemini and audio to ElevenLabs only for the call being handled, and to Freshdesk only on explicit ticket creation (REQ-UI-005).
- THE SYSTEM SHALL show a one-line notice in the demo that calls are processed by Google Gemini and ElevenLabs, and document the data flow in the README. *(Gap: not documented; tickets are created without consent.)*

Verify: pending (T-023)

### REQ-NFR-004: Maintainability of rules and prompt
Priority: Should
Current: Met
**User story:** As a maintainer, I want to add an intent by editing data, not control flow.

**Acceptance criteria**
- THE SYSTEM SHALL define intents solely as `INTENT_RULES` entries (`id, name, action, priority, subject, weights[{kw[], w}]`), with no intent-specific branching elsewhere.
- THE SYSTEM SHALL build the Gemini prompt's list of allowed `intent_id` values from `INTENT_RULES`, so a new intent reaches both paths.
- WHEN an intent is added THE SYSTEM SHALL require benchmark items for it in all three datasets.

Verify: `test/benchmark.test.mjs`; pending (T-008, T-019)

### REQ-NFR-005: Response deadline
Priority: Should
Current: Unmet
**User story:** As a caller on the line, I want an answer quickly, even if Gemini is slow.

**Acceptance criteria**
- THE SYSTEM SHALL abort the Gemini attempt (including retries) after `deadlineMs` (default 10,000 ms) and return the backup result with `fallback_reason = "timeout"`. *(Gap: no timeout today.)*
- THE SYSTEM SHALL keep the demo's "Handle call" under 12 s end to end at p95 with Gemini healthy, as measured by REQ-BEN-007 latency plus the proxy hop.

Verify: pending (T-027)

---

## 5. Decisions
| ID | Decision | Date | Effect |
|---|---|---|---|
| D-1 | **Gemini is the primary understanding; the offline engine is the backup.** | 2026-09-15 | All surfaces use `analyse()` (LIVE-004, LIVE-007); Gemini must be benchmarked (BEN-007); ticket fields are made injection-safe (LIVE-006) |
| D-2 | **All third-party keys move to the server now.** Visitors never enter keys. | 2026-09-15 | Keys panel removed (UI-003); voice proxies (API-006); secrets rule tightened (SEC-003); endpoint protection covers every proxy (SEC-001) |
| D-3 | Backup confidence thresholds are chosen on the tuned set only. | 2026-09-15 | Keeps blind-set numbers honest (ENG-008, BEN-004) |

## 6. Open questions
| ID | Question | Affects |
|---|---|---|
| Q-2 | Rate limits: per-instance memory (free, no new dependency, but each Vercel copy counts separately and resets on restart) or a shared store such as Upstash Redis (accurate, but adds a service and a dependency)? | REQ-SEC-001 |
| Q-5 | Which languages get romanized marker-word lists and benchmark sentences next: Telugu, Kannada, Malayalam, Gujarati, Punjabi, Odia? | REQ-ENG-007, REQ-BEN-007 |
