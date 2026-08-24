# Frontend implementation plans — `thesis-front-react`

Self-contained implementation plans for the **Sistema APU** frontend: the React SPA of the cloud-native platform that automates SERCOP *propuestas técnico-económicas* (APU · presupuesto · cronograma) for Ecuadorian public-works bidding.

- **Spec repository (read-only reference):** `/home/etverkade/workspace/thesis-docs` at commit **`d7508eb`**
- **This repository at plan time:** empty (no `package.json`, no git history) — plan 001 creates both
- **Plans written:** 2026-07-23
- **Selection:** the human asked for *"the whole frontend"*, so the set covers **all 44 processes (P-01…P-44) and all 44 UI units (S-01…S-44)**, not a top-N subset

Each plan is written for an executor with **zero context from the session that produced it**. Read the plan you are executing in full; it inlines everything it needs.

---

## Execution order and dependencies

```
001 scaffold + verification baseline
 │
 ├─► 002 API seam (DTOs, client, problem+json, query layer)
 │     │
 │     ├─► 003 test harness (Vitest · RTL · MSW · Playwright)
 │     │
 │     └─► 004 design tokens + es-EC decimal formatting
 │           │
 │           └─► 005 auth ──► 006 shell + routing + global states
 │                             │
 │                             ├─► 007 proyectos ──► 008 insumos
 │                             │                       │
 │                             │                       └─► 009 APU editor (núcleo)
 │                             │                             │
 │                             │                             └─► 010 APU completo
 │                             │                                   │
 │                             │                                   └─► 011 presupuesto
 │                             │                                         │
 │                             │                                         └─► 012 cronograma
 │                             │                                               │
 │                             │                                               └─► 013 export
 │                             │
 │                             └─► 014 admin  (needs 008 + 010 for reuse)
 │
 └────────────────────────────────► 015 E2E + a11y + CI  (needs everything)
```

**Hard ordering rules**

- **001 before everything** — no verification command exists until it lands.
- **003 before any feature plan's verification step** — `npm test` is part of `npm run verify`.
- **009 before 011** — budget items reference APUs.
- **011 before 012** — schedule activities are auto-imported 1:1 from budget items.
- **011 + 012 before 013** — export blocks on their validation state.
- **008 + 010 before 014** — the admin panel reuses their components rather than rebuilding them.

## Status

| # | Plan | Processes | Screens | XP iter. | Status |
|---|---|---|---|---|---|---|
| 001 | [Scaffold and verification baseline](001-scaffold-and-verification-baseline.md) | — | — | I-01 | DONE |
| 002 | [API seam: types, client, query layer](002-api-seam-types-client-and-query-layer.md) | — | — | I-01 | DONE |
| 003 | [Testing harness](003-testing-harness-vitest-rtl-msw-playwright.md) | — | — | I-01 | DONE |
| 004 | [Design system + decimal formatting](004-design-system-tokens-and-decimal-formatting.md) | — | — | I-01 | DONE |
| 005 | [Auth module](005-auth-module.md) | P-01…P-04 | S-01…S-06 | I-01, I-02 | DONE |
| 006 | [Shell, routing, global states](006-app-shell-routing-and-global-states.md) | P-43, P-44 | S-43, S-44 | I-01 | DONE |
| 007 | [Proyectos](007-proyectos-module.md) | P-05…P-12 | S-07…S-13 | I-03, I-06 | DONE |
| 008 | [Insumos](008-insumos-module.md) | P-13…P-18 | S-14…S-19 | I-04 | DONE |
| 009 | [APU editor (núcleo)](009-apu-editor-core.md) | P-19…P-22 | S-20…S-23 | I-05 | DONE |
| 010 | [APU completo](010-apu-completion-ci-descuento-auxiliares-plantillas.md) | P-23…P-27 | S-24…S-26, S-36 | I-06 | DONE |
| 011 | [Presupuesto y versiones](011-presupuesto-and-versions.md) | P-28…P-32 | S-27…S-32 | I-07, I-08 | DONE |
| 012 | [Cronograma y Gantt](012-cronograma-and-gantt.md) | P-33…P-36 | S-33, S-34 | I-08, I-09 | DONE |
| 013 | [Export documentos](013-export-documentos.md) | P-37 | S-35 | I-10 | DONE |
| 014 | [Panel Super-Admin](014-admin-panel.md) | P-38…P-42 | S-37…S-42 | I-11 | DONE |
| 015 | [E2E, a11y y CI](015-e2e-suite-accessibility-and-ci.md) | — | — | I-01 → I-12 | DONE |
| 016 | [Alinear crear/editar proyecto con el backend real](016-align-project-create-edit-with-backend.md) | P-05, P-06 | S-07 | — | DONE (`54d8830`) |
| 017 | [Alinear módulo de insumos con el backend real](017-align-insumos-module-with-backend.md) | P-13…P-16 | S-14…S-18 | 016+018 merged (`cd90a7b`); r2 amplía alcance admin | DONE (`b3b3e2a`) |
| 018 | [Parámetros de proyecto numéricos](018-numeric-project-parameters.md) | P-09 | S-10 | — | DONE (`38faaa3`) |

