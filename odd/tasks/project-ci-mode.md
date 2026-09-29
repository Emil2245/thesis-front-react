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
- Delivery strategy: separate backend/frontend feature branches. User authorized local commits; push/PR/merge remain unauthorized. Both integrated commits exceed 400 authored lines and require review-size resolution before PR.

## Tasks

- [x] B1 — Project mode persistence, GET/PUT CI contract, override count and guarded PATCH. Backend `ba1cb63`; 48/48 post-commit focused tests passed.
- [x] B2 — Forward-only V017 migration and CMT seed assertion. Backend `ba1cb63`; 298/298 CMT overrides retained.
- [x] B3 — Transactional CI recalculation, guarded creation/detail/deletion and insumo-price update serialization. Backend `ba1cb63`, `b1b930d`, `7dd76b7`; PostgreSQL concurrency tests and focused suites passed. Full suite retains two pre-existing CMT golden failures and one skip.
- [x] F1 — Dedicated project CI card/save/confirmation, APU editing gate. Frontend `ddbd090`, `e6c6060`; 703/703 verify + build, Chromium regression and real-backend browser inspection passed.

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
- Frontend correction committed as `e6c6060`; backend detail-lock correction committed as `b1b930d`. Independent 48/48 backend focused tests passed before tightening PostgreSQL PID attribution; writer reran 39/39 after tightening. Both worktrees were clean at that boundary.
- Insumo extension committed as backend `7dd76b7`: sorted affected-project row locks before price mutation, with owning-project lock for project-base insumos; APU deletion takes the same lock. PostgreSQL test observed the specific PUT blocked on the holder PID, then checked APU, rubro, chapter and budget totals. Independent verifier: InsumoResourceIT 11, ApuResourceIT 39, ProyectoCiServiceIT 9, RecalculoServiceIT 7; two of those suites were Gradle cache hits, while the writer ran InsumoResourceIT and ApuResourceIT freshly. Spotless and diff check passed. Separate unresolved race: RubroService.crear does not take project lock before linking an APU that may be concurrently deleted; FK guards integrity but the resulting error may not be the normal domain response. Legacy direct cross-project insumo references were not tested concurrently.
- Real-backend visual inspection on localhost:5173 with backend on :8090: login, seeded project CI card (18%, 10 own overrides), toggle-off confirmation and zero PUT before choice. No destructive confirmation submitted. Screenshot at `/tmp/project-ci-live-confirmation.png`. No browser HTTP errors on initial project settings load. Next: resolve review-size exceptions/decomposition before PR, and track rubro-link race and CMT goldens separately; no push/PR/merge authorized.
