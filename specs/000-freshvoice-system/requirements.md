# 000 — FreshVoice System: Software Requirements Specification

Status: Draft
Owner: Ramanathan Manikandan & Sadhana Shanmugam
Version: 1.0 (baseline of `main` @ 14df722)
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
2. resolves one support intent, the order ID, sentiment, and urgency,
3. drafts a reply in the caller's own language mix, and
4. writes an **English-only** ticket, optionally pushed to Freshdesk.

It is delivered through four surfaces that share one engine: an importable JS
module, two Vercel HTTP endpoints, an MCP tool, and a zero-install web demo.

**In scope:** the offline engine, the Gemini live path, ElevenLabs voice I/O and
browser fallbacks, the HTTP APIs, the MCP server, the demo UI, benchmarks, build/CI,
and security of all of the above. The decision-policy layer is specified separately in 001.

**Out of scope (this version):** multi-intent utterances, streaming STT, real CRM/order
lookup, persistent conversation state, Freshworks marketplace packaging, analytics.

### 1.3 Stakeholders
| Stakeholder | Interest |
|---|---|
| Caller (end customer) | Be understood without switching to one language; get a relevant reply |
| Support agent / supervisor | Receive a clean English ticket with correct priority and context |
| Integrating developer | Import the skill or call the API/MCP tool with a stable contract |
| Hackathon judges & mentors | Run the demo with zero setup; trust every published number |
| Maintainers (team) | Change rules safely, with fast deterministic tests |
| Freshdesk account owner | No spam or forged tickets; credentials never exposed |

### 1.4 Definitions & acronyms
| Term | Meaning |
|---|---|
| Code-mixing | Using two languages within one utterance, here intra-sentential |
| Switch point | A boundary between consecutive word tokens tagged with different languages (`hi`↔`en`) |
| `hi` tag | "Indic" — *any* Indic-language word (Hindi, Tamil, Bengali, …), not only Hindi |
| `xx` tag | Number or punctuation token |
| Closed English lexicon | `EN_WORDS`: the ~150 English words used in support calls. Any other Latin word is treated as Indic |
| Offline engine | `CodemixSkill.analyseOffline` — deterministic, no network |
| Live path | `CodemixSkill.analyseLive` — Gemini `generateContent` |
| Merge | `CodemixSkill.merge(live, base)` — live fields overlaid on the offline result |
| Tuned / Extended / Blind set | 20 / 8 / 52 labelled utterances in `codemix.js`; rules were tuned on the first, written alongside the second, and left untouched for the third |
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
Caller ─voice/text─▶ Demo UI (index.html) ─┬─▶ codemix.js (offline, always)
                                           ├─▶ Gemini API (optional key)
                                           ├─▶ ElevenLabs STT/TTS (optional key)
                                           └─▶ /api/create-ticket ─▶ Freshdesk API
