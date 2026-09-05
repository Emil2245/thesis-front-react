# Roadmap V2 — Frontend ↔ Backend parity

**Written:** 2026-09-05 · **revised** the same day after correcting the reference branch
**Frontend HEAD:** `2ebf40d`
**Backend reference:** **`origin/main` @ `f707863`** — the authoritative branch

> ## Correction notice
>
> The first version of this roadmap, and plans **046–052**, were written against
> `test/stuff`. **That was the wrong branch.** The local `main` checkout was 42 commits
> behind `origin/main`, which made `test/stuff` look ~29k LOC ahead when it is not.
>
> Real topology: `origin/main` and `test/stuff` diverged at `3703979 feat(Uuidv7)` —
> **origin/main +9 commits, test/stuff +5**. `test/stuff` is **not merged** into main and
> holds only 3 real feature commits. `test/stuff-2` is a stale earlier worktree (42 behind
> main; its 2 commits are already in `test/stuff`) — **ignore it**.
>
> Everything below is re-verified against `origin/main`.

---

## The ID doctrine on `origin/main` is uniform

**Every id is a UUIDv7 string.** No `Long` anywhere at the REST frontier.

```java
PresupuestoResponse(UUID presupuestoId, Short version, boolean esVigente, String totalGeneral, List<CapituloResponse> capitulos)
CapituloResponse(UUID id, String item, String descripcion, Short orden, String total, …)
RubroResponse(UUID id, …, UUID apuId)
PresupuestoVersionResponse(UUID presupuestoId, Short version, boolean esVigente, UUID origenId, …)
```

Path params agree: `PresupuestoResource`, `PresupuestoVersionResource`, `PresupuestoVigenciaResource`,
`CapituloResource`, `RubroResource`, `ResumenComponentesResource`, `ComparacionResource` all take
`String`.

Monetary fields are `String` (Decimal-as-string) — matches the frontend's branded `Decimal`.

### Consequences for work already committed

| Commit | Verdict against `origin/main` |
|---|---|
| `2ebf40d` — proyecto/insumo/apu/firmante/base/plantilla → `string` | **correct, keep** |
| `e44c608` + `4b15612` — presupuesto/capitulo/rubro typed `number` | **wrong, must become `string`** |

**The four "ID path inconsistencies" behind plan 047 do not exist on `origin/main`.** They were
`test/stuff` artifacts. So is the fifth (`RubroCrearRequest.apuId`) — main declares `UUID apuId`.
**Plan 047 is void.** Drop the `TODO(047)` markers left in `contract.ts`.

Also: `RubroResponse` on main has **no `alertas` field**.

---

## What `origin/main` actually exposes

26 JAX-RS resources. Present and usable:

auth · perfil · proyectos · firmantes · parámetros de proyecto · insumos · bases centrales ·
bases personales · **admin de bases centrales** · APU (`calculo`, `detalles`, `duplicar`,
`especificacion-tecnica`, `porcentaje-indirecto`) · plantillas APU (+ guardar) ·
plantillas de proyecto (+ guardar, + aplicar) · presupuesto completo (versiones, vigencia,
validación, comparación, resumen, capítulos, rubros) · display config ·
`GET /documentos/especificaciones-tecnicas/{presupuestoId}` (DOCX)

### Absent on `origin/main` — exists only in `test/stuff`

| Missing | Impact on the frontend |
|---|---|
| **Cronograma** (entire module; main's HEAD is literally *"planificando cronograma"*) | Frontend has cronograma **enabled** — it is not in `MODULOS_SIN_BACKEND`. **It must be re-degraded.** |
| **Admin usuarios / logs / parámetros-sistema** | Only `AdminBaseCentralResource` exists. Plan 050 shrinks from 4 enable-able pages to **1**. |
| **Descuento global** (zero files on main) | `DialogoDescuentoGlobal` + `useDescuentoGlobal` are wired and would 404. **Degrade.** |
| **XLSX exports** (APU, apus, presupuesto, cronograma) | Only the ET DOCX endpoint exists. Plan 051 shrinks to that one export. |
| **`/apus/{id}/porcentaje-descuento`** | The APU descuento control in plan 052 has no endpoint. **Keep disabled.** |

---

## Revised goals

### P0 — Correct the seam to `origin/main`

| # | Work | Note |
|---|---|---|
| 053 | Re-type presupuesto · capitulo · rubro ids as `string`; drop `RubroResponse.alertas`; remove `TODO(047)` markers | Reverses part of `e44c608`. Same TDD method as 046: fixtures red → types+call sites → green. |
| 054 | Re-degrade **cronograma** and **descuento global** | They are live in the UI against endpoints that do not exist. This is a correctness fix, not a feature. |

### P1 — Make branch drift impossible to ship blind

| # | Work |
|---|---|
| 028 | **Zod validation at the API seam.** Now clearly the highest-leverage item in the repo: two separate wrong-branch analyses produced code that typechecked and passed 207 tests while being wrong about the wire format. Runtime validation is the only thing that would have caught it. |

### P2 — Enable what main really supports

| # | Plan | Status after re-verification |
|---|---|---|
| 048 | Plantillas APU | **valid** — resources exist on main |
| 049 | Plantillas de proyecto | **valid** — Resource + Guardar + Aplicar all on main |
| 050 | Admin | **rewrite** — only bases centrales; usuarios/logs/parámetros have no backend |
| 051 | Export | **rewrite** — ET DOCX only; no XLSX, no PDF |
| 052 | Stale actions | **partly valid** — duplicar APU ✓, guardar plantilla ✓, desglose (`calculo`) ✓; descuento ✗; ver-uso ✗; duplicar proyecto ✗ |

The defects those plans found in frontend hooks (wrong URLs, wrong verbs, `useState(0)` under
string ids, silently-dropped fields) are **real regardless of branch** — that analysis survives.

---

## Verification gate

`tsconfig.json` is `"files": []` with project references, so **`npx tsc --noEmit` checks nothing
and always exits 0.** Use `npm run typecheck` (`tsc -b --noEmit`); full gate is `npm run verify`.

---

## Open questions for the human

1. **Does `test/stuff` get merged, or abandoned?** It holds cronograma, admin usuarios/logs/
   parámetros, descuento global and the XLSX exporters — real work that main lacks. If it lands,
   most of this roadmap reverts to the previous version. **Nothing below P0 should start until
   this is decided.**
2. Plans 038–045 remain superseded; do not execute.
