# Plan04 — local main integration

## Authority and scope

The user authorized local commits and integration of the frontend and backend
plan04 branches into their respective `main`, after checking `origin`.
No push, pull request, unrelated branch merge, configuration change, database
operation, or write to the outer repository or thesis documentation repository.

Fresh preflight: both `origin/main` refs equal local `main`; no remote changes.
Frontend source: `feat/document-export-ui` at
`320ea0373f756024958961c93c126757c61cfb05`, clean.
Backend source: `feat/document-export-contract` at
`0757d9acd1adc6f60127466070f5a2bdc714ec76`, clean.
The user explicitly selected inclusion of commit `0757d9a` and its two Compunex
file deletions (`integrate_backend_full_0757_include_compunex_deletions`).
Do not reset or rewrite that commit. Both merge forecasts are conflict-free.

## Recoverable tasks

- [ ] M04-01 — IN PROGRESS: integrate frontend into local `main` using only
      fast-forward merges of the authorized snapshots and tracking metadata.
      Preserve commit history; stop on unexpected identity, dirt, or conflicts.
- [ ] M04-02 — PENDING: integrate backend into local `main`, including the
      explicitly authorized Compunex deletion commit; no unrelated changes.
- [ ] M04-03 — PENDING: independently check final branches, ancestry, tree
      identities, clean worktrees, unchanged remote refs, and metadata format.
      Record final commit identities and leave both repositories on `main`.

## Checks and limits

This is delivery integration, not a new product validation process. Fast-forward
integration must preserve the already reviewed source trees. Do not rerun
product suites, change timeouts, regenerate the graph, or call the live backend.
Historical global UI test failures are not converted to PASS by this operation.
Only the integration tracker is newly authored; no final validation report.
The legacy full task mirror remains pending due to its storage size; this small
integration document has a separate full memory mirror.