Agent platforms ─HTTP─▶ /api/codemix ─▶ codemix.js
MCP clients ─stdio─▶ mcp-server ─▶ codemix.js
```

### 2.2 User classes
- **Zero-key visitor:** gets the offline engine plus browser voice.
- **Keyed visitor:** gets Gemini and/or ElevenLabs.
- **Server integrator:** uses the HTTP API.
- **MCP client:** Claude, Cursor and similar.
- **Maintainer:** runs tests, CI and the spec check.

### 2.3 Operating environment
- Browsers: Chrome/Edge (desktop) for full voice features; any modern browser for the text path.
- Node.js ≥ 18 for the module, tests, and MCP server (CI runs Node 20 and 22).
- Vercel serverless (Node runtime) for `api/`; static hosting for the rest.

### 2.4 Constraints
- **C-1:** The core engine has zero runtime npm dependencies (constitution §4).
- **C-2:** `codemix.js` is the single source of truth; `codemix.cjs` is generated (§2).
- **C-3:** Third-party quotas (Gemini, ElevenLabs, Freshdesk) are limited, so the live paths are not batch-benchmarked.
- **C-4:** Browser-held API keys are a demo concession only (§6).

### 2.5 Assumptions & dependencies
- **A-1:** An utterance is a single support turn of ≤ 1,000 characters.
- **A-2:** Order and transaction IDs are 5 digits in the demo CRM fixture.
- **A-3:** Gemini honours `responseMimeType: application/json` most of the time, but not always.
- **A-4:** Freshdesk API v2 ticket semantics (priority 1–4, status 2 = Open, source 3 = Phone) stay stable.

---

## 3. Functional requirements

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
**User story:** As a support agent, I want one intent resolved from mixed phrasing, so that the ticket is routed correctly.

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
- OTHERWISE THE SYSTEM SHALL test romanized marker lexicons in the order Tamil → Bengali → Marathi → Hindi and name the first match.
- THE SYSTEM SHALL return `languages = [<Indic>, "English"]`, or `["English"]` when no Indic language is found.
- THE SYSTEM SHALL reach ≥ 95% primary-language accuracy on the tuned set and ≥ 90% on the blind set (see REQ-BEN-003).

Verify: pending (T-009)

### REQ-ENG-008: Meaningful confidence
Priority: Should
Current: Unmet
**User story:** As an agent platform, I want a confidence that reflects how sure the intent is, so that I can decide when to ask a clarifying question.

**Acceptance criteria**
- THE SYSTEM SHALL derive `confidence` from the intent score and its margin over the runner-up, not from the switch-point count. *(Gap: today `switch_points > 2 ? "high" : "medium"`.)*
- WHEN `intent_id = "general_support"` THE SYSTEM SHALL return `confidence = "low"`.
- WHEN best score ≥ 8 AND margin over runner-up ≥ 3 THE SYSTEM SHALL return `"high"`; otherwise `"medium"`.
- THE SYSTEM SHALL keep `confidence` in the enum `high | medium | low`.

Verify: pending (T-018)

### REQ-ENG-009: Reply in the caller's mix
Priority: Must
Current: Met
**User story:** As a caller, I want the reply in the same mix I used, so that it feels natural.

**Acceptance criteria**
- WHEN Tamil or Devanagari script was used THE SYSTEM SHALL reply in that script mixed with English support words.
- WHEN romanized Tamil, Hindi, or Bengali was detected THE SYSTEM SHALL reply in romanized Tanglish, Hinglish, or Benglish.
- WHEN the order ID exists in the order table THE SYSTEM SHALL include the order ID and its status in romanized replies.
- IF no Indic language is detected THEN THE SYSTEM SHALL reply in English.
- THE SYSTEM SHALL never return an empty `reply_mixed`.

Verify: pending (T-008)

### REQ-ENG-010: English-only ticket
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
**User story:** As an integrator, I want a fixed result shape and repeatable results, so that my code and tests don't break.

**Acceptance criteria**
- THE SYSTEM SHALL return `{ intent_id, intent_score, tokens, languages, switch_points, intent, entities{order_id, sentiment, urgency}, confidence, reply_mixed, ticket_en{subject, summary, action, priority} }`.
- WHEN called twice with the same utterance and config THE SYSTEM SHALL return deep-equal results.
- THE SYSTEM SHALL produce deep-equal results from the ESM (`codemix.js`) and CJS (`codemix.cjs`) builds.
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

### REQ-LIVE-001: Gemini live analysis request
Priority: Should
Current: Met
**User story:** As a keyed visitor, I want Gemini to analyse the call, so that phrasing outside the keyword rules is understood.

**Acceptance criteria**
- WHEN `analyseLive(utterance, apiKey, model?)` is called without a key THE SYSTEM SHALL throw `Error("no key")` without a network call.
- THE SYSTEM SHALL POST to `v1beta/models/<model>:generateContent`, defaulting to `gemini-3.6-flash` and stripping a `models/` prefix.
- THE SYSTEM SHALL send the key only in the `x-goog-api-key` header, never in the URL.
- THE SYSTEM SHALL request `responseMimeType: "application/json"` with a prompt specifying the same result schema as REQ-ENG-011.

Verify: pending (T-010)

### REQ-LIVE-002: Retry and error policy
Priority: Must
Current: Met
**User story:** As a demo presenter, I want transient overloads retried, so that one 503 doesn't break the demo.

**Acceptance criteria**
- WHEN Gemini returns 429 or 503 THE SYSTEM SHALL retry up to 2 more times, waiting `1200 × attempt²` ms (1.2 s, then 4.8 s).
- WHEN Gemini returns 404 THE SYSTEM SHALL throw immediately with a message naming the model.
- WHEN Gemini returns any other non-OK status THE SYSTEM SHALL throw immediately with the status and provider message.

Verify: pending (T-010)

### REQ-LIVE-003: Robust response parsing
Priority: Must
Current: Met
**User story:** As a maintainer, I want malformed model output detected, so that it never reaches the UI raw.

**Acceptance criteria**
- THE SYSTEM SHALL ignore candidate parts flagged `thought`.
- THE SYSTEM SHALL strip Markdown code fences before `JSON.parse`.
- IF there is no candidate, empty text, or invalid JSON THEN THE SYSTEM SHALL throw a descriptive error.

Verify: pending (T-010)

### REQ-LIVE-004: Offline-first degradation
Priority: Must
Current: Met
**User story:** As any visitor, I want a full result even when Gemini fails, so that the screen is never blank.

**Acceptance criteria**
- THE SYSTEM SHALL compute the offline result *before* attempting the live path.
- IF the live path throws for any reason THEN THE SYSTEM SHALL render the offline result and show the reason (except "no key").
- IF rendering the merged result throws THEN THE SYSTEM SHALL render the offline result instead.
- THE SYSTEM SHALL show which understanding source produced the displayed result.

Verify: pending (T-013)

### REQ-LIVE-005: Validated, consistent merge
Priority: Must
Current: Partial
**User story:** As an agent platform, I want merged results that are internally consistent, so that intent text, ID, and priority agree.

**Acceptance criteria**
- THE SYSTEM SHALL overlay only non-empty live fields onto a deep copy of the offline result.
- THE SYSTEM SHALL accept live `priority` only if in `P1|P2|P3`, `urgency` only if in `low|medium|high`, `confidence` only if in `high|medium|low`, `switch_points` only if a non-negative integer, and `tokens` only if every item has string `t` and `l ∈ {hi,en,xx}`; otherwise keep the offline value. *(Gap: no validation today.)*
- THE SYSTEM SHALL add `intent_source ∈ {offline, live}`. WHEN the live intent overrides the offline one THE SYSTEM SHALL NOT leave a contradictory offline `intent_id` unmarked. *(Gap.)*

Verify: pending (T-019)

### REQ-LIVE-006: Utterance treated as data
Priority: Should
Current: Partial
**User story:** As a Freshdesk owner, I want a caller unable to steer the model with instructions, so that tickets can't be forged via prompt injection.

**Acceptance criteria**
- THE SYSTEM SHALL delimit the utterance in the prompt and instruct the model to treat it as content only.
- THE SYSTEM SHALL validate live output against the schema (REQ-LIVE-005) before it is used for display or ticketing.
- THE SYSTEM SHALL keep server-side ticket creation on the offline engine unless a future spec approves otherwise.

Verify: pending (T-019)

### REQ-VOICE-001: ElevenLabs speech-to-text
Priority: Should
Current: Met
**User story:** As a keyed visitor, I want to speak naturally in a mix, so that I don't have to type.

**Acceptance criteria**
- WHEN an ElevenLabs key is present and "Record caller" is pressed THE SYSTEM SHALL record with `MediaRecorder`, and on stop POST `audio/webm` to `/v1/speech-to-text` with `model_id = scribe_v1`.
- THE SYSTEM SHALL strip bracketed non-speech tags (e.g. `[music]`) and collapse whitespace.
- IF the transcript is empty THEN THE SYSTEM SHALL ask the user to check the mic and record again.
- IF microphone access is denied THEN THE SYSTEM SHALL show "Mic blocked" with the reason.

Verify: pending (T-013)

### REQ-VOICE-002: Browser speech-recognition fallback
Priority: Should
Current: Partial
**User story:** As a zero-key visitor, I want to dictate anyway, so that voice works without an account.

**Acceptance criteria**
- WHEN no ElevenLabs key is present and `SpeechRecognition` exists THE SYSTEM SHALL transcribe continuously with interim results into the input.
- THE SYSTEM SHALL let the user choose the recognition locale from `hi-IN`, `ta-IN`, `bn-IN`, `en-IN`. *(Gap: hard-coded `hi-IN`.)*
- IF `SpeechRecognition` is unavailable THEN THE SYSTEM SHALL say "Add an ElevenLabs key, or use Chrome".

Verify: pending (T-020)

### REQ-VOICE-003: ElevenLabs text-to-speech
Priority: Should
Current: Met
**User story:** As a demo viewer, I want to hear the mixed reply in a natural voice.

**Acceptance criteria**
- WHEN a key and voice ID are present THE SYSTEM SHALL synthesise with `eleven_multilingual_v2` and play the audio.
- IF autoplay is blocked THEN THE SYSTEM SHALL show the audio player for manual play.
- WHEN "Load my voices" is pressed THE SYSTEM SHALL list the account's voices and select the first.

Verify: pending (T-013)

### REQ-VOICE-004: Browser speech-synthesis fallback
Priority: Should
Current: Unmet
**User story:** As a zero-key visitor, I want the reply spoken in a matching language voice.

**Acceptance criteria**
- IF ElevenLabs is unavailable or fails (other than autoplay-blocked) THEN THE SYSTEM SHALL speak with `speechSynthesis`.
- THE SYSTEM SHALL set the voice locale from the detected primary language (Tamil → `ta-IN`, Hindi/Marathi → `hi-IN`, Bengali → `bn-IN`, English → `en-IN`). *(Gap: hard-coded `ta-IN`.)*

Verify: pending (T-020)

### REQ-API-001: `POST /api/codemix` analysis endpoint
Priority: Must
Current: Met
**User story:** As an agent platform (e.g. Freshworks Freddy), I want an HTTP endpoint returning a ticket-ready payload.

**Acceptance criteria**
- WHEN the method is `OPTIONS` THE SYSTEM SHALL return 200 with CORS headers (REQ-API-005).
- WHEN the method is not `POST` THE SYSTEM SHALL return 405 `METHOD_NOT_ALLOWED`.
- IF the body is not an object THEN 400 `INVALID_PAYLOAD`; IF none of `utterance | text | message` is a non-empty string THEN 400 `MISSING_UTTERANCE`.
- WHEN valid THE SYSTEM SHALL return 200 `{ status: "success", freshworks_payload: { agent_reply, detected_intent, intent_confidence, ticket{subject, priority, body, tags, detected_order_id}, language_metrics{switch_points, languages, token_tags} }, raw }`.
- IF analysis throws THEN 500 `ANALYSIS_FAILED` with no internal detail.

Verify: pending (T-011)

### REQ-API-002: `POST /api/create-ticket` Freshdesk ticketing
Priority: Must
Current: Met
**User story:** As a support organisation, I want the analysed call filed as a real Freshdesk ticket.

**Acceptance criteria**
- WHEN a valid, authorised request (REQ-SEC-001) arrives THE SYSTEM SHALL analyse the utterance offline and POST to `https://<FRESHDESK_DOMAIN>/api/v2/tickets` with Basic auth `<key>:X`.
- THE SYSTEM SHALL map priority `P1→3`, `P2→2`, `P3→1`, and set `status = 2` (Open), `source = 3` (Phone), and tags `codemix-skill` plus lower-case languages.
- THE SYSTEM SHALL build the description from: the English summary, recommended action, the agent reply, and the original mixed transcript under a separator.
- WHEN Freshdesk succeeds THE SYSTEM SHALL return 200 `{ status: "success", ticket_id, ticket_url, raw }`.
- WHEN Freshdesk rejects THE SYSTEM SHALL return Freshdesk's status with code `PROVIDER_REJECTED`.

