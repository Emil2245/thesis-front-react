# 007 — Proyectos: lista, asistente de creación, resumen, firmantes, parámetros, descuento global (P-05…P-12, S-07…S-13)

> **Superseded por el backend consolidado y el Plan 075 (2026-09-09):** no existen
> endpoints para duplicar proyecto, cargar logo ni aplicar descuento global. Su
> UI, hooks, DTOs, schemas y mocks fueron retirados. El resto de este archivo se
> conserva como diseño histórico y no autoriza reintroducir esas operaciones.

- **Status:** TODO
- **Written against:** repo state after plans 001–006. Spec repo `/home/etverkade/workspace/thesis-docs` at commit `d7508eb`.
- **Depends on:** 002, 003, 004, 005, 006.
- **Blocks:** 008–013 (every module is scoped by a project).
- **Covers:** processes **P-05…P-12**; screens **S-07…S-13**; XP stories **US-08…US-11** (iteration I-03), plus **US-20's global-discount half** (P-12, iteration I-06 — built here because it lives on S-09/S-13).

---

## 1. Why this matters

A *proyecto* is one bidding process. It owns the insumo base, the parameters that feed the calc engine (%HM, %CI, IVA), the signatories that appear on the exported cover page, and 1..n budget versions. Nothing else in the app can be built until a project can be created.

Two of the twelve parameters are load-bearing for the thesis's exactitud variable: `porcentajeHerramientaMenor` and `porcentajeIndirecto`. The latter is **null-means-inherit** at the APU level (§17 #17 / D-05): the project default propagates to every APU without an override, and editing the default silently recalculates them.

## 2. Contract — endpoints (`../thesis-docs/plan/architecture/07-api-contract.md §3`)

