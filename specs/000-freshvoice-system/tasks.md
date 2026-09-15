# 000 — FreshVoice System: Implementation Plan

Rules: one task ≈ one PR. Tick the box in the same PR as the code. When a task adds
the test for a requirement, replace `pending (T-###)` on that requirement's `Verify:`
line with the test path, and update its `Current:` to `Met` once every criterion passes.

Legend: 🔴 Must before next public demo · 🟠 Must · 🟡 Should/Could

## Phase 0 — Safety & security (block public demo until done)
- [ ] T-001: 🔴 Remove automatic ticket sync after "Handle call"; add an explicit "Create Freshdesk ticket" button on the ticket card; benchmark "Test Call" never creates tickets (REQ-UI-005, REQ-NFR-003)
- [ ] T-002: 🔴 Create `api/_lib/http.js` with `requireToken` (constant-time compare against `TICKET_API_TOKEN`, header `X-FreshVoice-Token`), an in-memory per-IP limiter (5/min), and a 2,000-char utterance cap; apply to `/api/create-ticket`; tests in `test/api.test.mjs` (REQ-SEC-001)
- [ ] T-003: 🔴 Strict email validation; honour client `email` only on authorised requests, otherwise use the synthetic address; tests (REQ-SEC-002)
- [ ] T-004: 🔴 Delete the `/api/(.*)` CORS headers from `vercel.json`; add a `cors(req,res)` helper using a comma-separated `ALLOWED_ORIGIN` allowlist with `Vary: Origin` and no credentials header; tests (REQ-API-005)
- [ ] T-005: 🔴 Uniform error envelope with fixed messages; drop upstream `description`/`error.message`; require a `FRESHDESK_DOMAIN` hostname ending `.freshdesk.com`, removing the hard-coded default; tests (REQ-API-003, REQ-API-004)
- [ ] T-006: 🟠 Extend `esc()` to escape `"` and `'`; replace the inline `onclick` in the benchmark table with delegated listeners and `data-id`; add an XSS probe to the UI smoke test (REQ-SEC-004)
- [ ] T-007: 🟠 Add a zero-dependency `scripts/scan-secrets.mjs` (patterns: `AIza[0-9A-Za-z_-]{35}`, `sk_[0-9a-f]{32,}`, 20-char Freshdesk keys near `freshdesk`) and a CI step; document that browser keys stay in memory (REQ-SEC-003)

## Phase 1 — Close verification gaps (pin today's behaviour)
- [ ] T-008: 🟠 `test/engine.unit.test.mjs` covering: tokenizer (native script stays whole, digits/punctuation `xx`, EN_WORDS case-folding); switch points; group-once scoring, tie → first rule, threshold 3 → `general_support`; urgency map; non-empty reply per language branch; ticket fields; result shape + determinism; `orders` merge without mutation; no intent-specific branching (REQ-ENG-001, REQ-ENG-002, REQ-ENG-003, REQ-ENG-006, REQ-ENG-009, REQ-ENG-010, REQ-ENG-011, REQ-ENG-012, REQ-NFR-004)
- [ ] T-009: 🟠 Assert language-ID thresholds (95/85/90) and latency budget (median ≤ 2 ms, p95 ≤ 10 ms over 80 calls) in `test/benchmark.test.mjs` (REQ-ENG-007, REQ-BEN-003, REQ-BEN-006)
- [ ] T-010: 🟠 Make the retry sleep injectable (`config.sleep`, default `setTimeout`); `test/live.test.mjs` with stubbed `fetch` covering: no-key throw, header-only key, model prefix strip, 429/503 retry delays [1200, 4800], 404 and 400 immediate, thought parts ignored, fence stripping, invalid JSON (REQ-LIVE-001, REQ-LIVE-002, REQ-LIVE-003)
- [ ] T-011: 🟠 `test/api.test.mjs` with mock `req`/`res` for both handlers: OPTIONS/405/400/200/500 matrix, `freshworks_payload` shape, Freshdesk body mapping (priority, status, source, tags, description) against a stubbed `fetch`, success URL format (REQ-API-001, REQ-API-002)
- [ ] T-012: 🟡 Extend `mcp-server/verify.mjs`: all 12 payload fields present, blank utterance → `isError` with `utterance is required` (REQ-MCP-002)
- [ ] T-013: 🟠 `test/e2e/ui.smoke.mjs` (Playwright as a devDependency outside the core): zero-key Handle call reveals 5 cards in order; mode chips; invalid Gemini key falls back with a reason shown; no request to `/api/create-ticket` without a click; voice paths stubbed. Add a manual voice checklist to `docs/qa-checklist.md` (REQ-UI-001, REQ-UI-002, REQ-UI-003, REQ-LIVE-004, REQ-VOICE-001, REQ-VOICE-003)
- [ ] T-014: 🟠 `scripts/check-blind-integrity.mjs`: SHA-256 of `BLIND_DATASET` and of the rule surface, compared with `test/blind-fingerprint.json`; CI fails on a rule-surface change unless the fingerprint file is updated together with new blind items or a "no longer blind" doc note (REQ-BEN-004)
- [ ] T-015: 🟠 `scripts/check-doc-metrics.mjs`: parse `npm test` `RESULTS:` output and fail if README/ARCHITECTURE/SUBMISSION figures differ; add a CI step after tests (REQ-BEN-005)

