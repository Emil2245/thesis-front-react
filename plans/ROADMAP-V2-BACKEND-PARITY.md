# Roadmap V2 — Frontend ↔ Backend parity

**Written:** 2026-09-05
**Frontend HEAD:** `e44c608`
**Backend HEAD:** `eb9a1da` on branch `test/stuff` (NOT merged to `main`)

## Situation

The backend on `test/stuff` implements **everything**: presupuesto+versiones, cronograma,
export XLSX/DOCX, admin, plantillas APU y de proyecto, bases personales. 318 tests, 2 red
(GM-19/GM-20, accepted residual), 1 skipped.

The frontend was built against a backend that did not yet exist. It has **fully-written UI for
every module**, but four modules are gated behind a `ModuloNoDisponible` stub and eight
individual actions are `disabled`. Most of those gates are now stale.

**The work is not "build features". It is "connect what exists to what exists".**

---

## The blocker nobody wrote down

The backend migrated to **UUIDv7 public IDs** (Plan 07, `public_id` column). The frontend still
types every ID as `number`.

```java
// backend — ProyectoResponse.java
public record ProyectoResponse(UUID id, ...)   // serialises as a string
```

```typescript
// frontend — src/api/contract.ts:16
export interface ProyectoResponse { id: number; ... }
```

`contract.ts` has **40 numeric ID fields**. Roughly half are wrong.

### Which entities use which ID

| UUIDv7 (`string`) | Long (`number`) |
|---|---|
| proyecto, firmante, insumo | presupuesto, capitulo, rubro |
| base central, base personal | cronograma, actividad |
| apu, apu detalle | usuario (auth + admin), log actividad |
| plantilla-apu, plantilla-proyecto | documento path params |

### Four backend paths contradict their own convention

The same `{proyectoId}` segment is parsed as `String`/UUID in some resources and `Long` in
others. **The frontend only ever holds the UUID**, so these endpoints are unreachable today:

| Path | Parses as | Verdict | Evidence |
|---|---|---|---|
| `/proyectos/{proyectoId}/presupuestos` | `Long` | **bug — must take UUID** | `PresupuestoVersionResource.java:49` |
| `/proyectos/{proyectoId}/logo` | `Long` | **bug — must take UUID** | `ProyectoResource.java:112,127` |
| `/presupuestos/{presupuestoId}/apus` | UUID | **correct as written** | see below |
| `/documentos/especificaciones-tecnicas/{presupuestoId}` | UUID | **correct as written** | see below |

Sibling routes (`/proyectos/{id}/firmantes`, `/insumos`, `/parametros`) all take UUID, so the
first two are unambiguously bugs. **This is a backend fix — the frontend cannot work around it.**

> **Correction.** An earlier reading of this roadmap called rows 3–4 anomalies too. They are
> not. `Presupuesto` **has** a `public_id` column (`Presupuesto.java:20-21`),
> `PresupuestoApuResource` resolves it via `findByPublicIdAndOwnerScope`, and
> `Plan07Uuidv7FronterasTest` carries a passing *"Módulo 3: presupuesto (paths UUIDv7)"*
> section. Those two endpoints obey the UUIDv7 doctrine — **the rest of the presupuesto
> module is the laggard**, with `PresupuestoResponse` still leaking the raw `Long`.
>
> `Capitulo`, `Rubro`, `Cronograma` and `Actividad` have **no `public_id` at all**, so
> finishing that migration needs Flyway work. Plan 047 files it as a deliberate follow-up
> rather than starting it, because the frontend has just aligned to the `Long` shape
> (`e44c608`). **Decide this before P2 export work** — plan 051's ET export is blocked on it.

> Consequence for the commit already on `main` (`e44c608`): presupuesto/versiones is
> shape-correct and un-degraded, but `POST /proyectos/{uuid}/presupuestos` will still fail at
> runtime until the backend accepts a UUID there. The commit is a correct step, not a working
> feature.

---

### A fifth ID inconsistency

`RubroCrearRequest.apuId` is a `Long`, but `/presupuestos/{id}/apus` returns UUIDv7. The
frontend only ever holds the UUID, so **adding a rubro to a chapter cannot work today**. Same
class as the four above; folded into plan 047. The contract field carries a `TODO(047)`
marker, as does `/proyectos/{id}/presupuestos`.

