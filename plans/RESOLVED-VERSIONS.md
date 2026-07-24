# Resolved frontend versions (scaffold: 2026-07-23)

Compare against `../thesis-docs/plan/frontend/02-shadcn-components.md §0.1`.
Package manager: **pnpm** (not npm as originally pinned).
Linter: **oxlint** (originally ESLint) + **Prettier** (as formatter only).

| Package | Pinned in thesis-docs §0.1 | Actually resolved |
|---|---|---|
| shadcn (CLI) | 4.10.0 | 4.14.0 |
| radix-ui | 1.5.0 | 1.6.5 |
| tailwindcss | 4.3.0 | 4.3.3 |
| @tanstack/react-table | 8.21.3 | — (not yet installed; plan 002+) |
| @tanstack/react-query | 5.101.0 | 5.101.4 (installed by plan 002, already present in the initial commit) |
| react-hook-form | 7.77.0 | — (not yet installed; plan 002+) |
| zod | 4.4.3 | — (not yet installed; plan 002+) |
| lucide-react | 1.17.0 | 1.25.0 (pulled in as a shadcn init dependency during this plan, Step 3 — earlier than the doc anticipated) |
| sonner | 2.0.7 | — (not yet installed; plan 002+) |
| react / react-dom | — | 19.2.8 / 19.2.8 |
| typescript | — | 6.0.3 |
| vite | — | 8.1.5 |
| oxlint | (n/a in doc) | 1.75.0 |
| prettier | (n/a in doc) | 3.9.6 |

## Notes

- Versions above were read directly from each package's `node_modules/<pkg>/package.json`
  `"version"` field in this worktree (not from `pnpm ls`), because a `pnpm-workspace.yaml`
  at an ancestor directory of this worktree causes `pnpm ls` to sometimes resolve against
  a different project when invoked from a nested worktree path. See plan 001's executor
  report for details.
- `shadcn` (CLI) is recorded as a runtime `dependency` in `package.json` — this is the
  shadcn@4.14.0 CLI's own default behavior on `init`, not a deliberate choice by this plan.
- Rows differing from the pinned table (for humans updating the spec repo): shadcn CLI,
  radix-ui, tailwindcss, @tanstack/react-query, lucide-react — all newer patch/minor
  versions within the same major line as pinned, consistent with plan 001 §3.1's
  "install by major line" policy.
