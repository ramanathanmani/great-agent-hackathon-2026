# 001 — Decision-Policy Layer: Tasks

Tick a task in the same PR as the code that completes it, and update the matching
`Verify:` line in `requirements.md` from `pending (T-###)` to the real test path.

## Phase 1 — Pin current behaviour with tests
- [ ] T-001: Create `test/decision-policy.test.mjs` with tests for the store (append, family mapping, isolation, unknown ticket) and for suppression (order preserved, `suppressed` list, all-suppressed → `escalate_supervisor`, invocation count) (REQ-DP-001, REQ-DP-002)
- [ ] T-002: Add register-metric tests: hand-computed ratio/length for a known token array, empty/punctuation-only input, and a parity loop over all 80 dataset utterances asserting |Δ ratio| ≤ 0.25 (REQ-DP-003, REQ-DP-004)
- [ ] T-004: Add table-driven `selectTier` tests covering every threshold and exact boundary values (REQ-DP-006)
- [ ] T-005: Add a continuity test: fail on `full`, switch to `reduced` and `offline`, assert the family is still failed; plus a naive-controller test showing the contrast (REQ-DP-007)

## Phase 2 — Close implementation gaps
- [ ] T-003: Add `discardPayload()` to `FlakyTicketBackend`; call it in `escalateAtomic` when `createTicket` fails, swallowing its errors; add seeded fuzz tests over failure rates {0, 0.12, 0.5, 1} asserting no orphans and correct outcomes (REQ-DP-005)
- [ ] T-006: Add a `--check` flag to `simulate.mjs` that asserts the REQ-DP-008 thresholds, exits non-zero on violation and writes no file; assert run-to-run determinism of 5.1/5.3/5.4; decide whether `decision-policy/results/` is committed or git-ignored and document it (REQ-DP-008)

## Phase 3 — Wire in and document
- [ ] T-008: Add `test/decision-policy.test.mjs` and `node decision-policy/simulate.mjs --check` to `npm test` so CI runs them on Node 20 and 22 (REQ-DP-001, REQ-DP-002, REQ-DP-003, REQ-DP-004, REQ-DP-005, REQ-DP-006, REQ-DP-007, REQ-DP-008)
- [ ] T-007: Fold the narrowed 5.1 claim and the "structural guarantee" labels for 5.3/5.4 into SUBMISSION.md, ARCHITECTURE.md and decision-policy/README.md, citing seed and reproduce command (REQ-DP-009)
- [ ] T-009: When all tasks are done and no `Verify:` line is pending, set `Status: Implemented` in `requirements.md` (REQ-DP-008, REQ-DP-009)
