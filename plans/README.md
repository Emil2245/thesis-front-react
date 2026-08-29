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

### Segunda tanda — auditoría posterior al rediseño de UI (2026-08-24)

**Los nueve planes están integrados en `main`** (reconciliado 2026-08-25). El
rediseño de UI que estaba sin commitear se consolidó primero en `067f116`; a
partir de ahí cada plan fue a su rama, se revisó su diff y se mergeó de uno en
uno. Baseline al cerrar: **197 tests en 43 archivos** y `pnpm run e2e` en verde
(20 passed), frente a los 172/42 del arranque.

| Plan | Título | Prioridad | Esfuerzo | Depende de | Estado |
|---|---|---|---|---|---|
| 019 | [Unificar el origen de la versión activa](019-unificar-origen-de-la-version-activa.md) | P1 | M | — | DONE (`d1a4987`) |
| 020 | [Crash de "Nuevo APU": la lista de plantillas no trae `snapshot`](020-plantillas-lista-sin-snapshot.md) | P1 | S | — | DONE (`8cff993`) |
| 021 | [Reparar la suite de capturas E2E](021-reparar-suite-de-capturas-e2e.md) | P2 | M | 020 | DONE (`4925c52`) |
| 022 | [Buscador, filtro y paginación en la lista de proyectos](022-buscador-y-filtros-en-lista-de-proyectos.md) | P2 | M | — | DONE (`c95cd83`) |
| 023 | [Sustituir `window.confirm` por el diálogo del sistema](023-sustituir-window-confirm.md) | P2 | S | — | DONE (`6f9e706`) |
| 024 | [Extender el encabezado a las 13 páginas restantes](024-extender-el-rediseno-a-las-paginas-restantes.md) | P2 | L | 019, 021 (solapan en archivos) | DONE (`d6ba212`) |
| 025 | [Colores crudos de Tailwind → tokens del tema](025-colores-crudos-a-tokens-del-tema.md) | P3 | S | — | DONE (`346294f`) |
| 026 | [Alinear el módulo APU con el backend real](026-alinear-modulo-apu-con-el-backend-real.md) | P1 | M | — | DONE (`73d4606`) |
| 027 | [Degradar los módulos sin backend](027-degradar-modulos-sin-backend.md) | P1 | M | 019 | DONE (`2862321`) |
| 028 | [Validar las respuestas con Zod en el seam](028-validar-respuestas-con-zod.md) | P1 | M | — | TODO |

### Tercera tanda — cronograma (2026-08-25)

| Plan | Título | Prioridad | Esfuerzo | Depende de | Estado |
|---|---|---|---|---|---|
| 029 | [Habilitar cronograma: alinear endpoints, índices 1-based, activar módulo](029-cronograma-enable-and-align.md) | P1 | M | 012 (impl original), 027 (degradación) | DONE (`90fc789`) |

### Cuarta tanda — v1.3 alignment (2026-08-29)

Plans written to close the gap between the current frontend and the new v1.3
functional requirements added in `thesis-docs` since commit `053ebc1`. Backend
endpoints assumed done per API contract. Written against `7d6223c`.

```
030 remove esAuxiliar / no-links ─── (independent, do first — touches contract.ts)
 │
 ├─► 032 APU row reordering
 ├─► 033 especificaciones tecnicas
 └─► 034 plantilla APU updates

031 display config from API ─────── (independent of 030)

035 project templates ───────────── (independent)

036 parametrizable ranges ───────── (independent)

037 archive central bases ───────── (independent)
```

**Hard ordering**: 030 before 032, 033, 034 (all touch `contract.ts`/`useApuEditor` cleaned by 030).
Plans 031, 035, 036, 037 are independent and can execute in parallel with anything.

| Plan | Title | Priority | Effort | Depends on | Status |
|---|---|---|---|---|---|
| 030 | [Remove esAuxiliar / no-links (N04 §2)](030-remove-es-auxiliar-no-links.md) | P1 | S | — | TODO |
| 031 | [Display config from API](031-display-config-from-api.md) | P2 | S | — | TODO |
| 032 | [APU row reordering (N04 §A3)](032-apu-row-reordering.md) | P2 | S-M | 030 | TODO |
| 033 | [Especificaciones Tecnicas (P-45)](033-especificaciones-tecnicas.md) | P2 | M | 030 | TODO |
| 034 | [PlantillaAPU updates (Plan 04 / UUIDv7)](034-plantilla-apu-updates.md) | P1 | M | 030 | TODO |
| 035 | [Project Templates (P-46)](035-project-templates.md) | P3 | M | — | TODO |
| 036 | [Parametrizable ranges (N04 §A6)](036-parametrizable-ranges.md) | P2 | S | — | TODO |
| 037 | [Archive central bases (N04 §D-12)](037-archive-central-bases.md) | P3 | S | — | TODO |

