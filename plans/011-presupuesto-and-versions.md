# 011 — Presupuesto: árbol de capítulos, ítems, totales, resumen y versiones (P-28…P-32, S-27…S-32)

- **Status:** TODO
- **Written against:** repo state after plans 001–010. Spec repo `/home/etverkade/workspace/thesis-docs` at commit `d7508eb`.
- **Depends on:** 002, 004, 006 (version selector), 009/010 (APUs exist to reference).
- **Blocks:** 012 (activities are auto-imported 1:1 from budget items), 013 (export validations read from here).
- **Covers:** processes **P-28…P-32**; screens **S-27…S-32**; XP stories **US-24…US-28** (iterations I-07, I-08).
- **Thesis milestone:** week 14 — *"el árbol IESS (33 capítulos / 298 rubros) reconstruido"* (`roadmap/01` I-07).

---

## 1. Why this matters

The presupuesto is where the APUs become an offer: a hierarchy of *capítulos* (unlimited depth) holding *rubros* (an APU + a quantity of work), with recursive totals and a Total General. It is also where two of the thesis's integrity signals surface: items with `PU = 0`, `cantidad = 0`, or **no linked schedule activity** — the last one being the visible face of RNF-02's *"100 % de los rubros presupuestados vinculados a una actividad"*.

## 2. The aggregate rule (this shapes the whole module)

`../thesis-docs/plan/architecture/07-api-contract.md §1`:

> **Agregados:** capítulos y rubros **solo** se mutan anidados bajo `/presupuestos/{id}` (root del agregado — re-valida invariantes y re-rueda totales write-through); no existe `/capitulos` ni `/rubros` planos.

and §6:

> Las mutaciones del agregado devuelven el `PresupuestoResponse` completo recalculado — **una sola cache key de TanStack Query en el cliente**.

So: every capítulo/rubro mutation returns the **entire recalculated tree**, and you write it into `qk.presupuesto(presupuestoId)` with `setQueryData`. Do **not** create `["capitulo", id]` keys, do not patch the tree locally, do not maintain a parallel client-side tree state. One key, whole-tree replacement.

This is also what makes totals "live" without any client arithmetic (ADR 9 again): `Capitulo.total` and the Total General are **write-through persisted** server-side (§17, `caching-strategy`), so they arrive already correct.

## 3. Contract — endpoints (`07 §6`)

| Método | Path | Request | Response | Códigos | Errores |
|---|---|---|---|---|---|
| GET | `/proyectos/{id}/presupuestos` | — | `PresupuestoVersionResponse[]` | 200, 404 | — |
| POST | `/proyectos/{id}/presupuestos` | `PresupuestoVersionCrearRequest` | `PresupuestoVersionResponse` | 201, 400, 404 | `validacion`. Deep copy de la versión origen |
| POST | `/presupuestos/{id}/vigente` | — | `PresupuestoVersionResponse` | 200, 404 | — (única vigente por proyecto) |
| DELETE | `/presupuestos/{id}` | — | — | 204, 404, 409 | `version-vigente-protegida` |
| GET | `/presupuestos/{id}` | — | `PresupuestoResponse` | 200, 404 | — (**árbol completo**, read model único) |
| GET | `/presupuestos/{id}/resumen` | — | `ResumenComponentesResponse` | 200, 404 | — |
| GET | `/presupuestos/{id}/comparar?con={id2}` | — | `ComparacionVersionesResponse` | 200, 400, 404 | `validacion` |
| GET | `/presupuestos/{id}/validacion` | — | `ValidacionPresupuestoResponse` | 200, 404 | — (**base del bloqueo de export**) |
| POST | `/presupuestos/{id}/capitulos` | `CapituloCrearRequest` | `PresupuestoResponse` | 201, 400, 404 | `validacion`. `item` autogenerado |
| PUT | `/presupuestos/{id}/capitulos/{cid}` | `CapituloEditarRequest` | `PresupuestoResponse` | 200, 400, 404 | `validacion` |
| PATCH | `/presupuestos/{id}/capitulos/{cid}/mover` | `CapituloMoverRequest` | `PresupuestoResponse` | 200, 400, 404 | `validacion` (sin ciclos). Renumera la rama |
| DELETE | `/presupuestos/{id}/capitulos/{cid}` | — | `PresupuestoResponse` | 200, 404 | — (elimina subárbol e ítems; **los APUs persisten**) |
| POST | `/presupuestos/{id}/capitulos/{cid}/rubros` | `RubroCrearRequest` | `PresupuestoResponse` | 201, 400, 404, 409 | `validacion` (cantidad > 0) · `apu-referenciado` (vínculo 1:1, D-09) |
| PATCH | `/presupuestos/{id}/capitulos/{cid}/rubros/{rid}` | `RubroPatchRequest` | `PresupuestoResponse` | 200, 400, 404 | `validacion` |
| DELETE | `/presupuestos/{id}/capitulos/{cid}/rubros/{rid}` | — | `PresupuestoResponse` | 200, 404 | — (**cascadea su actividad**, RNF-02) |

