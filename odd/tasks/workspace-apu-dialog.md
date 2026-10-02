# Workspace APU editing

Keep the workspace APU preview read-only and spreadsheet-familiar; edit the complete APU in a large dialog without leaving the workspace.

## Scope and decisions

- Reuse the existing APU editor, mutation hooks, section grids, and secondary dialogs.
- Preserve workspace URL, selected rubro, version, and server-owned calculations.
- Synchronize editor and workspace queries; keep the modal mounted during background refresh.
- Protect local drafts and pending saves on close; explain existing per-cell/explicit save behavior.
- Do not add a grid dependency, change backend APIs, or migrate insumos and other forms.
- Source of HTTP truth: current resources, DTOs, and tests in ../thesis-back-quarkus.

## Tasks

- [ ] APU-1: Extract shared editor and open it in a large workspace dialog; verify save/refetch, header freshness, close protection, and unchanged route.
  - Route: delegated; preparation and multiple non-trivial files require a writer.
  - Acceptance: route and dialog use one editor; existing controls remain available; no unmount on autosave; local drafts are not silently lost.
  - Checks: focused workspace/editor/hook tests, typecheck, lint, ADR 9, formatting.
  - Commit: pending.
- [ ] APU-2: Present read-only composition as a spreadsheet-familiar semantic table and verify layout at 1136x683.
  - Route: delegated; presentation prepares edits to the same component and its existing tests.
  - Acceptance: cell borders, neutral header, right-aligned numbers, readable description, sticky header and horizontal scrolling; no client-side money arithmetic.
  - Checks: existing focused tests, browser inspection, pnpm run verify at integration close.
  - Commit: pending.

## Verification policy

- Effective TDD: enabled for critical regressions only, per project Implementation and testing policy; one observed RED before fixing save/refetch/data-corruption risks.
- Runner: `pnpm exec vitest run <focused Vitest file paths>`. Observed `pnpm run test -- <paths>` runs the entire suite because the extra `--` ends Vitest argument parsing.
- Do not add tests for simple styles/copy; retain existing tests and update obsolete editor-link expectations.
- Read docs/bugs.md; permissive mocks do not establish contract compatibility.
- RDD: off (global), read from gentle-ai review mode status; no native review launched.

## Delivery and recovery

- Branch: feat/workspace-apu-dialog; initial boundary: 4e01e08.
- Forecast: approximately 500–700 authored changed lines including extraction and focused regression tests; advisory, not a code-golf target.
- Strategy: ask-on-risk; chain strategy unresolved. Ask before a commit if forecast/running authored changes exceeds 400. No remote push, PR, or merge authorized.
- Running authored count: 0 committed; uncommitted authored diff: 917 lines (additions plus deletions, including 269 new shared-editor/dialog lines and 65 task-document lines).
- Mirror: odd/workspace-apu-dialog/tasks in Engram.
- Rollback: revert shared-editor extraction, dialog integration, cache synchronization, and preview styling together with their regression updates; backend unchanged.
- Progress: APU-1 and APU-2 implemented and independently verified; commits remain pending. Shared editor preserves existing secondary dialogs and autosave APIs.
- Next step: resolve the chain strategy with the user before any commit; no remote PR is authorized.

## Observed implementation checks

- RED: the two new workspace dialog/save and draft-close regressions failed before implementation (missing edit button/dialog), while existing preview assertions passed.
- GREEN: `pnpm exec vitest run src/test/features/workspace/components/PestanaApu.test.tsx src/test/features/apu-editor/pages/EditorApuPage.test.tsx src/test/features/apu-editor/hooks/useApuEditor.test.tsx` passed 53/53 tests in 3 files.
- The integrated regression verifies strict backend-shaped header/detail requests, presupuesto-scoped workspace refresh, delayed-save close protection, stable dialog identity across refetch, and exact server-provided cost in the read-only preview.
- Header and asynchronously loaded specification drafts survive canceled close. Failed explicit saves retain drafts; fields are disabled during submission to prevent losing edits typed after submission.
- `pnpm run verify` passed typecheck, lint (9 pre-existing warnings, no new warnings), ADR 9, formatting, 704/704 tests in 98 files, and build. The final repeat passed after disabled-input hardening and outer-dialog focus restoration; nested-dialog correction below occurred afterward.
- Intermediate checks: typecheck caught an unsupported test-query option (corrected); the first integration run found unformatted new task documentation (normalized). Initial route-dialog regressions exposed async presupuesto-key remounting (corrected; route identity only keys on apuId).
- Browser/runtime harness: parent independent Chromium inspection confirmed modal bounds 1104x651 at (16,16) within 1136x683. It found the nested Escape focus defect below; browser correction recheck remains pending. No real-backend mutation or E2E suite run claimed.
- Rollback boundary: remove DialogoEditarApu and EditorApu; restore EditorApuPage composition, PestanaApu link/read-only rendering, header/ET draft integration, hook invalidations, and the associated workspace regressions. No backend/dependency changes or remote operations.
- Work-unit commits: pending; checkboxes intentionally remain unchecked until proof and commit boundaries close.

## Scoped nested-dialog focus correction

- Independent Chromium found Escape from Seleccionar insumo returned keyboard focus to BODY while the parent editor stayed open.
- RED: three focused Escape regressions reproduced missing focus restoration for insumo, plantilla, and desglose dialogs.
- Correction: shared editor records the opening button; optional close-autofocus callbacks restore it after nested content unmounts. Other dialog callers keep their default behavior.
- GREEN: `pnpm exec vitest run` over workspace preview, editor page/hook, and SelectorInsumo/DialogoGuardarPlantilla/PopoverDesglose test files passed 71/71 in 6 files. Typecheck, lint (9 inherited warnings), and format check passed.
- Current source is normalized and frozen. Independent final integration gate passed: 707/707 tests in 98 files, typecheck, lint (9 inherited warnings), ADR 9, formatting, and build. Chromium recheck confirmed exact originating-button focus for all three nested dialogs, preserved outer editor/URL/version/rubro, and zero unmatched API requests or page errors with strict local fixtures. Screenshots: /tmp/apu-preview.png, /tmp/apu-editor-top.png, /tmp/apu-editor-bottom.png. No live-backend mutation or full E2E suite executed.
- Parent spot check: workspace preview tests passed 17/17; git diff --check passed. Commit and PR-chain choice remains pending.
- Correction rollback additionally restores the three nested dialogs' optional focus callbacks and shared editor trigger capture together with focus regressions.