**Execution recommendation (3 tandas):**
- **Tanda A**: 030 + 031 + 036 + 037 in parallel (4 agents; 030 is the only one touching shared files, 031/036/037 are fully independent)
- **Tanda B**: 032 + 033 + 034 + 035 in parallel (all depend on 030 being done; they touch different files)
- **Verify all**: `pnpm run verify` after each tanda

### Trabajo fuera de plan (2026-08-25)

Surgió al revisar los diffs y las capturas; no tenía plan propio porque se
descubrió durante la integración. Todo mergeado y verificado.

| Cambio | Merge | Por qué |
|---|---|---|
| El selector de estado mostraba un trigger en blanco | `7df50b3` | `SelectItem value=""` hace que Radix considere que hay selección y no pinte el placeholder. Introducido por el plan 022 |
| `ApiError.slug` reventaba con `problem.type` ausente | `7df50b3` | `request.ts` castea sin validar: un `{}` del servidor llegaba al getter. Guarda en el getter, que es por donde pasan todos los llamadores |
| Tema neutro: fuera el azul de marca | `346294f`+ | `--primary`, `--ring` y `--chart-1` compartían el mismo azul; el Gantt usaba seis colores crudos. Ahora rampa monocroma de `bg-foreground`, que invierte sola en oscuro |
| Concordancia en los avisos de módulo no disponible | `d6ba212` | `ModuloNoDisponible` conjuga en singular y cuatro pantallas le pasaban un nombre en plural |
| El rail se minimiza a iconos en vez de esconderse | `6a65c0c` | `<Sidebar>` estaba en el modo `offcanvas` por defecto. Ahora `collapsible="icon"` + `tooltip` en cada entrada |
| **`Tabs` desbordaba en horizontal** | `6a65c0c` | El componente emite `data-orientation` pero sus clases apuntan a `data-horizontal`: `flex-col` no se aplicaba **nunca**. La página de insumos salía a 2239 px en vez de 1280. Afectaba también a `DialogoNuevoApu` y a los filtros de `TablaInsumos`. Verificado en el CSS compilado: `data-orientation` no aparecía ni una vez |

El último es una **divergencia deliberada del registro de shadcn** — `tabs.tsx`
era idéntico al upstream, así que el fallo viene de allí. Está comentado en el
archivo: una futura actualización del componente lo pisaría.

> **Trampa de diagnóstico, documentada porque costó dos rondas**:
> `playwright.config.ts` usa `reuseExistingServer`, así que un `vite` levantado
> de antes sirve el bundle obsoleto y produce mediciones falsas. Si el
> comportamiento viejo persiste tras un cambio, mata el dev server antes de
> concluir nada.

**Orden recomendado si van en serie**: 019 → 020 → 021 → 023 → 022 → 025 → 024.
Los dos primeros son bugs de correctitud y no dependen de nada. 021 necesita 020
(sin él, la captura 06 no puede pasar). 024 va al final porque toca trece
archivos y cualquier otro plan que aterrice antes lo obligaría a rebasar.

### Estado real del backend (verificado 2026-08-24)

Contrastado contra `../thesis-back-quarkus`. **El frontend está por delante del
backend, no por detrás**: el back implementa nueve recursos JAX-RS; el front
tiene pantallas para los 44 procesos del contrato.

```
grep -rn '^@Path(' ../thesis-back-quarkus/src/main/java --include=*.java | sed 's/.*@Path(//' | sort -u
```