---

## The verification gate was a no-op

`tsconfig.json` is `"files": []` with project references, so **`npx tsc --noEmit`
type-checks nothing and always exits 0.** Commit `e44c608` was checked with it and landed
with 8 type errors (repaired in `4b15612`): `FranjaTotales` and `DialogoDescuentoGlobal`
consuming pre-alignment shapes, descuento-global putting `presupuestoId` in the body instead
of the path, Sidebar still gating presupuesto/versiones, and a placeholder capitulo missing
`orden`.

**Use `npm run typecheck` (`tsc -b --noEmit`). Never `npx tsc --noEmit`.**
The full gate is `npm run verify` — typecheck · lint · format:check · test · build.

Plan `029` still quotes the no-op command; it is DONE and left as historical record.

---

## Goals, in dependency order

### P0 — Unblock

| # | Plan | Repo | Why first |
|---|---|---|---|
| 047 | Fix the 4 ID path inconsistencies | **backend** | Nothing in presupuesto/logo/ET-export works until this lands |
| 046 | UUIDv7 ID typing migration | frontend | Every later plan touches IDs; doing it after means redoing it |

`046` can start immediately — it is independent of `047`, which only decides what
`/proyectos/{id}/presupuestos` accepts.

### P1 — Make mismatches impossible to ship again

| # | Plan | Why now |
|---|---|---|
| 028 | Zod validation at the API seam | The UUID bug survived to production-shaped code because responses are `as T` casts with zero runtime checking. Land this right after 046 and the next drift fails loudly in a test instead of silently in a page. |

### P2 — Turn on what is already built

Each is a vertical slice with a real backend behind it. All four have a complete
`*PageActiva` component sitting unused.

| # | Plan | Backend | ID kind | Notes |
|---|---|---|---|---|
| 048 | Plantillas APU | ready | UUID | `/plantillas-apu` CRUD |
| 049 | Plantillas de proyecto | ready | UUID | `/plantillas-proyecto`, `desde-plantilla` |
| 050 | Admin | partial | mixed | **4 of 6 pages only** — see below |
| 051 | Documentos / export | ready-ish | mixed | **two mismatches, see below** |

**Plan 051 carries real gaps:**
- **All four** export URLs are wrong, not merely mismatched. Backend serves `/documentos/*`.
- Frontend offers **PDF**; backend produces **XLSX and DOCX only**. Recommendation: drop the
  PDF affordance (smaller diff, honest UI). **Do not wire PDF to the XLSX endpoint.**
- **ET export is blocked, not optional.** `/documentos/especificaciones-tecnicas/{id}` takes
  the presupuesto **UUID**, and the frontend only holds the `Long`. It waits on the 047
  follow-up above.

### P3 — Re-enable stale disabled actions

Eight actions carry `MOTIVO_SIN_BACKEND`. Six now have endpoints:

| Action | Endpoint | Verdict |
|---|---|---|
| Duplicar APU | `POST /apus/{id}/duplicar` | **enable** |
| Guardar como plantilla | `POST /apus/{id}/guardar-plantilla` | **enable** |
| Descuento rubro | `PATCH /apus/{id}/porcentaje-descuento` | **enable** |
| Desglose | `GET /apus/{id}/calculo` | **enable** |
| Guardar parámetros sistema | `PUT /admin/parametros-sistema` | **enable** (with 050) |
| Guardar plantilla de proyecto | `POST /proyectos/{id}/guardar-plantilla` | **not disabled — broken.** See below |
| **Ver uso de insumo** | `GET …/insumos/{id}/usos` | **keep disabled** — handler ends in `return List.of();` (`InsumoResource.java:166`). The route exists; the feature does not. |
| **Duplicar proyecto** | — | **keep disabled** — no such endpoint exists |

---

**Admin (050) is the worst case: not one admin hook matches the real API.** Plan 027 wrote
them speculatively and the gate meant nothing ever failed. Un-gating without repair would
trade "no disponible" screens for 404s. Confirmed: `/admin/bases` → `/admin/bases-centrales`
(and it returns a bare `List`, not a `Page` — the page calls `data?.contenido.map`),
`PATCH` → `PUT` on user edit, `/restaurar` → `/reactivar`, `/proyectos/parametros-sistema` →
`/admin/parametros-sistema`.