| Método | Path | Request | Response | Códigos | Errores |
|---|---|---|---|---|---|
| GET | `/proyectos?q&estado&page…` | — | `Page<ProyectoResponse>` | 200 | — |
| GET | `/proyectos/{id}` | — | `ProyectoDetalleResponse` | 200, 404 | `no-encontrado` (incl. ajeno) |
| POST | `/proyectos` | `ProyectoCrearRequest` | `ProyectoDetalleResponse` | 201, 400 | `validacion` |
| PUT | `/proyectos/{id}` | `ProyectoEditarRequest` | `ProyectoDetalleResponse` | 200, 400, 404 | `validacion` |
| PUT | `/proyectos/{id}/logo` | multipart (imagen) | — | 204, 400, 404 | `validacion` (tipo/tamaño) |
| GET | `/proyectos/{id}/logo` | — | bytes (image/*) | 200, 404 | — |
| POST | `/proyectos/{id}/duplicar` | `ProyectoDuplicarRequest` | `ProyectoDetalleResponse` | 201, 400, 404 | `validacion` (solo versión vigente — D-04) |
| DELETE | `/proyectos/{id}` | — | — | 204, 404 | — |
| GET/POST | `/proyectos/{id}/firmantes` | `FirmanteCrearRequest` | `FirmanteResponse[]` / `FirmanteResponse` | 200/201, 400, 404 | `validacion` (orden único por rol) |
| PUT/DELETE | `/proyectos/{id}/firmantes/{fid}` | `FirmanteCrearRequest` | `FirmanteResponse` | 200/204, 400, 404 | `validacion` |
| GET/PUT | `/proyectos/{id}/parametros` | `ParametrosProyectoActualizarRequest` | `ParametrosProyectoResponse` | 200, 400, 404 | `validacion` (rangos §4.6) |
| GET | `/presupuestos/{id}/descuento-global/preview?porcentaje=` | — | `DescuentoGlobalPreviewResponse` | 200, 400, 404 | `validacion` (0–50 %) |
| POST | `/presupuestos/{id}/descuento-global` | `DescuentoGlobalRequest` | `PresupuestoResponse` | 200, 400, 404 | `validacion` |

**Side effect to surface in the UI:** `PUT /proyectos/{id}/parametros` *"recalcula HM de todos los APUs; %CI propaga a APUs sin override (D-05)"*. Say so on screen before saving.

## 3. Screens (`design/02-pantallas-flujos.md §3`)

| ID | Pantalla | Tipo | Ruta | Prio | Contenido clave | Procesos |
|---|---|---|---|---|---|---|
| S-07 | Lista de proyectos | Página | `/proyectos` | N | Cards/tabla: nombre, código, fecha, estado (borrador/en proceso/finalizado); acciones abrir/duplicar/eliminar (confirmación) | P-05, P-09, P-10 |
| S-08 | Crear proyecto | Asistente | (desde S-07) | N | 3 pasos: ① datos generales ② origen de la base de insumos ③ confirmación; parámetros copiados de `ParametrosSistema` | P-06 |
| S-09 | Resumen del proyecto | Página | `/proyectos/:id` | N | Estado, totales de la versión vigente, alertas de integridad, versiones recientes, accesos rápidos | P-05, P-31, P-32 |
| S-10 | Editar proyecto | Diálogo | (desde S-09) | S | Datos generales + logo + dirección/subdirección institucional | P-07 |
| S-11 | Firmantes | Vista + diálogo | (tab en S-09) | S | Lista CONSOLIDADO/APROBADO con orden; CRUD por diálogo | P-08 |
| S-12 | Parámetros del proyecto | Página | `/proyectos/:id/parametros` | N | Los 12 parámetros, agrupados: cálculo / presentación / codificación | P-11 |
| S-13 | Descuento global | Diálogo | (desde S-09) | S | % 0–50, preview del efecto por APU, confirmación masiva, reversible en 0 % | P-12 |

## 4. Domain rules

- **P-06 (crear proyecto, `design/03` P-06 + flow F-02).** Three steps: ① datos generales ② **origen de la base de insumos** — `CENTRAL` (copiar una base central) | `PROYECTO` (copiar de un proyecto propio) | `VACIA` — ③ confirmación. The 12 parameters arrive **copied from `ParametrosSistema`**; the user tunes them later in S-12. If the system `%CI` is unset, S-09 shows the alert `CI_NO_CONFIGURADO` (v1.1 §3, and `ProyectoDetalleResponse.alertas` carries it) — this is **TC-P06-04**.
- **P-09 / D-04.** Duplicating a project copies **only the vigente version** (+ insumos, parámetros, firmantes). Say that in the dialog. Note `design/02 §5.2`: this feature is *conditional* — v1.1 considers removing it. Build it, keep it isolated, and flag it.
- **P-10.** Destructive confirmation via `ConfirmarDestructivo` (plan 004). Require typing the project name for a project that has budget versions.
- **P-11 / RNF-09 ranges.** %HM 0–20 · %CI 0–100 · IVA 0–30. **Percentages travel as fractions** (`"0.0500"` = 5 %) — see `ParametrosProyectoActualizarRequest` in `07 §11`. The form shows human percentages and converts at the edge; use `parsearEntradaDecimal` (plan 004) and never `toFixed`.
- **P-12 / F-07.** Global discount: enter % → **preview** (`GET …/descuento-global/preview`) showing CD → CD_ajustado per APU and the new Total General → explicit confirmation → apply. Reversible by setting 0 %. It writes `apu.porcentaje_descuento` on **every** APU of the version. `design/02 §5.4` flags the interaction between project-level and rubro-level discount as **open decision #11** — implement percentage-only, per the standing assumption, and put the caveat in the dialog's help text.
- **P-08 firmantes — a documented spec gap.** `design/02 §5.1`: *"`Firmante` existe en el data model (§2) pero v1.1 §2 no le asigna ninguna pantalla ni proceso. Propuesta: tab en el resumen del proyecto (S-11)."* Build the proposal (tab in S-09), keep it in its own component tree, and **flag in your report** that it rests on a proposal, not a requirement.

## 5. The 12 parameters (S-12, `07 §11` `ParametrosProyectoActualizarRequest`)

Group them on screen as `design/02 §3` specifies — cálculo · presentación · codificación:

**Cálculo:** `porcentajeHerramientaMenor` (0–20 %) · `porcentajeIndirecto` (0–100 %, nullable) · `iva` (0–30 %) · `moneda` (`"USD"`).
**Presentación (toggles del APU exportado):** `mostrarSeccionesVacias` · `sufijosSeccionActivos` · `mostrarSubtotalesSeccion` · `mostrarSubtotalesPie` · `mostrarNombreProyectoHeader` · `enumerarApus` · `mensajeFooter` (texto, p.ej. *"Este precio no incluye IVA"*).
**Codificación:** `modoCodigoRubro` (`AUTOGENERADO | MANUAL`).

Each presentation toggle changes an exported document (`design/04-export-sercop-spec.md`); add a one-line tooltip saying what it affects.

## 6. Files in scope

```
src/features/proyectos/
  pages/{ListaProyectosPage,ResumenProyectoPage,ParametrosPage}.tsx
  components/{AsistenteCrearProyecto,DialogoEditarProyecto,TabFirmantes,
              DialogoFirmante,DialogoDuplicar,DialogoDescuentoGlobal,
              TarjetaProyecto,SubidorLogo}.tsx
  hooks/{useProyectos.ts,useProyecto.ts,useParametros.ts,useFirmantes.ts,useDescuentoGlobal.ts}
  schemas.ts
  *.test.tsx
src/test/handlers.ts · src/test/fixtures/proyectos.ts   (edit/create)
src/routes/index.tsx                                    (edit — replace placeholders)
```

**Out of scope:** insumos (008), APU (009/010), presupuesto tree and versions list S-31/S-32 (011), cronograma (012), export (013), admin (014). S-09 links to those but does not implement them. **Never edit `plans/`** beyond `Status:`/README. **Never write to `../thesis-docs`.**

## 7. Steps

1. **Install components:** `npx shadcn@4 add data-table breadcrumb switch radio-group accordion progress` (data-table for S-07's grid; switch/radio for the parameter toggles and the wizard's origin choice).
2. **Schemas** (`schemas.ts`): `proyectoSchema` (nombre required; anio; direccionInstitucional required), `origenInsumosSchema` (discriminated union on `tipo`: `CENTRAL` requires `baseId`, `PROYECTO` requires `proyectoId`, `VACIA` requires neither), `parametrosSchema` with the RNF-09 ranges **as human percentages** plus a transform to fractions, `firmanteSchema` (nombre, cargo, rol, orden), `descuentoSchema` (0–50).
3. **Hooks:** one `useQuery`/`useMutation` per endpoint, keys from `qk` (plan 002). On project mutations invalidate `qk.proyectos()` and `qk.proyecto(id)`. On `PUT /parametros` **also invalidate the APU and presupuesto keys** — the server recalculated them (D-05).
4. **S-07:** TanStack data table (nombre · código · estado chip · fecha · acciones ⋯). Empty state with a "Crear proyecto" CTA — that is **TC-P05-03**. Row actions: abrir · duplicar · eliminar.
5. **S-08 wizard:** 3 steps in a `Dialog`, one RHF form per step, a review step showing everything before POST. On success navigate to `/proyectos/:id`.
6. **S-09:** header (nombre, código, estado chip, acciones editar/duplicar/eliminar/descuento global), a totals card for the vigente version, an **alerts** panel rendering `ProyectoDetalleResponse.alertas` (including `CI_NO_CONFIGURADO`, linking to S-12), recent versions, quick links to each module, and the Firmantes tab (S-11).
7. **S-10:** edit dialog including the logo uploader (`PUT /proyectos/{id}/logo`, multipart). Validate type and size client-side and surface the server's `validacion` error if it disagrees.
8. **S-12:** the parameters form, grouped as §5, with the "esto recalculará los APUs del proyecto" notice above the save button.
9. **S-13:** discount dialog — input → debounce → preview call → a table of `apus[]` with cd / cdAjustado / ci / ct and the `totalGeneralActual` → `totalGeneralNuevo` delta → explicit confirm.
10. **MSW handlers + fixtures**, then tests (§8), then `npm run verify` and commit.

## 8. Test plan

Follow `src/features/auth/*.test.tsx` (plan 005) as the exemplar. Use `renderConProviders`, Spanish accessible queries, real schemas.

- `ListaProyectosPage.test.tsx` — empty state renders the CTA (**TC-P05-03**); rows render; delete asks for confirmation and only then calls the API.
- `AsistenteCrearProyecto.test.tsx` — cannot advance from step ① with an empty nombre; choosing `CENTRAL` requires a base; the POST body matches `ProyectoCrearRequest` exactly (assert the intercepted body).
- `ParametrosPage.test.tsx` — imports `parametrosSchema` from the module. Asserts RNF-09: %HM 21 rejected, 20 accepted, −1 rejected; %CI 101 rejected; IVA 31 rejected. Asserts the **fraction conversion**: entering `5` for %HM sends `"0.0500"`, not `"5"`. This is the highest-value test in the plan.
- `ResumenProyectoPage.test.tsx` — `CI_NO_CONFIGURADO` alert renders and links to `/proyectos/:id/parametros` (**TC-P06-04**).
- `DialogoDescuentoGlobal.test.tsx` — 51 % rejected client-side; preview renders per-APU rows; apply is disabled until preview has loaded; 0 % is accepted (reversal).
- `TabFirmantes.test.tsx` — CRUD; duplicate `orden` within the same `rol` surfaces the server's `validacion` on the orden field.

## 9. Done criteria

| Command | Expected |
|---|---|
| `npm run verify` | exit 0 |
| `npm test -- proyectos` | ≥ 20 tests passing |
| `grep -rn "Placeholder" src/routes/index.tsx` | no longer matches `/proyectos`, `/proyectos/:id`, `/proyectos/:id/parametros` |
| `grep -rn "toFixed\|parseFloat" src/features/proyectos \| wc -l` | `0` |
| `grep -rn "useSearchParams" src/features/proyectos \| wc -l` | `0` |

## 10. Boundaries

- **Do not** compute any total, discount result, or CI value in the client. The preview endpoint exists precisely so the client does not simulate the discount (ADR 9).
- **Do not** build S-31/S-32 (versions list/create) — plan 011. S-09 may *link* to `/proyectos/:id/versiones`.
- **Do not** implement the insumo base copy dialog (S-18) — plan 008 owns it. The wizard's step ② only *chooses* the origin and passes it in `ProyectoCrearRequest.origenInsumos`.
- **Do not** store parameters in a client store. They are server state (TanStack Query).
- **Do not** add a "proyecto desde plantilla" flow beyond `POST /duplicar`.

## 11. Escape hatches

- If `ProyectoDetalleResponse.alertas` arrives with a `tipo` outside the documented set, render it generically by `mensaje` rather than failing.
- If the humans resolve open decision #11 (discount semantics) while you are working, follow their answer and note the deviation. Absent an answer, percentage-only.
- If P-09 (duplicar) is removed from scope by the humans (`design/02 §5.2`), delete `DialogoDuplicar` and its route action — it is deliberately isolated so that removal is one file plus one menu item.

## 12. Maintenance note

`PUT /proyectos/{id}/parametros` has effects far outside this module: it recalculates HM for every APU and propagates %CI to APUs without an override. The query invalidation in Step 3 is what makes the UI show that. If a future change narrows those invalidations for performance, the APU screens will display stale totals — a silent correctness bug, since the thesis's whole premise is that totals stay in sync.