| Área | Backend | Notas |
|---|---|---|
| `/auth` (8 endpoints) | ✅ | además `POST /auth/aceptar-invitacion`, que el front no usa |
| `/perfil` (3) | ✅ | |
| `/proyectos` CRUD + `?q&estado&page&size` | ✅ | valida el plan 022 |
| `/proyectos/{id}/firmantes` | ✅ | |
| `/proyectos/{id}/parametros` | ✅ | |
| `/proyectos/{id}/insumos` + `/selector` `/importar` `/copiar` | ✅ | |
| `/bases-centrales` | ✅ | solo el listado; no hay `/{id}/insumos` |
| `/presupuestos/{id}/apus` | ✅ | **sin** `soloAuxiliares`; el front lo envía y se ignora |
| `/apus/{id}` + `/detalles` | ✅ | |
| `/proyectos/{id}/duplicar` · `/logo` · `/insumos/{iid}/uso` | ❌ | casos sueltos → plan 027 |
| `/apus/{id}/duplicar` `/descuento` `/calculo` `/guardar-plantilla` | ❌ | → plan 026 |
| **presupuesto y versiones** (8 endpoints) | ❌ | sin paquete, sin entidad |
| **cronograma** (3) | ❌ | sin paquete |
| **exportar / documentos** | ❌ | sin paquete |
| **plantillas APU** (2) | ❌ | sin paquete |
| **admin** (6 áreas) | ❌ | salvo `parametros-sistema`, que vive en `/proyectos/parametros-sistema` |

**El desbloqueo de mayor apalancamiento es `GET /proyectos/{id}/presupuestos`.**
Sin esa lista no hay `presupuestoId`, y sin `presupuestoId` el módulo APU del
backend —que **sí** está implementado, con su motor de cálculo— es inalcanzable
desde la interfaz. `Apu.presupuestoId` es una columna `Long` que apunta a una
tabla sin entidad ni recurso propietario.

Los dos bugs vivos que registraba esta sección **están cerrados** (2026-08-25):

- El backend serializa `BigDecimal` como **número JSON** (`JacksonConfig` solo
  registra `JsonNullableModule`; no hay `WRITE_BIGDECIMAL_AS_PLAIN`). El módulo
  APU los tipaba como strings `Decimal` y `esCero()` hacía `valor.trim()`.
  **Resuelto por el plan 026**: los DTOs del APU declaran `number` y `esCero`
  lleva guarda de tipo. `cdAjustado` se borró en vez de recalcularse.
- `ListaApusPage` y `EditorApuPage` pasaban el id del **proyecto** a
  `/presupuestos/{id}/apus`. **Resuelto por el plan 019**: ambas toman el
  `presupuestoId` de `useVersionActiva()` y degradan a un estado vacío explícito
  cuando no hay versión seleccionada.

El frontend ya no finge tener backend donde no lo hay: el plan 027 introdujo
`src/lib/disponibilidad.ts` como inventario único, y las pantallas sin servidor
muestran `ModuloNoDisponible` conservando su implementación como
`<Nombre>PageActiva`. El rail lateral las marca con "pronto".

### Ejecución en paralelo

Matriz de solapes calculada desde los bloques "In scope" de cada plan.

| | 019 | 020 | 021 | 022 | 023 | 024 | 025 |
|---|---|---|---|---|---|---|---|
| **019** | — | `handlers.ts` | — | `handlers.ts` | — | 2 archivos | — |
| **020** | | — | dep. | `handlers.ts` | — | — | 1 archivo |
| **021** | | | — | — | — | — | — |
| **022** | | | | — | — | — | — |
| **023** | | | | | — | 1 archivo | — |
| **024** | | | | | | — | 1 archivo |

**Tanda A — 019, 020, 022, 023 en paralelo (4 agentes).**
Lo único compartido es `src/test/handlers.ts`, que tocan 019 (handler de APUs),
020 (handler de plantillas) y 022 (handler de proyectos): son tres regiones
separadas del archivo, así que el merge es mecánico. 023 no comparte nada.
Si prefieres cero conflictos, saca los tres cambios de `handlers.ts` a un commit
previo y quita el paso correspondiente de cada plan.

**Tanda B — 021 y 025 en paralelo (2 agentes), tras la A.**
Ambos dependen de que 020 esté mergeado: 021 porque su paso 4 exige que la
captura `06-apus` pase, y 025 porque toca `DialogoNuevoApu.tsx`, que 020
reescribe. Entre sí no comparten ningún archivo.

**Tanda C — 024 en solitario, al final.**
Choca con 019 (`ListaApusPage.tsx`, `CronogramaPage.tsx`), con 023
(`VersionesPage.tsx`) y con 025 (`ExportPage.tsx`). Además toca trece archivos:
cualquier cosa que aterrice después lo obligaría a rebasar.