Response shapes (`07 §11`): `CapituloResponse` is recursive (`subcapitulos: CapituloResponse[]` + `rubros: RubroResponse[]`); `RubroResponse` carries `alertas: string[]` (e.g. `"PU_CERO"`).

## 4. Screens (`design/02-pantallas-flujos.md §3`)

| ID | Pantalla | Tipo | Ruta | Prio | Contenido clave | Procesos |
|---|---|---|---|---|---|---|
| S-27 | Presupuesto | Página | `/proyectos/:id/presupuesto` | N | Árbol capítulos→ítems (sin tope, expandible); totales por capítulo + Total General en vivo; warnings por ítem: ⚠ sin actividad, PU = 0, cantidad = 0 | P-28–P-30, P-32 |
| S-28 | Capítulo | Diálogo | (desde S-27) | N | Crear/editar/mover capítulo o subcapítulo; renumeración automática de `item` | P-28 |
| S-29 | Agregar ítem | Diálogo | (desde S-27) | N | Selector de rubro APU (**excluye auxiliares**) + cantidad de obra; hereda descripción/unidad/PU | P-29 |
| S-30 | Resumen por componente | Vista | (tab en S-27) | S | Cards + chart: % materiales/MO/equipo/transporte del total | P-30 |
| S-31 | Versiones de presupuesto | Página | `/proyectos/:id/versiones` | S | Lista de versiones (nº, notas, fecha, total, vigente); comparación de totales; crear, marcar vigente | P-31 |
| S-32 | Nueva versión | Diálogo | (desde S-31) | S | Versión origen + notas; ejecuta el deep copy | P-31 |

## 5. Domain rules

- **Unlimited hierarchy depth** (05-07-2026 coherence review): v1.1 §2.6 said "one extra level", but real approved SERCOP budgets use depth 3–4, so the schema does not restrict depth. **The UI must not assume a maximum depth either** — render recursively.
- **`item` numbering (`1`, `1.1`, `5.1.1`) is server-generated** and renumbered on move/reorder. Never compute it client-side.
- **D-09 — APU↔ítem is 1:1 per version.** S-29's picker must exclude both auxiliaries and APUs already linked. If the server still returns 409 `apu-referenciado`, surface it on the field.
- **Deleting a capítulo deletes its subtree and its ítems, but the APUs survive** (they remain in S-20). Say exactly that in the confirmation — users fear losing their work.
- **Deleting a rubro cascades its schedule activity** (RNF-02). Mention it in the confirmation.
- **P-32 alerts:** `PU = 0` (incomplete APU), `cantidad = 0`, and `⚠ sin actividad`. The first two come from `RubroResponse.alertas`; the third is derived from `GET /presupuestos/{id}/validacion` → `itemsSinActividad[]`. Render all three as row-level chips, and put a summary banner at the top of S-27. `design/01 §8`: **colour is never the only signal** — every chip carries an icon and text.
- **Versions (P-31, DM §3):** a project has 1..n versions, exactly one `vigente`. Creating one deep-copies capítulos, rubros, APUs and the cronograma (insumos are shared at project level). The **vigente cannot be deleted** (409 `version-vigente-protegida`). After creating a version, switch the shell's version selector to it (`cambiar()` from plan 006's `useVersionActiva`) — that is flow F-06.

