# Compact workspace details

## Objective
Make workspace tables and all tab content more compact without hiding data.

## Scope and constraints
CSS/layout only in PestanaApu, PestanaInsumos, PestanaEspecificacionTecnica and WorkspacePage.
Preserve pre-existing uncommitted APU dialog changes; no API, monetary calculation or shared editor changes.
UI stays Spanish. RDD is off globally.
TDD: project policy limits RED/GREEN to critical behavior; this visual-only task needs no new unit tests.
Runner: pnpm run test (Vitest).
Delivery: ask-on-risk; forecast about 100 authored changed lines; no remote operations.

## Tasks
- [ ] T1 Compact intrinsic-width tables and workspace tab headers/content.
  Route: delegated direct; four-file mapping and multiple non-trivial layout files.
  Acceptance: all values retained, compact padding, no forced wide minimum; all tabs checked at 1136x683.
  Checks: typecheck, lint, changed-file Prettier check, existing focused workspace tests, browser overflow measurements.
  Rollback: only compact-layout hunks and this document, preserving pre-existing dialog work.

- [ ] T2 Compact the existing editable APU dialog and constrain desktop width.
  Route: delegated direct; shared editor layout needs analysis.
  Acceptance: preserve editable cells and save behavior; center bounded desktop content, compact spacing.
  Checks: typecheck, lint, focused editor/dialog tests, browser layout.

## Evidence and progress
Exploration completed: APU has 680px minimum; Insumos 520px minimum; only APU has an identity header.
Base branch: feat/workspace-apu-dialog. Working tree already contains unrelated dialog changes.
Commit: pending; stage only this task's hunks, never pre-existing changes.
T1 implementation: four layout files updated. Typecheck and Prettier passed; lint passed with 9 existing warnings; workspace tests 27/27. Browser APU tables 473px with no horizontal overflow; header 35px versus 76px. Other tab browser checks pending because feedback mode intercepted navigation. Risk assessment unavailable due existing untracked files; independent verification required.
Next: independent T1 verification and T2 dialog layout.


## Final verification
- T1 implementation and focused checks complete; independent workspace tests 27/27 and Prettier passed. APU browser header 35px, tables473px with no overflow at1136x683. Insumos/spec browser navigation blocked by feedback mode.
- T2 implementation complete: centered960px maximum modal, opt-in compact editor; independent final-byte typecheck, Prettier and43/43 focused editor/workspace/cell tests passed. Writer lint passed with9 existing warnings. Browser at1494px: modal960px, tables922px no overflow; final card-height CSS visually pending after user navigated away.
- No API or save logic changes. Existing advance-decimal error was out of scope and unchanged. Full verify/E2E not run for this visual-only task.
- Both work-unit commits pending: dialog components were already untracked and APU tab had prior uncommitted implementation. Committing whole files would include unrelated work; retained all changes unstaged rather than claiming isolated commits.
- Task checkboxes remain open until remaining visual checks and safe commit boundary are resolved.
- Isolated deltas captured outside repo in /tmp/workspace-compact-baseline/task-only.patch and /tmp/workspace-compact-dialog-baseline/task-only.patch.