**Dónde entran 026 y 027.**
026 (módulo APU) puede ir en la **tanda A** como quinto agente: solo comparte
`DialogoNuevoApu.tsx` con 020 y `ListaApusPage.tsx` con 019, así que o va en
serie con esos dos, o —más simple— entra en la **tanda B**, donde no choca con
nada. 027 depende de 019 y toca `PresupuestoPage.tsx` (que 023 también toca) y
las páginas del módulo admin (que 024 también toca): va en la **tanda C**, junto
a 024 pero **no en paralelo con él** — comparten las seis páginas de admin,
`VersionesPage`, `CronogramaPage` y `ExportPage`.

Recomendación final: **A** = 019, 020, 022, 023 · **B** = 021, 025, 026 ·
**C** = 027 → 024, en ese orden. Nueve planes en tres tandas, máximo cuatro
agentes a la vez.

Prioridad si hay que recortar: 026 y 019 son los dos que hacen que la aplicación
funcione contra el backend real. Todo lo demás es mejora.

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

### De la auditoría del rediseño de UI (2026-08-24)

- **Contadores en el rail lateral** (8 APUs · 34 insumos · 2 versiones junto a
  cada entrada de navegación del proyecto). Aparecían en el lienzo de diseño y
  el usuario los pidió explícitamente, pero: exigen tres queries adicionales en
  **cada** ruta del proyecto (`/insumos`, `/presupuestos/{id}/apus`,
  `/proyectos/{id}/presupuestos`) solo para decoración, y las tres cifras ya son
  visibles en la propia pantalla a la que el enlace lleva. El coste es
  permanente y el valor marginal. Reconsiderar solo si el backend expone los
  contadores dentro de `GET /proyectos/{id}` (un campo, cero peticiones extra).
- **Marca de tipo para `presupuestoId`** (`type PresupuestoId = number & {__brand}`
  al estilo de `Decimal`). Haría imposible por construcción el bug del plan 019 —
  pasar un id de proyecto donde va uno de versión. Rechazado *por ahora*: obliga
  a tocar toda la capa de API y todos los fixtures, y 019 arregla los tres
  sitios afectados hoy. Vuelve a la mesa si el bug reaparece.
- **Migrar los ~98 `space-y-*` restantes.** El plan 024 elimina los de nivel de
  página. Los que quedan viven en diálogos y formularios, y ahí la migración
  correcta no es `flex gap-*` sino `FieldGroup` + `Field`, que cambia la
  accesibilidad de los formularios y merece su propio plan con tests.
- **Consolidar los dos `useVersiones`** (`src/shell/contexto.ts` y
  `src/features/presupuesto/hooks/usePresupuesto.ts`, misma query key, mismo
  endpoint). TanStack los deduplica, así que no hay bug: es solo confusión de
  lectura. No justifica un plan propio; anotado en las notas de mantenimiento
  del 019.