## 6. Files in scope

```
src/features/presupuesto/
  pages/{PresupuestoPage,VersionesPage}.tsx        S-27 (+ tab S-30), S-31
  components/{ArbolPresupuesto,FilaCapitulo,FilaRubro,DialogoCapitulo,DialogoAgregarItem,
              DialogoMoverCapitulo,ResumenComponentes,BannerIntegridad,ChipAlerta,
              DialogoNuevaVersion,ComparadorVersiones}.tsx
  hooks/{usePresupuesto.ts,useCapitulos.ts,useRubros.ts,useValidacion.ts,useVersiones.ts}
  schemas.ts
  *.test.tsx
src/test/handlers.ts · src/test/fixtures/presupuesto.ts
src/routes/index.tsx                                (edit — replace placeholders)
```

**Out of scope:** cronograma (012), export (013). S-27 may show the "sin actividad" alert (it comes from the validation endpoint) but must not build any schedule UI. **Never edit `plans/`** beyond `Status:`/README. **Never write to `../thesis-docs`.**

## 7. Steps

1. **Install:** `npx shadcn@4 add chart accordion collapsible` (chart backs S-30; the tree uses TanStack Table's `getExpandedRowModel` per `02-shadcn-components.md §1` Presupuesto row).
2. **`usePresupuesto(presupuestoId)`** — the single query. Every mutation hook in this module does `setQueryData(qk.presupuesto(id), respuesta)` on success, plus invalidates `qk.presupuestoValidacion(id)`, `qk.presupuestoResumen(id)` and `qk.cronograma(id)`.
3. **`ArbolPresupuesto`** — TanStack Table with expandable sub-rows, flattening `CapituloResponse` recursively into rows tagged `tipo: "capitulo" | "rubro"` with a `nivel` for indentation. Columns: item · descripción · unidad · cantidad · P. unitario · P. total · alertas · acciones. Capítulo rows show only descripción and `total`. All numeric cells use `className="num"`.
   - Expansion state is **client UI state** (component state), not server state. Persist it in `sessionStorage` keyed by presupuestoId so a mutation round-trip does not collapse the user's tree — that is a real annoyance on a 33-capítulo budget.
4. **S-28** — capítulo dialog: descripción + parent selector + orden. Create/edit/move. Moving uses `PATCH …/mover`; the server renumbers, and the client just repaints the returned tree.
5. **S-29** — add-item dialog: APU picker (`GET /presupuestos/{id}/apus`, filtered to non-auxiliary, non-linked) + cantidad de obra (decimal > 0, RNF-09, fractions allowed). Show the inherited descripción / unidad / PU as read-only preview from `ApuResumenResponse`. Warn (non-blocking) if the chosen APU's CT is zero.
6. **S-30** — a tab in S-27 rendering `ResumenComponentesResponse`: cards for EQUIPO / MANO_OBRA / MATERIAL / TRANSPORTE plus a chart. **Before writing any chart code, read the `dataviz` skill** if it is available in your environment; otherwise use shadcn's `Chart` with the semantic tokens from plan 004 and keep it to a simple donut or stacked bar. The percentages come from the response — do **not** compute shares client-side; if the endpoint returns absolute amounts only, compute the *visual* proportion for the chart geometry but display the server's amounts as the labels, and note it in your report.
7. **`BannerIntegridad`** — reads `useValidacion(presupuestoId)` and renders a summary: *"3 ítems con PU = 0 · 1 sin actividad"*, expandable to the lists, each entry linking to where it is fixed (an APU → `/apus/:apuId`; sin actividad → `/cronograma`). This is flow F-09's on-ramp and it is what plan 013 blocks the export on.
8. **S-31 / S-32** — versions page: table (nº · fecha · notas · Total General · vigente chip), actions crear / marcar vigente / eliminar (blocked for vigente with a clear message) / comparar. `ComparadorVersiones` renders `ComparacionVersionesResponse` side by side (Total General + per root capítulo). After creating a version, call `cambiar(nuevaId)` so the shell follows it (F-06).
9. **Handlers, fixtures (build a 3-level tree so depth is genuinely exercised), tests, `npm run verify`, commit.**

## 8. Test plan

- `ArbolPresupuesto.test.tsx` — renders a **3-level** fixture with correct indentation; expand/collapse works; capítulo totals and Total General render the server's strings verbatim; expansion survives a mutation round-trip.
- `usePresupuesto.test.ts` — a capítulo mutation writes the returned tree into `qk.presupuesto(id)` with **one** `setQueryData` (assert the cache equals the response); validation/resumen/cronograma keys are invalidated; **assert no `["capitulo", …]` key is ever created**.
- `DialogoAgregarItem.test.tsx` — auxiliaries are absent from the picker; already-linked APUs are absent; cantidad `0` rejected, `0.10` accepted; a 409 `apu-referenciado` surfaces on the field (**TC-P29-02** UI half).
- `DialogoCapitulo.test.tsx` — create as root and as child; move repaints from the response; **no client-side `item` renumbering** (assert the rendered items come from the fixture, e.g. move a node and confirm the UI shows the server's numbering even if it is "wrong" in the mock).
- `BannerIntegridad.test.tsx` — renders counts for `itemsPuCero`, `itemsCantidadCero`, `itemsSinActividad`; each entry links to the right route; **TC-P32-01** UI half.
- `VersionesPage.test.tsx` — vigente chip; deleting the vigente shows the `version-vigente-protegida` message; creating a version calls the shell's `cambiar`; comparison renders both totals.
- `ResumenComponentes.test.tsx` — the four component cards render the server's amounts; chart present; no percentage arithmetic on displayed labels.

## 9. Done criteria

| Command | Expected |
|---|---|
| `npm run verify` | exit 0 |
| `npm test -- presupuesto` | ≥ 24 tests passing |
| `grep -rn "qk.presupuesto(" src/features/presupuesto \| wc -l` | ≥ 1, and **no** other budget-tree key exists |
| `grep -rn "toFixed\|parseFloat" src/features/presupuesto \| wc -l` | `0` |
| a test uses a fixture with hierarchy depth ≥ 3 | exit 0 |
| S-27 and S-31 routes no longer render `Placeholder` | exit 0 |

## 10. Boundaries

- **Do not** compute capítulo totals, the Total General, or `item` numbering. All server-side and write-through persisted.
- **Do not** create flat `/capitulos` or `/rubros` calls — the aggregate root is `/presupuestos/{id}`.
- **Do not** create per-node query keys or maintain a client-side mirror of the tree.
- **Do not** assume a maximum hierarchy depth anywhere (no `nivel > 3` special cases).
- **Do not** show auxiliaries in the item picker.
- **Do not** build any cronograma UI — plan 012. The "sin actividad" alert is a *read* of the validation endpoint, nothing more.
- **Do not** block the export here — plan 013 owns that; this plan only surfaces the alerts.

## 11. Escape hatches

- If the tree is large enough (298 rubros, IESS) that rendering is visibly slow, add virtualisation **inside `ArbolPresupuesto`** without changing its props, and report the threshold you hit. Do not paginate the tree — the read model is the whole tree by design.
- If `ResumenComponentesResponse` turns out to contain absolute amounts but no percentages, follow Step 6's rule and report it.
- If a mutation returns something narrower than the full `PresupuestoResponse`, **STOP and report** — that contradicts `07 §6` and would force client-side tree patching, which is exactly what the design avoids.

## 12. Maintenance note

The single-key discipline is load-bearing and easy to erode. The moment someone adds a `["capitulo", id]` key "to avoid a re-render", write-through totals start going stale in the UI on some paths and not others — the hardest class of bug to diagnose in this app, because it looks like a calculation error in a system whose thesis claim is calculation accuracy.

Expansion state deliberately lives outside the query cache. If a future change moves it in, every mutation will collapse the tree.