## Phase 2 — Behavioural improvements (spec-approved changes)
- [ ] T-016: 🟠 Context-anchored order-ID extraction (prefer numbers after order/id/transaction/number; skip currency amounts); add adversarial cases (amount + order ID) to unit tests; keep 100% entity precision (REQ-ENG-004)
- [ ] T-017: 🟡 Tighten the sentiment lexicon: `yaar`/`scene` count only alongside a negative marker; add negative tests (REQ-ENG-005)
- [ ] T-018: 🟡 Compute confidence from score and runner-up margin (≥ 8 & margin ≥ 3 → high; general_support → low); tune on the tuned set only (Q-3); unit tests (REQ-ENG-008)
- [ ] T-019: 🟠 Schema-validated `merge`: enum and type checks, token shape check, `intent_source`, reconcile `intent_id`; harden prompt delimiting; unit tests with malicious and partial live payloads (REQ-LIVE-005, REQ-LIVE-006)
- [ ] T-020: 🟡 Match browser TTS locale to the detected language; add an SR locale selector (hi/ta/bn/en-IN) (REQ-VOICE-002, REQ-VOICE-004)
- [ ] T-021: 🟡 Show the raw intent score (e.g. `Score 11`) instead of `x/10`; verify Test Call runs without ticketing (REQ-UI-004)
- [ ] T-022: 🟡 Attach globals only when `typeof window !== "undefined"`; remove the `globalThis` writes; keep build parity green (REQ-NFR-002)
- [ ] T-023: 🟠 Audit `api/` and `mcp-server/` for logging of utterance/email/keys (none allowed); add a "Data flow & privacy" README section (REQ-NFR-003)

## Phase 3 — Documentation & closure
- [ ] T-024: 🟡 Reconcile docs with code: Scribe `v1` everywhere (index.html snippet, fallback-strategy, ROADMAP); ROADMAP "20-sentence"→80, "3-order fixture"→5, mark ticket webhook done (REQ-BEN-005)
- [ ] T-025: 🟡 Complete spec 001 and mark REQ-INT-001 Met (REQ-INT-001)
- [ ] T-026: 🟡 When no requirement is Partial/Unmet and no `Verify:` is pending, set `Status: Implemented` and publish the final scorecard (REQ-BEN-005, REQ-INT-001)

## Dependency order
```
T-001 ─┐
T-004 ─┼─▶ T-002 ─▶ T-003 ─▶ T-011
T-005 ─┘
T-008 ─▶ T-016, T-017, T-018 (behaviour changes need pinned tests first)
T-010 ─▶ T-019
T-009, T-014 ─▶ T-015 ─▶ T-024
T-013 depends on T-001, T-006
All ─▶ T-026
```