- **Client-side document generation** (ExcelJS / @react-pdf/renderer). Rejected: ADR 4 / RNF-03 put SERCOP-format authority server-side, and `01-react-libraries.md §5` keeps client libs only as a hypothetical fallback.
- **Client-side calc preview for "snappier" totals.** Rejected: ADR 9. This is the single most likely well-intentioned regression in the codebase.
- **Next.js.** Rejected upstream (`01-react-libraries.md §1`): auth-gated internal app, no SEO need, simpler static deploy on Cloudflare Pages.
- **AG Grid Enterprise / MUI X Pro / SheetJS Pro / commercial Gantts.** Rejected upstream on licensing grounds (the thesis's no-prohibitive-licenses stance).
- **A decimal arithmetic library** (`decimal.js`, `big.js`). Rejected: the client performs no arithmetic, so it would only enable the thing ADR 9 forbids.
- **Per-node query keys for the budget tree.** Rejected: `07 §6` specifies a single cache key so that whole-tree mutation responses repaint write-through totals atomically.
- **Manual activity CRUD in the cronograma.** Rejected: activities are auto-imported 1:1 from budget items — that mechanism *is* RNF-02's 100 % linkage guarantee.
- **Jest / Enzyme / Cypress.** Rejected upstream (`quality/01 §B1, §B2, §B4`).

## Direcciones abiertas (no son planes — decisión pendiente de los humanos)

Surgidas de la auditoría del rediseño. Son opciones a sopesar, no defectos con
un arreglo obvio.

1. **Validar las respuestas en el seam de la API.** `src/api/request.ts` es un
   cast puro: `get<T>()` promete `T` y no comprueba nada. Un `GET` con la URL
   equivocada o una deriva del backend no dan error de red ni de tipos: dan una
   pantalla blanca. El bug del plan 020 es exactamente esto (`get<PlantillaApu**Detalle**Response[]>`
   sobre el endpoint de listado, que compila y revienta en runtime), y las
   capturas 05 y 06 lo demuestran empíricamente: cuando el catch-all de
   Playwright devuelve `{}`, las páginas revientan en vez de degradar.
   Zod ya es dependencia del proyecto. Tres opciones, de menor a mayor alcance:
   *(a)* endurecer solo los listados (`contenido ?? []`) — barato, tapa el
   síntoma; *(b)* validar con Zod en `get()` los DTOs de listado — coste medio,
   convierte la deriva en un error legible; *(c)* generar el cliente desde
   OpenAPI, que es lo que el gap #1 de este mismo README ya identifica como la
   solución de fondo y que sigue bloqueado porque el backend no publica el
   esquema. **Recomendación**: (a) ahora como parte del 021 si molesta, y (c)
   en cuanto el backend publique OpenAPI. (b) es trabajo que (c) tiraría.

2. **`--chart-2..5` son todos grises.** La rampa de gráficos del tema solo tiene
   un color con croma (`--chart-1`, el azul de marca); el resto son neutros. En
   cuanto haya una visualización con más de dos series categóricas — el
   cronograma o el desglose por componente son candidatos — no habrá con qué
   distinguirlas y alguien recurrirá a colores crudos, que es justo lo que el
   plan 025 limpia. Definir una rampa categórica de 4–5 tonos en oklch, con
   croma y luminosidad constantes variando el matiz, es trabajo de diseño de
   media hora que evita el problema antes de que aparezca.

   **Actualización 2026-08-25**: ahora es más apremiante. El tema pasó a neutro
   (sin azul de marca), así que `--chart-1` también perdió su croma: la rampa
   entera es gris. `GanttChart` se resolvió con opacidades decrecientes de
   `bg-foreground` — funciona para barras apiladas y tiene la ventaja de
   invertir sola en modo oscuro, pero no distingue categorías. La decisión
   pendiente es si el tema neutro admite una rampa categórica con croma o si
   las visualizaciones se quedan monocromas por diseño.

## Conventions every plan assumes

- **Package manager:** pnpm (hay `pnpm-lock.yaml` y `pnpm-workspace.yaml`). **Verification gate:** `pnpm run verify` (typecheck · lint · format:check · test · build). E2E aparte: `pnpm run e2e`.
- **UI language:** Spanish (`es-EC`). Domain nouns stay Spanish in code and UI: `insumo`, `rubro`, `apu`, `presupuesto`, `cronograma`, `capitulo`, `rendimiento`.
- **Feature modules** mirror the process groups (`08 §8`): `auth`, `proyectos`, `insumos`, `apu-editor`, `presupuesto`, `cronograma`, `exportar`, `admin`, plus `shell` and `ui`.
- **Server state** lives only in TanStack Query; local UI state lives in components; cross-cutting client state in Zustand.
- **Tests** query by accessible role/label in Spanish, mock at the network layer with MSW, and import the shipped Zod schemas rather than duplicating validation rules.
- **Deep modules are tested through their interface**, never their internals (`08 §9`) — `useApuEditor` is the canonical example.

## Traceability

Plans cite the spec repository's stable identifiers so both repos stay linkable: **P-xx** processes (`plan/design/03-procesos-detalle.md`), **S-xx** screens (`plan/design/02-pantallas-flujos.md`), **TC/GM** test cases (`plan/quality/02-catalogo-pruebas.md`), **CHK** conformity items (`plan/design/04-export-sercop-spec.md`), **US-nn** stories and **I-xx** iterations (`plan/roadmap/01-plan-iteraciones-xp.md`), **D-xx** process decisions (`plan/design/03-procesos-detalle.md §J`), **RNF-xx** non-functional requirements (`res/docs/requirements/v1.1-non-functional-requirements.md`), and **ADR 8–10** (`plan/architecture/01-system-architecture.md §9`).

Per `../thesis-docs/CLAUDE.md`'s standing mission, when a decision recorded here is confirmed or changed by the humans, the canonical home is the spec repo — update it there, then reconcile the affected plan.
