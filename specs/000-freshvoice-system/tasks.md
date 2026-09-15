# 000 — FreshVoice System: Implementation Plan

Rules: one task ≈ one PR. Tick the box in the same PR as the code. When a task adds
the test for a requirement, replace `pending (T-###)` on that requirement's `Verify:`
line with the test path, and update its `Current:` to `Met` once every criterion passes.
Task IDs are stable; new tasks get new numbers.

Legend: 🔴 Must before next public demo · 🟠 Must · 🟡 Should/Could

## Phase 0 — Safety & security (block public demo until done)
- [ ] T-001: 🔴 Remove automatic ticket sync after "Handle call"; add an explicit "Create Freshdesk ticket" button on the ticket card; benchmark "Test Call" never creates tickets (REQ-UI-005, REQ-NFR-003)
- [ ] T-002: 🔴 Create `api/_lib/http.js`: allowlisted-Origin-or-token gate (`X-FreshVoice-Token` vs `FRESHVOICE_API_TOKEN`, constant-time), in-memory per-instance per-IP limiter, no external store (D-4) (codemix 20, stt 10, tts 20, voices 10, create-ticket 5 per min, `Retry-After`), size caps (2,000 chars / 10 MB / 500 chars → 413); apply to every endpoint; tests in `test/api.test.mjs`. Must ship in the same release as T-027/T-028 (REQ-SEC-001)
- [ ] T-003: 🔴 Strict email validation; honour client `email` only for token-authenticated integrators, otherwise use the synthetic address; tests (REQ-SEC-002)
- [ ] T-004: 🔴 Delete the `/api/(.*)` CORS headers from `vercel.json`; add a `cors(req,res)` helper using a comma-separated `ALLOWED_ORIGIN` allowlist, `Vary: Origin`, 204 preflight, no credentials header; tests (REQ-API-005)
- [ ] T-005: 🔴 Uniform error envelope with fixed messages; drop upstream `description`/`error.message`; require `FRESHDESK_DOMAIN` (hostname ending `.freshdesk.com`) and remove the hard-coded default; 501 for unset ElevenLabs key; update `.env.example` with all server variables; tests (REQ-API-003, REQ-API-004)
- [ ] T-006: 🟠 Extend `esc()` to escape `"` and `'`; replace the inline `onclick` in the benchmark table with delegated listeners and `data-id`; add an XSS probe to the UI smoke test (REQ-SEC-004)
- [ ] T-007: 🟠 Add a zero-dependency `scripts/scan-secrets.mjs` (patterns: `AIza[0-9A-Za-z_-]{35}`, `sk_[0-9a-f]{32,}`, 20-char Freshdesk keys near `freshdesk`) and a CI step (REQ-SEC-003)

## Phase 1 — Gemini primary behind a backend (D-1, D-2)
- [ ] T-027: 🔴 Add `analyse(utterance, { apiKey, model, deadlineMs, fetch, sleep })` to `codemix.js`: backup first, Gemini attempt with AbortController deadline (10 s), `intent_source` + `fallback_reason`, never throws; rebuild CJS. Switch `api/codemix.js` and `api/create-ticket.js` to `analyse()` with `GEMINI_API_KEY`/`GEMINI_MODEL`; add the 10-minute per-instance result cache for create-ticket; add `intent_source` to the Freshworks payload and `source-<intent_source>` ticket tag; `test/analyse.test.mjs` covering every fallback reason and the deadline (REQ-LIVE-001, REQ-LIVE-004, REQ-LIVE-007, REQ-API-001, REQ-API-002, REQ-NFR-005)
- [ ] T-028: 🔴 Add `api/stt.js`, `api/tts.js`, `api/voices.js` calling ElevenLabs with `ELEVENLABS_API_KEY` (default voice `ELEVENLABS_VOICE_ID`, voices cached 10 min), with timeouts per design §4.5 and the T-002 gate; tests with stubbed `fetch` (REQ-API-006, REQ-VOICE-001, REQ-VOICE-003)
- [ ] T-029: 🔴 Update `index.html`: remove the Keys panel and all direct Gemini/ElevenLabs calls; analyse via `/api/codemix`, record via `/api/stt`, play via `/api/tts`; show "Understood by Gemini (<model>)" or "Backup engine: <reason>"; static-file mode runs the backup in the browser labelled "server not reachable" (REQ-UI-002, REQ-UI-003, REQ-SEC-003)
- [ ] T-030: 🟠 MCP server uses `analyse()` with `GEMINI_API_KEY` from its environment; add `intent_id` and `intent_source` to the payload; document the env var in `mcp-server/README.md` (REQ-MCP-002)
- [ ] T-031: 🟠 `scripts/benchmark-gemini.mjs` + `npm run benchmark:gemini`: 80 utterances through `analyse()` with the backup disabled, 1 req/s, recording per-set intent/language/order accuracy, invalid-output rate, latency, model, prompt and blind fingerprints → `benchmarks/gemini-<model>-<date>.json`; benchmark explorer shows the latest file (REQ-BEN-007, REQ-UI-004)