### Batch de alineación con el backend (2026-08-24)

Planes 016–018 escritos contra los contratos **verificados** del backend Quarkus (`../thesis-back-quarkus`, colección Bruno `api/bruno/TC-06..08` + código fuente), que divergen del Apéndice B transcrito en `src/api/contract.ts`. Ejecutar **en serie** (todos editan `src/test/handlers.ts` y `contract.ts`). Desviación consciente: para insumos y parámetros el backend serializa dinero/porcentajes como **números JSON**, no decimal strings; los planes 017/018 adoptan el formato real y documentan la desviación de la convención "Money travels as decimal strings" (§ decisión 2). Gaps de backend confirmados sin plan: versiones/presupuesto/cronograma/descuento-global/plantillas/admin y `POST /proyectos/{id}/duplicar`.

Executors update the `Status` cell (TODO → IN PROGRESS → DONE) **and** the `Status:` line at the top of their plan file.

**Coverage check:** P-01…P-44 all assigned exactly once · S-01…S-44 all assigned exactly once.

---

## The three decisions that govern the whole frontend

Anyone executing any plan should know these before writing a line.

### 1. No calc engine in the client (ADR 9)

`../thesis-docs/plan/architecture/08-codebase-design.md §8`: *"ninguna fórmula de §16 existe en TypeScript"*. Every cost, subtotal, HM value, CD, CI and CT comes from the server. RNF-04's *"cálculo en tiempo real"* means **no page reload, at cell-commit granularity** — commit a cell → `PATCH` → repaint from the returned DTO, with an optimistic *pendiente* state that shows no guessed number.

The thesis's headline dependent variable is `exactitud_calculo` = **0 % deviation** against certified reference cases. A second implementation of the money math in TypeScript would put that at risk for a cosmetic gain. Plan 015 mechanises the guard as a CI grep for `toFixed`/`parseFloat` outside `src/lib/decimal.ts`.

### 2. Money travels as decimal strings

`../thesis-docs/plan/architecture/07-api-contract.md §1`: *"Dinero/porcentajes como string decimal (`"61.390000"`) para no perder precisión en JS."* Plan 002 brands the type; plan 004 provides display-only formatters. Never parse to `number` and send it back. Percentages travel as **fractions** (`"0.1800"` = 18 %).

### 3. One seam with the backend

`src/api/` is the only place that knows HTTP exists. No `src/features/**` file imports axios or builds a URL. Today the DTOs are hand-transcribed from the API contract's Apéndice B because the Quarkus backend does not exist yet; when it publishes OpenAPI, `openapi-typescript` replaces the transcription and DTO drift becomes a compile error (plan 002 §8 and `src/api/README.md`).

---

## Open decisions the plans had to resolve or route around

These were unresolved in `thesis-docs` when the plans were written. Each plan states its assumption and flags it; **when the humans decide, check the listed plan.**

| Open decision | Source | What the plans do | Plan |
|---|---|---|---|
| Version selector: `?v=` vs nested routes | `design/02 §5.3` (marked *"confirmar al construir el shell"*) | **Closed: `?v=` search param.** TC-P43-02 already assumes it | 006 |
| Herramienta Menor row position (first vs last of block M) | `design/02 §5.4`, `plan/README.md` | Render by the server's `orden` — **no client change needed** when it lands | 009 |
| APU editing model: inline grid vs row-opens-form | `design/01 §10.4` | **Inline**, per `design/03` P-21 and "spreadsheet-familiar"; SUS pilot may revisit | 009 |
| Discount semantics (% vs monto; project + rubro interaction) | `design/02 §5.4` #11 | **Percentage-only**; help text notes both levels exist | 007, 010 |
| Nested auxiliaries | `design/02 §5.4` #12 | Not enforced client-side; surface the server's error | 010 |
| Central-base propagation (live vs snapshot, A9) | agenda entrevista 02 | Assume **snapshot**; UI shows the price's source | 008, 014 |
| Archiving vs deleting a central base (D-12) | `design/03 §J` | Assume **archivar**; UI never says *eliminar* | 014 |
| Gantt: read-only vs drag-to-reschedule | `design/01 §10.3` | **Read-only** — smaller scope, v1.1 only needs *"Gantt simplificado"* | 012 |
| Unidades: closed list vs free text | `design/02 §5.4` #10 | **Open catalogue** (§17 #10 resolved): warn, never block | 008 |
| Sync vs async document generation | `07 §8`, `plan/README.md` | **sync + stream**, isolated in `descarga.ts` so async is a one-file change | 013 |
| Enforced coverage thresholds | `quality/01 §D.5` | **Report only**, no gate | 003, 015 |
| Design fidelity: low-fi vs Figma | `design/01 §10.1` | Low-fi; tokens documented as the thesis deliverable | 004 |
| Dark mode | `design/01 §10.2` | shadcn defaults, no investment | 004 |