Verify: pending (T-011)

### REQ-API-003: Server configuration validation
Priority: Must
Current: Partial
**User story:** As a deployer, I want misconfiguration reported clearly, so that tickets never go to the wrong helpdesk.

**Acceptance criteria**
- IF `FRESHDESK_API_KEY` is unset THEN THE SYSTEM SHALL return 501 `CONFIGURATION_ERROR` without calling Freshdesk.
- IF `FRESHDESK_DOMAIN` is unset THEN THE SYSTEM SHALL return 501 `CONFIGURATION_ERROR`. *(Gap: falls back to a hard-coded `citchennai-assist.freshdesk.com`.)*
- THE SYSTEM SHALL accept `FRESHDESK_DOMAIN` only as a bare hostname ending in `.freshdesk.com`.

Verify: pending (T-005)

### REQ-API-004: Error-response hygiene
Priority: Must
Current: Unmet
**User story:** As a Freshdesk owner, I want error responses that reveal nothing internal.

**Acceptance criteria**
- THE SYSTEM SHALL return errors only as `{ status: "error", error: { code, message } }` with fixed, non-sensitive messages.
- THE SYSTEM SHALL NOT include upstream provider text, `error.message`, stack traces, domains, or credentials in any response. *(Gap: `create-ticket.js` echoes Freshdesk's `description` and `error.message` in `message`.)*

Verify: pending (T-005)

### REQ-API-005: Correct, single-source CORS
Priority: Must
Current: Unmet
**User story:** As a deployer, I want browsers to accept only my origins, so that other sites can't drive my endpoints.

**Acceptance criteria**
- THE SYSTEM SHALL set CORS headers in exactly one place per endpoint.
- THE SYSTEM SHALL set `Access-Control-Allow-Origin` to the request origin only if it is in `ALLOWED_ORIGIN` (comma-separated), with `Vary: Origin`.
- THE SYSTEM SHALL NOT send `Access-Control-Allow-Credentials: true` together with `*`. *(Gap: `vercel.json` sends `*` + credentials for `/api/*`.)*

Verify: pending (T-004)

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
Current: Met
**User story:** As an MCP client, I want a compact JSON result and clear errors.

**Acceptance criteria**
- WHEN called with a non-blank utterance THE SYSTEM SHALL return one text content item containing JSON with `intent, confidence, languages, switch_points, order_id, sentiment, urgency, reply_mixed, ticket_subject, ticket_summary, ticket_action, ticket_priority`.
- IF the utterance is empty or whitespace THEN THE SYSTEM SHALL return `isError: true` with text `utterance is required`.

Verify: `mcp-server/verify.mjs`; pending (T-012)

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

### REQ-UI-002: Mode indicators
Priority: Should
Current: Met
**User story:** As a visitor, I want to know whether Gemini/ElevenLabs or the built-in fallbacks are in use.

**Acceptance criteria**
- THE SYSTEM SHALL show the understanding source (`built-in` or `Gemini (<model>)`) and voice source (`browser` or `ElevenLabs`), updating as keys are typed and after each call.

Verify: pending (T-013)

### REQ-UI-003: Zero-key operation
Priority: Must
Current: Met
**User story:** As a judge with no accounts, I want the full flow to work immediately.

**Acceptance criteria**
- WHEN no keys are entered THE SYSTEM SHALL complete the Handle-call flow using only the offline engine and browser voice, without console errors.
- THE SYSTEM SHALL work when `index.html` is served statically; the ticket sync may report "unavailable in this environment".

Verify: pending (T-013)

### REQ-UI-004: In-browser benchmark explorer
Priority: Should
Current: Partial
**User story:** As a judge, I want to inspect per-utterance results for each dataset.

**Acceptance criteria**
- THE SYSTEM SHALL offer Tuned, Extended, and Blind tabs showing intent, language, and entity accuracy, average latency, and a per-row table with pass/fail.
- WHEN "Test Call" is pressed on a row THE SYSTEM SHALL load that utterance and run the analysis (without creating a ticket, REQ-UI-005).
- THE SYSTEM SHALL label the intent score truthfully (raw score, not "/10"). *(Gap: shows "x/10" although scores reach 18.)*

Verify: pending (T-021)

### REQ-UI-005: Explicit consent before creating a real ticket
Priority: Must
Current: Unmet
**User story:** As a Freshdesk owner, I want tickets created only when a user deliberately asks, so that demo clicks and benchmark runs don't flood the helpdesk.

**Acceptance criteria**
- THE SYSTEM SHALL NOT call `/api/create-ticket` automatically after analysis. *(Gap: every Handle call, including benchmark "Test Call", creates a real ticket.)*
- WHEN the ticket card is shown THE SYSTEM SHALL offer a "Create Freshdesk ticket" button; only pressing it SHALL send the request.
- WHEN a ticket is created THE SYSTEM SHALL show its ID as a link; on failure a generic message.

Verify: pending (T-001)

### REQ-BEN-001: Tuned-set regression gate
Priority: Must
Current: Met
**User story:** As a maintainer, I want rule changes that break known calls to fail CI.

**Acceptance criteria**
- THE SYSTEM SHALL fail `npm test` unless tuned-set intent accuracy is 20/20 and entity precision is 20/20.

Verify: `test/benchmark.test.mjs`

### REQ-BEN-002: Generalisation gates
Priority: Must
Current: Met
**User story:** As a judge, I want evidence that the rules generalise beyond the tuned set.

**Acceptance criteria**
- THE SYSTEM SHALL fail `npm test` if extended-set intent accuracy < 85% or blind-set intent accuracy < 90%.
- THE SYSTEM SHALL print one parseable `RESULTS:` summary line.

Verify: `test/benchmark.test.mjs`

### REQ-BEN-003: Language-ID accuracy gate
Priority: Should
Current: Unmet
**User story:** As a maintainer, I want language-ID regressions caught, not just printed.

**Acceptance criteria**
- THE SYSTEM SHALL fail `npm test` if primary-language accuracy is < 95% on tuned, < 85% on extended, or < 90% on blind. *(Gap: printed but not asserted.)*

Verify: pending (T-009)

### REQ-BEN-004: Blind-set integrity
Priority: Must
Current: Unmet
**User story:** As a judge, I want "blind" to stay blind, so that the 96.2% figure means generalisation.

**Acceptance criteria**
- THE SYSTEM SHALL record a SHA-256 fingerprint of `BLIND_DATASET` and of the rule surface (`INTENT_RULES`, `EN_WORDS`, dialect and sentiment lexicons) at the last blind evaluation.
- IF the rule surface changes and blind accuracy is re-reported without new, unseen blind items THEN THE SYSTEM SHALL fail CI until the blind set is extended or relabelled "no longer blind" in the docs.

Verify: pending (T-014)

### REQ-BEN-005: Published numbers match the tests
Priority: Must
Current: Partial
**User story:** As a reader, I want README, ARCHITECTURE, and SUBMISSION figures to equal what `npm test` produces (constitution §5).

**Acceptance criteria**
- THE SYSTEM SHALL provide a check that parses the `RESULTS:` line and fails if accuracy figures in `README.md`, `ARCHITECTURE.md`, or `SUBMISSION.md` differ.
- THE SYSTEM SHALL describe model and version names consistently across docs and UI (e.g. Scribe `v1` vs `v2`).

Verify: pending (T-015)

### REQ-BEN-006: Offline latency budget
Priority: Should
Current: Partial
**User story:** As an integrator, I want the offline engine fast enough to run on every turn.

**Acceptance criteria**
- THE SYSTEM SHALL fail `npm test` if the median `analyseOffline` latency across all 80 utterances exceeds 2 ms, or p95 exceeds 10 ms, on the CI runner. *(Gap: measured, not asserted.)*

Verify: pending (T-009)

### REQ-SEC-001: Ticket endpoint abuse protection
Priority: Must
Current: Unmet
**User story:** As a Freshdesk owner, I want only my front end or trusted agents able to create tickets.

**Acceptance criteria**
- THE SYSTEM SHALL require a valid `X-FreshVoice-Token` header matching `TICKET_API_TOKEN` (constant-time compare) on `/api/create-ticket`; otherwise 401 `UNAUTHORIZED`.
- THE SYSTEM SHALL limit ticket creation to 5 requests per minute per client IP (best-effort per instance), returning 429 `RATE_LIMITED`.
- THE SYSTEM SHALL reject utterances longer than 2,000 characters with 413 `PAYLOAD_TOO_LARGE`.

Verify: pending (T-002)

### REQ-SEC-002: Requester identity integrity
Priority: Must
Current: Partial
**User story:** As a Freshdesk owner, I want nobody able to file tickets impersonating arbitrary customers.

**Acceptance criteria**
- THE SYSTEM SHALL accept a client-supplied `email` only if it matches a strict email pattern and the request is authorised (REQ-SEC-001); otherwise it SHALL use the synthetic `caller-<order>@codemix-skill.demo` address. *(Gap: any string containing `@` is accepted.)*

Verify: pending (T-003)

### REQ-SEC-003: Secret handling
Priority: Must
Current: Met
**User story:** As the team, I want keys never committed or persisted.

**Acceptance criteria**
- THE SYSTEM SHALL read server keys only from environment variables and keep `.env*` (except `.env.example`) git-ignored.
- THE SYSTEM SHALL hold browser-entered keys only in page memory (password inputs), never in `localStorage`, `sessionStorage`, cookies, URLs, or logs.
- THE SYSTEM SHALL run a secret-pattern scan (`AIza…`, `sk_…`, Freshdesk key formats) in CI and fail on a match.

Verify: pending (T-007)

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
- THE SYSTEM SHALL assert identical export surfaces and deep-equal analysis output for a smoke utterance.
- THE SYSTEM SHALL fail CI if the committed `codemix.cjs` differs from a fresh build.

Verify: `scripts/build-cjs.js`; `.github/workflows/ci.yml`

### REQ-BLD-002: Continuous integration gates
Priority: Must
Current: Met
**User story:** As a maintainer, I want every push and PR to prove specs, build, tests, and MCP interop.

**Acceptance criteria**
- WHEN code is pushed to `main` or a PR targets `main` THE SYSTEM SHALL run, on Node 20 and 22: spec check, MCP dependency install, CJS build, drift check, benchmark suite, MCP verification.

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

### REQ-NFR-001: Offline availability
Priority: Must
Current: Met
**User story:** As a presenter on unreliable venue wifi, I want core understanding with no network.

**Acceptance criteria**
- THE SYSTEM SHALL perform tokenization, intent, entities, reply, and ticket drafting with no network access.
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
- THE SYSTEM SHALL NOT log utterances, transcripts, emails, or keys in API functions or the MCP server.
- THE SYSTEM SHALL send the transcript only to services the visitor enabled (Gemini, ElevenLabs), and to Freshdesk only on explicit ticket creation (REQ-UI-005).
- THE SYSTEM SHALL document this data flow in the README. *(Gap: flow undocumented; ticket auto-creation sends transcripts without consent.)*

Verify: pending (T-023)

### REQ-NFR-004: Maintainability of rules
Priority: Should
Current: Met
**User story:** As a maintainer, I want to add an intent by editing data, not control flow.

**Acceptance criteria**
- THE SYSTEM SHALL define intents solely as `INTENT_RULES` entries (`id, name, action, priority, subject, weights[{kw[], w}]`), with no intent-specific branching elsewhere.
- WHEN an intent is added THE SYSTEM SHALL require benchmark items for it in all three datasets (enforced by review against this spec).

Verify: `test/benchmark.test.mjs`; pending (T-008)

---

## 5. Open questions
| ID | Question | Affects |
|---|---|---|
| Q-1 | Should server-side ticketing ever use Gemini output, or stay offline-only? | REQ-LIVE-006, REQ-API-002 |
| Q-2 | Is a per-instance in-memory rate limit sufficient, or should Vercel KV/Upstash be approved (adds a dependency)? | REQ-SEC-001 |
| Q-3 | Should confidence thresholds (8 / margin 3) be tuned on the tuned set only, to protect blind integrity? | REQ-ENG-008, REQ-BEN-004 |
| Q-4 | Move browser Gemini/ElevenLabs calls behind a backend proxy now, or keep them as a labelled demo concession? | REQ-SEC-003, C-4 |
| Q-5 | Which of Telugu, Kannada, Malayalam, Gujarati, Punjabi, Odia get romanized marker lexicons and benchmark items next? | REQ-ENG-007 |
