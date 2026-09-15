# CLAUDE.md

This repo uses **spec-driven development**. Read `specs/constitution.md` and
`specs/README.md` before making changes.

## Rules for Claude

1. **Find the spec first.** Before writing code, locate the spec in `specs/NNN-slug/`
   that covers the change. If none exists, do not implement. Propose a new spec
   (copy `specs/_template/`, `Status: Draft`) and ask the user to approve it.
2. **Don't silently change requirements.** If the code needs to behave differently from
   `requirements.md`, stop and ask. Update the requirement in the same PR only
   after the user agrees.
3. **Work task by task.** Implement one `T-###` from `tasks.md` at a time. In the same
   change:
   - tick the task `- [x]`,
   - replace `Verify: pending (T-###)` with the real test path when the task adds that test,
   - update `design.md` if an interface changed.
4. **Keep the traceability check green.** Run `npm run check:specs` after editing anything under `specs/`.
5. **Respect the constitution.** In particular:
   - edit `codemix.js` only, never `codemix.cjs`, then run `npm run build`;
   - add no runtime dependencies to the core;
   - keep every fallback path;
   - label synthetic or by-construction numbers honestly.

## Commands

| Task | Command |
|---|---|
| Check spec traceability | `npm run check:specs` |
| Regenerate CommonJS build | `npm run build` |
| Benchmark / tests | `npm test` |
| MCP server check | `npm run setup && npm run verify:mcp` |
| Decision-policy harness | `node decision-policy/simulate.mjs` |

## Map

- `codemix.js`: offline engine, intent rules, datasets (source of truth)
- `api/`: Vercel serverless functions
- `mcp-server/`: MCP tool `analyse_codemixed_call`
- `decision-policy/`: Round 2 prototype, specified by `specs/001-decision-policy-layer/`
- `index.html`: demo UI
- `specs/`: requirements, design, tasks