## Phase 2 — Close verification gaps (pin today's behaviour)
- [ ] T-008: 🟠 `test/engine.unit.test.mjs` covering: tokenizer (native script stays whole, digits/punctuation `xx`, EN_WORDS case-folding); switch points; group-once scoring, tie → first rule, threshold 3 → `general_support`; urgency map; non-empty reply per language branch; ticket fields; result shape + determinism; `orders` merge without mutation; no intent-specific branching (REQ-ENG-001, REQ-ENG-002, REQ-ENG-003, REQ-ENG-006, REQ-ENG-009, REQ-ENG-010, REQ-ENG-011, REQ-ENG-012, REQ-NFR-004)
- [ ] T-009: 🟠 Assert backup language-ID thresholds (95/85/90 overall, plus ≥ 90% for blind Hindi items and blind Tamil items separately) and latency budget (median ≤ 2 ms, p95 ≤ 10 ms over 80 calls) in `test/benchmark.test.mjs` (REQ-ENG-007, REQ-BEN-003, REQ-BEN-006)
- [ ] T-010: 🟠 Unit-test `analyseLive` with stubbed `fetch` and injected sleep: header-only key, model prefix strip, 429/503 retry delays [1200, 4800], 404 and 400 immediate, thought parts ignored, fence stripping, invalid JSON (REQ-LIVE-001, REQ-LIVE-002, REQ-LIVE-003)
- [ ] T-011: 🟠 `test/api.test.mjs` with mock `req`/`res` for both analysis handlers: 204/405/400/200/500 matrix, `freshworks_payload` shape incl. `intent_source`, Freshdesk body mapping (priority, status, source, tags, description) against stubbed `fetch`, success URL format (REQ-API-001, REQ-API-002)
- [ ] T-012: 🟡 Extend `mcp-server/verify.mjs`: all payload fields present, blank utterance → `isError` with `utterance is required` (REQ-MCP-002)
- [ ] T-013: 🟠 `test/e2e/ui.smoke.mjs` (Playwright as a devDependency outside the core), with API routes stubbed: Handle call reveals 5 cards in order; no Keys panel; Gemini and backup source labels; no request to `/api/create-ticket` without a click; STT/TTS proxy paths; static-file backup mode. Add a manual voice checklist to `docs/qa-checklist.md` (REQ-UI-001, REQ-VOICE-001, REQ-VOICE-003)
- [ ] T-014: 🟠 `scripts/check-blind-integrity.mjs`: SHA-256 of `BLIND_DATASET`, the backup rule surface and the Gemini prompt, compared with `test/blind-fingerprint.json`; CI fails on a change unless the fingerprint file is updated together with new blind items or a "no longer blind" doc note (REQ-BEN-004)
- [ ] T-015: 🟠 `scripts/check-doc-metrics.mjs`: compare README/ARCHITECTURE/SUBMISSION figures with the `npm test` `RESULTS:` line (backup) and the latest `benchmarks/gemini-*.json` (Gemini); CI step after tests (REQ-BEN-005)

## Phase 3 — Behavioural improvements
- [ ] T-016: 🟠 Context-anchored order-ID extraction (prefer numbers after order/id/transaction/number; skip currency amounts); adversarial unit tests; keep 100% entity precision (REQ-ENG-004)
- [ ] T-017: 🟡 Tighten the sentiment word list: `yaar`/`scene` count only alongside a negative marker; negative tests (REQ-ENG-005)
- [ ] T-018: 🟡 Backup confidence from score and runner-up margin (≥ 8 & margin ≥ 3 → high; general_support → low), tuned on the tuned set only (D-3); unit tests (REQ-ENG-008)
- [ ] T-019: 🔴 Closed-schema Gemini prompt and validated merge: build the allowed `intent_id` list from `INTENT_RULES`; delimit caller speech; validate enums, token shape, order-ID format; derive priority/subject/action/urgency from the rule table; cap `summary` at 600 and `reply_mixed` at 300 chars with no URLs/HTML; unit tests with injection, partial and out-of-vocabulary payloads (REQ-LIVE-003, REQ-LIVE-005, REQ-LIVE-006, REQ-NFR-004)
- [ ] T-020: 🟡 Match browser TTS locale to the detected language; add an SR locale selector (hi/ta/bn/en-IN) (REQ-VOICE-002, REQ-VOICE-004)
- [ ] T-021: 🟡 Show the raw backup intent score (e.g. `Score 11`) instead of `x/10`; label in-browser benchmark as "Backup engine"; Test Call runs without ticketing (REQ-UI-004)
- [ ] T-022: 🟡 Attach globals only when `typeof window !== "undefined"`; remove the `globalThis` writes; keep build parity green (REQ-NFR-002)
- [ ] T-023: 🟠 Audit `api/` and `mcp-server/` for logging of utterances/audio/email/keys (none allowed); add the demo notice ("Calls are processed by Google Gemini and ElevenLabs") and a README "Data flow & privacy" section (REQ-NFR-003)

## Phase 4 — Documentation & closure
- [ ] T-024: 🟡 Reconcile docs with D-1/D-2 and the code: Gemini as the headline path and offline as backup in README/ARCHITECTURE/SUBMISSION/fallback-strategy; remove "add your keys" instructions; Scribe `v1` everywhere; ROADMAP "20-sentence"→80, "3-order fixture"→5, backend proxy and ticket webhook marked done (REQ-BEN-005)
- [ ] T-025: 🟡 Complete spec 001 and mark REQ-INT-001 Met (REQ-INT-001)
- [ ] T-026: 🟡 When no requirement is Partial/Unmet and no `Verify:` is pending, set `Status: Implemented` and publish the final scorecard (REQ-BEN-005, REQ-INT-001)

## Dependency order
```
T-004, T-005 ─▶ T-002 ─▶ T-027 ─▶ T-028 ─▶ T-029   (keys move server-side only with protection in place)
T-010 ─▶ T-019 ─▶ T-027                            (validated merge before Gemini drives tickets)
T-001 ─▶ T-029 ─▶ T-013
T-027 ─▶ T-030, T-031 ─▶ T-015 ─▶ T-024
T-008 ─▶ T-016, T-017, T-018
T-009, T-014 ─▶ T-015
All ─▶ T-026
```