## Gaps found in the spec (worth raising with the humans)

1. **`openapi-typescript` has no source.** `08 §8` and `quality/01 §B6` make the generated client the single seam and DTO drift a compile error, but the backend that would publish OpenAPI does not exist yet. Plan 002 bridges with a hand-written transcription of Apéndice B plus a documented migration path. Until the swap happens, FE↔BE drift is caught by **nothing** except the backend's api tests.
2. **Firmantes (P-08 / S-11) has no requirements source.** `design/02 §5.1`: *"`Firmante` existe en el data model pero v1.1 §2 no le asigna ninguna pantalla ni proceso"*. Plan 007 builds the proposal (a tab in S-09) and isolates it.
3. **No CSV template spec.** P-15 / S-16 step ① says "descargar la plantilla del tipo", but no document defines the columns. Plan 008 derives them from `InsumoCrearRequest` and flags it.
4. **No preview endpoint for exports.** `design/03` P-37 step 3 requires a preview; `07 §8` offers only the streaming download. Plan 013 previews PDFs from the downloaded blob and shows a summary card for xlsx, at the cost of a second generation round-trip.
5. **Pinned frontend versions are ~1 month stale** (`02-shadcn-components.md §0.1`, researched June 2026) and could not be verified without network access. Plan 001 installs by major line and writes `plans/RESOLVED-VERSIONS.md` for reconciliation.
6. **No per-rubro discount preview endpoint**, unlike the global discount which has one (`07 §3`). Plan 010 shows before/after values rather than fabricating a preview.

## Considered and rejected

Recorded so they are not re-audited on a later pass.

- **Client-side document generation** (ExcelJS / @react-pdf/renderer). Rejected: ADR 4 / RNF-03 put SERCOP-format authority server-side, and `01-react-libraries.md §5` keeps client libs only as a hypothetical fallback.
- **Client-side calc preview for "snappier" totals.** Rejected: ADR 9. This is the single most likely well-intentioned regression in the codebase.
- **Next.js.** Rejected upstream (`01-react-libraries.md §1`): auth-gated internal app, no SEO need, simpler static deploy on Cloudflare Pages.
- **AG Grid Enterprise / MUI X Pro / SheetJS Pro / commercial Gantts.** Rejected upstream on licensing grounds (the thesis's no-prohibitive-licenses stance).
- **A decimal arithmetic library** (`decimal.js`, `big.js`). Rejected: the client performs no arithmetic, so it would only enable the thing ADR 9 forbids.
- **Per-node query keys for the budget tree.** Rejected: `07 §6` specifies a single cache key so that whole-tree mutation responses repaint write-through totals atomically.
- **Manual activity CRUD in the cronograma.** Rejected: activities are auto-imported 1:1 from budget items — that mechanism *is* RNF-02's 100 % linkage guarantee.
- **Jest / Enzyme / Cypress.** Rejected upstream (`quality/01 §B1, §B2, §B4`).

## Conventions every plan assumes

- **Package manager:** npm. **Verification gate:** `npm run verify` (typecheck · lint · format:check · test · build).
- **UI language:** Spanish (`es-EC`). Domain nouns stay Spanish in code and UI: `insumo`, `rubro`, `apu`, `presupuesto`, `cronograma`, `capitulo`, `rendimiento`.
- **Feature modules** mirror the process groups (`08 §8`): `auth`, `proyectos`, `insumos`, `apu-editor`, `presupuesto`, `cronograma`, `exportar`, `admin`, plus `shell` and `ui`.
- **Server state** lives only in TanStack Query; local UI state lives in components; cross-cutting client state in Zustand.
- **Tests** query by accessible role/label in Spanish, mock at the network layer with MSW, and import the shipped Zod schemas rather than duplicating validation rules.
- **Deep modules are tested through their interface**, never their internals (`08 §9`) — `useApuEditor` is the canonical example.

## Traceability

Plans cite the spec repository's stable identifiers so both repos stay linkable: **P-xx** processes (`plan/design/03-procesos-detalle.md`), **S-xx** screens (`plan/design/02-pantallas-flujos.md`), **TC/GM** test cases (`plan/quality/02-catalogo-pruebas.md`), **CHK** conformity items (`plan/design/04-export-sercop-spec.md`), **US-nn** stories and **I-xx** iterations (`plan/roadmap/01-plan-iteraciones-xp.md`), **D-xx** process decisions (`plan/design/03-procesos-detalle.md §J`), **RNF-xx** non-functional requirements (`res/docs/requirements/v1.1-non-functional-requirements.md`), and **ADR 8–10** (`plan/architecture/01-system-architecture.md §9`).

Per `../thesis-docs/CLAUDE.md`'s standing mission, when a decision recorded here is confirmed or changed by the humans, the canonical home is the spec repo — update it there, then reconcile the affected plan.
