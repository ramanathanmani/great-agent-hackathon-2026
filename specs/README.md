# Spec-Driven Development

FreshVoice uses a lightweight, tool-free spec workflow. Specs are plain
Markdown, reviewed in PRs, and checked in CI by `scripts/check-specs.mjs`.

## Layout

```
specs/
├── constitution.md          # project-wide principles (read first)
├── README.md                # this file
├── _template/               # copy this to start a new spec
│   ├── requirements.md
│   ├── design.md
│   └── tasks.md
└── NNN-slug/                # one folder per feature / change
    ├── requirements.md      # WHAT and WHY  — user stories + acceptance criteria
    ├── design.md            # HOW           — components, interfaces, data, risks
    └── tasks.md             # STEPS         — ordered, checkable, traced to REQs
```

## Workflow

1. **Specify** — copy `_template/` to `specs/NNN-slug/` (next free number).
   Fill in `requirements.md` with `Status: Draft`. Open a PR for review.
2. **Approve** — once reviewers agree on the requirements, set `Status: Approved`.
3. **Design** — write `design.md`: interfaces, data flow, error handling,
   test strategy, and a traceability table back to requirement IDs.
4. **Plan** — break the design into `tasks.md`. Each task is small enough for
   one PR and lists the `REQ-*` IDs it satisfies.
5. **Implement** — work task by task. Tick `- [x]` in the same PR as the code.
   When a task adds the test for a requirement, update that requirement's
   `Verify:` line from `pending (T-###)` to the real file path.
6. **Close** — when all tasks are done and no `Verify:` line is pending, set
   `Status: Implemented`.

## Conventions (enforced by `npm run check:specs`)

| Rule | Format |
|---|---|
| Status line in `requirements.md` | `Status: Draft` \| `Approved` \| `Implemented` |
| Requirement heading | `### REQ-<AREA>-<NNN>: Title` e.g. `### REQ-DP-001: ...` |
| Acceptance criteria | bullet list under the requirement, EARS style (`WHEN … THE SYSTEM SHALL …`) |
| Verification | `Verify: \`path/to/test.mjs\`` (file must exist) or `Verify: pending (T-###)` |
| Task line | `- [ ] T-###: description (REQ-DP-001, REQ-DP-002)` |
| Coverage | every REQ covered by ≥ 1 task; every task references an existing REQ |
| Implemented specs | no `pending` verifications and no unchecked tasks |

## Working with Claude Code

`CLAUDE.md` at the repo root tells Claude to follow this workflow: it will
refuse to implement unspecified behaviour, ask before changing requirements,
and keep tasks/verify lines in sync with the code it writes.