Three admin hooks have **no backend at all**: `POST /admin/usuarios/invitar` (the invite
dialog is the page's only header action, and it is dead), `DELETE /admin/bases/{id}`
(archive is the only removal mechanism), and `/admin/valores-referencia`.

Two admin pages stay degraded, and the distinction matters:
- `AdminValoresPage` is **unimplemented** — no valores-de-referencia concept exists yet.
- `AdminPlantillasPage` is **unimplementable as written**. SISTEMA templates are read-only
  *by design*, not by omission: `PlantillaApuCrearRequest` hard-fixes `tipo=PERSONAL`, and
  edit/delete on a SISTEMA template return 404 deliberately (`PlantillaApuService:133,153`,
  per RNF-05).

Because only 4 of 6 pages can be enabled, plan 050 splits the coarse `"admin"` availability
key into `"admin-plantillas"` + `"admin-valores"` instead of un-gating the group wholesale.

### The stubs were hiding defects, not just gating finished work

Writing plan 049 against the real source turned up four live bugs that the
`ModuloNoDisponible` gate had made unobservable. Expect more of this in every P2 plan —
**budget for repair, not just for un-gating.**

- `useGuardarPlantillaProyecto` posts to `/plantillas-proyecto` with `proyectoId` in the body.
  The endpoint is `POST /proyectos/{proyectoId}/guardar-plantilla`. It would 404. This action
  is **live in the UI** at `ResumenProyectoPage.tsx:116` — it was never disabled, just wrong.
- `useCrearDesdePlantilla` types the response as `ProyectoDetalleResponse`, but the backend
  returns a `{proyecto, advertencias?}` wrapper — so `navigate(/proyectos/${proyecto.id})`
  lands on `/proyectos/undefined`.
- `PlantillasProyectoPage` opens its dialog on `useState(0)` + `usarId > 0`. Under UUID
  strings that predicate is never true and the dialog never opens.
- `PlantillaApuEditarRequest.descripcion` should be `descripcionRubro` — silently dropped today.
- `aplicarDescuento` posts `/apus/{id}/descuento`; the backend is
  `PATCH /apus/{id}/porcentaje-descuento` with a raw `BigDecimal` body.
- `editarPorcentajeCi` sends `porcentajeIndirecto` inside `ApuPatchRequest`, a field that
  record does not declare — **silently discarded today**. Neither control was ever disabled.

Two of these are covered by tests that **currently pass for the wrong reason**: nothing
asserts the request URL or the navigate destination. Those tests must be driven red before
the fix, or the fix is unverifiable.

The 046 migration exposed three more of the same kind:
- `Topbar.tsx` matched `/proyectos/(\d+)` — never matches a UUID, so the version selector
  silently disappeared.
- `DialogoDescuentoGlobal` called `usePreviewDescuento(null)` hardcoded, and was scoped to
  `proyectoId` although the endpoint is presupuesto-scoped. Re-scoped.

### Known cleanup

`e2e/screenshots.spec.ts` still uses numeric ids in ~26 places across its own inline mocks
(proyecto, firmante, apu, base — each needs a different prefix), so its routes no longer
match. It sits outside `tsconfig.app` and outside the vitest gate, and **plan 021 already
owns that suite** — deliberately not rushed as part of 046.

(The dead `modulo: "presupuesto"`/`"versiones"` Sidebar entries were swept in `4b15612`.)

## Out of scope

- Plans **038–045** were written assuming the backend lacked these features. `test/stuff`
  already implements all of them. **Do not execute them.** Mark them superseded by this roadmap.
- Backend Plan 017 (APU advanced / row reordering) is still TODO upstream and gates nothing here.

## Open question for the human

`test/stuff` is 292 files and +29k LOC ahead of `main` and has never been merged. Does the
frontend dev environment point at `test/stuff`, or does that branch need to land on `main`
first? Every P2/P3 plan assumes those endpoints are actually reachable.
