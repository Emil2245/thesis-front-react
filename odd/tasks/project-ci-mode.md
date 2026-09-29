# Project CI mode

## Objective

Allow each project to opt into per-APU indirect-cost overrides while keeping a single project CI by default. Provide a dedicated project CI save operation with explicit preserve/reset semantics and transactional recalculation. Adapt frontend only after backend contract, seed handling, and backend tests.

## Decisions and constraints

- Toggle is per project, off for new projects; existing projects with explicit overrides retain their data and can use the individual mode. CMT's 298 seeded overrides remain intact as a useful preserve-override scenario.
- Switching individual mode off clears overrides after explicit confirmation; resetting all overrides means setting them to NULL (inherit), not copying the current project rate.
- Preserve mode changes project CI and recalculates only inheriting APUs; reset mode clears all overrides, recalculates affected APUs, and consolidates each affected budget version exactly once.
- Preserve project parameter authorization, BigDecimal/range checks, transactionality, and backend-derived HTTP DTO shapes. Do not mutate historic Flyway migrations or rewrite seed identities.
- Frontend UI is Spanish. No SDD/OpenSpec. TDD for critical money/data flows: first one focused failing test then minimal behavior. Other UI changes use focused type/lint/manual checks.
- Work routing: backend mapping delegated (4+ files), multi-file implementation delegated to one writer at a time, verification delegated. No parallel writes.
- Delivery strategy: ask-on-risk. Forecast >400 authored diff lines across both repositories, with backend and frontend naturally separated by repo and behavior. No push/PR/merge authorized. Commit policy unresolved against explicit no-commit safety; do not commit absent explicit request.

## Tasks

- [ ] B1 — Add project CI mode persistence and dedicated backend contract for reading override count and saving mode/rate with preserve/reset intent. Backend integrated commit `ba1cb63`; 48/48 focused post-commit tests passed; final closure waits on B3 concurrency issue.
- [ ] B2 — Add forward-only seed/data migration preserving CMT and other existing overrides, default off for new projects; add seed assertions. Integrated into backend commit `ba1cb63`; 298/298 CMT overrides retained, seed test passed.
- [ ] B3 — Prove project-wide transactional recalculation and override gate through focused backend tests for preserve/reset/disable, multi-version, authorization, and rollback. Backend commit `ba1cb63`; full suite 797/800 passed, two pre-existing CMT golden failures, one skip. Post-commit verifier found an unguarded APU detail-mutation race; correction pending.
- [ ] F1 — Adapt project CI settings into a separate card/save/confirmation workflow and gate the APU editor. Frontend commit `ddbd090`; post-commit verifier found fraction/percentage bug on editing an existing override; two-file fix and 703/703 verify passed, corrective commit pending.

## Acceptance

- Project-level opt-in defaults off for new projects; existing overrides are preserved, particularly CMT.
- Backend denies individual override mutation when mode is off and supports it when on; authorized project CI updates have explicit preserve/reset semantics.
- UI displays override count and asks between reset-all and preserve-own when changing project CI with existing overrides; disabling individual mode cannot silently retain active individual values.
- Persisted APU, rubro, chapter, budget and schedule costs agree with the effective percentage after saves, across affected versions; errors roll back the entire update.
- No code/data changes outside both project repositories and their relevant task/graph records.

## Evidence and next step

- Initial frontend and backend working trees were clean on `main`; backend base `8bccf7a`, frontend base `e328117`.
- Backend source mapping and seed override inventory were delegated. Existing CMT overrides are retained per user confirmation.
- B1 implementation: `GET/PUT /proyectos/{id}/ci`, project flag, explicit preserve/reset, override count, guarded individual PATCH; existing `/parametros` rejects changed CI; null CI retained. Focused Quarkus integration suite: 9/9 passing. No commits yet. B1 awaits work-unit commit authorization and B2/B3 full behavior proof. Native ASSESS was unassessable due to untracked files and cannot substitute for independent verification.
- B2 migration verification: CMT 298/298 overrides unchanged before/after V017, existing override projects enabled, new empty project disabled; focused seed/service test CMT 1/1 and CI 4/4 passed. No commit.
- B3: real-DB two-version propagation for inherited and overridden APUs; deterministic later APU calculation failure verifies rollback of project settings and derived costs without per-APU production flush; focused 7/7 passing. Independent pre-rollback backend readback 12/12 passed; full backend suite pending.
- B3 ingress: centralized project-row-locked mode guard now covers manual APU creation, duplicate and version copy as well as PATCH. Focused HTTP suites: 18/18 and 38/38 passed. Full backend suite and final independent verification pending.
- F1: dedicated project CI card/modal and mode-gated APU editing/manual creation; `pnpm run verify` passed (98 files, 702/702 tests, build, 9 lint warnings), transient timeout reproduced green without loosening test. No browser E2E executed. No commit.
- Backend fixture reconciliation fixed six additional contract/test setup failures without relaxing assertions. Final independent `./gradlew test`: 799 total, 796 passed, two existing CMT golden failures (GM_19 −$6.95, GM_20 −$0.84), one skip GM_24; `spotlessCheck` and `git diff --check` passed. Project CI percentage rejects >4 decimals; manual APU creation now locks project before budget.
- Further B3: ordinary/manual/lote APU creation and duplication now share the project lock with CI save; manual and lote take project before budget. An inherited APU created after a CI save uses the new rate in a real-DB test. Final independent `./gradlew test`: 800 total, 797 passed, two existing CMT golden failures (GM_19 −$6.95, GM_20 −$0.84), one skip GM_24; `spotlessCheck` and `git diff --check` passed.
- Resumed F1: `e2e/manual/02-proyectos.spec.ts` checks zero CI PUT before modal choice, then exact RESTABLECER request; Chromium test passed independently, `pnpm run verify` repeated green (98 files, 702/702, build). Refreshed `docs/manual/img/02-proyectos/08-parametros.png` with the CI card; screenshot-only Chromium test passed and image visually inspected at 1280×720. Browser tests use mocks, not a deployed backend.
- Concurrency investigation: existing Quarkus `CyclicBarrier` tests synchronize request starts, not an internal critical interleaving; no current hook permits a deterministic regression without test-only instrumentation. Production project row locks are in place; no deterministic race result is claimed. Existing CMT GM_19/GM_20 failures and GM_24 skip remain separate.
- User authorized local commits in both repositories and chose future independent PRs to main (no push/PR/merge). Backend integrated commit `ba1cb63` contains 1,644 authored diff lines; frontend integrated commit `ddbd090` contains 692. These exceed ~400-line review slices; one honest slicing pass found cohesive backend contract/transaction tests still >400. A maintainer size exception or additional PR decomposition will be needed before publishing; no PR has been created.
- Post-commit assessment was unassessable (`schema-incompatible`), and native inspect reports `rdd_disabled` for both clones, so no review lineage started; independent verifier used. Frontend post-commit verify had 5 transient test failures, then after correction passed 703/703 + build; backend focused 48/48 + Spotless passed. New frontend correction makes stored 0.2 display 20 percentage points and round-trips `0.200000`.
- Backend post-commit verifier raised a plausible severe concurrency race: detail edits recalculate without project-row lock. This needs correction; insumo mutation concurrency is a separate broader risk. No deterministic internal-interleaving test was yet run. Pre-existing CMT goldens stay separate.
- Engram mirror update for resumed evidence is pending: the Pi-native memory provider was unreachable at the latest attempt; local file remains authoritative until resynchronized.
- Next: commit frontend correction, bound backend detail-mutation race fix, verify again, then decide whether to accept PR size exceptions or further decompose. No push/PR/merge authorized.
