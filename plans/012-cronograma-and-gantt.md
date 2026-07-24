# 012 — Cronograma: configuración, avance por período, Gantt y desactualización (P-33…P-36, S-33, S-34)

- **Status:** TODO
- **Written against:** repo state after plans 001–011. Spec repo `/home/etverkade/workspace/thesis-docs` at commit `d7508eb`.
- **Depends on:** 011 (activities are auto-imported 1:1 from budget items).
- **Blocks:** 013 (schedule export).
- **Covers:** processes **P-33, P-34, P-35, P-36**; screens **S-33, S-34**; XP stories **US-30…US-33** (iterations I-08, I-09).
- **Thesis milestone:** week 18 — **RNF-02 al 100 %**, the intermodular-integrity variable (`roadmap/01` I-09).

---

## 1. Why this matters

The cronograma is where the thesis's second dependent variable becomes observable. `PROJECT_SPEC.md §variables`: *"integridad_referencial_intermodular — 100 % of budgeted rubros linked to an execution activity (total sync)"*. The mechanism that guarantees it is that **activities are not created by hand**: `POST /presupuestos/{id}/cronograma` auto-imports one `Actividad` per `Rubro`, and new/removed budget items appear/disappear automatically (`design/03` P-34 step 4).

The number that matters is `peso_ponderado` = `precio_total / Total_General × 100` — progress weighted **by monetary value** (`CLAUDE.md`, domain rules). It is computed server-side and arrives in the response.

## 2. Contract — endpoints (`../thesis-docs/plan/architecture/07-api-contract.md §7`)

| Método | Path | Request | Response | Códigos | Errores |
|---|---|---|---|---|---|
| GET | `/presupuestos/{id}/cronograma` | — | `CronogramaResponse` | 200, 404 | `no-encontrado` si aún no se configura |
| POST | `/presupuestos/{id}/cronograma` | `CronogramaCrearRequest` | `CronogramaResponse` | 201, 400, 404, 409 | `validacion` · 409 si ya existe (1:1). **Auto-importa actividades 1:1** |
| PUT | `/cronogramas/{id}` | `CronogramaConfigurarRequest` | `CronogramaResponse` | 200, 400, 404, 409 | **`reduccion-periodos-requiere-confirmacion`** (D-10) |
| PATCH | `/cronogramas/{id}/actividades/{aid}` | `ActividadAvanceRequest` | `CronogramaResponse` | 200, 400, 404 | `validacion` (períodos 1..n; Σ ≈ peso — **el desvío se reporta, no bloquea**) |
| POST | `/cronogramas/{id}/revisado` | — | `CronogramaResponse` | 200, 404 | — (fija `total_general_revisado` + `fecha_revision`) |

`CronogramaResponse` (`07 §11`) — everything the screen needs, already derived:

```jsonc
{ "id": 1, "presupuestoId": 1, "unidadTiempo": "SEMANA", "numeroPeriodos": 12,
  "totalGeneral": "", "totalGeneralRevisado?": "", "fechaRevision?": "",
  "desactualizado": false,
  "actividades": [ { "id": 1, "rubroId": 1, "item": "1.1.1", "descripcion": "",
    "precioTotal": "", "pesoPonderado": "4.2000",
    "avancePorPeriodo": { "1": "2.1000", "2": "2.1000" }, "desviacion": "0.0000" } ],
  "avancePorPeriodo": [ "8.3000", "12.5000" ],
  "avanceAcumulado":  [ "8.3000", "20.8000" ] }
```

`07 §7` is explicit that **P-35 (the Gantt) is a client render of this same response** — there is no separate Gantt endpoint, and the P-36 alert derives from `totalGeneral ≠ totalGeneralRevisado` (the server also gives you `desactualizado` directly; prefer that field).

## 3. Screens

| ID | Pantalla | Tipo | Ruta | Prio | Contenido clave | Procesos |
|---|---|---|---|---|---|---|
| S-33 | Cronograma | Página | `/proyectos/:id/cronograma` | N | Tabla de actividades (auto-importadas 1:1) con peso ponderado; marcar períodos activos; celdas de avance editables (Σ ≈ peso); Gantt (Kibo UI); filas de totales: avance por período + acumulado; **alerta de desactualización** al abrir | P-34–P-36 |
| S-34 | Configurar cronograma | Diálogo | (desde S-33) | N | Unidad de tiempo (semanas/meses) + nº de períodos | P-33 |

Wireframe (`design/01 §5`):

```
Actividad           Rubros   S1  S2  S3  S4  S5  S6   Avance
Obras preliminares    2     ███████░░                  15%
Estructura            5         ░███████████████        62%
[Avance planificado ponderado acumulado: ▁▂▄▆█]
```

## 4. Domain rules

- **P-33.** First visit with no cronograma → the API 404s → open S-34 automatically. The user picks `unidadTiempo` (`SEMANA | MES`) and `numeroPeriodos` (integer > 0). On create, activities are auto-imported 1:1 from the budget items.
- **D-10 — reducing the number of periods when progress is assigned is blocked with explicit confirmation.** `PUT /cronogramas/{id}` returns 409 `reduccion-periodos-requiere-confirmacion` with the progress that would be lost in the body; the client re-sends with `confirmarPerdida: true` after the user confirms in a dialog that **lists** what will be lost. Do not send `confirmarPerdida: true` pre-emptively.
- **P-34 — marking active periods writes a uniform distribution** (`peso / n períodos`) into the cells; the user may then edit each cell. The invariant `Σ celdas ≈ peso_ponderado` is **reported, not enforced**: `Actividad.desviacion` carries the deviation and the row is flagged. Never block the edit.
- **Derived, never editable:** `item`, `descripcion`, `precioTotal`, `pesoPonderado`, the per-period totals and the accumulated row.
- **P-36 — desactualización.** On open, if `desactualizado` is true, show a banner: *"El presupuesto cambió; los pesos ponderados fueron recalculados — revisa la distribución de avances"* with a **"Marcar como revisado"** action (`POST /cronogramas/{id}/revisado`).
- **Open decision (`design/01 §10.3`, `design/02 §5.4`): Gantt read-only vs drag-to-reschedule.** Implement **read-only** — it is the smaller, safer scope, `design/03` P-35 describes visualisation, and v1.1 only requires a *"Gantt simplificado"*. Flag it in your report.

## 5. Files in scope

```
src/features/cronograma/
  pages/CronogramaPage.tsx                       S-33
  components/{DialogoConfigurar,TablaActividades,CeldaAvance,GanttCronograma,
              FilasTotales,BannerDesactualizado,DialogoConfirmarReduccion}.tsx
  hooks/{useCronograma.ts,useAvance.ts}
  schemas.ts
  *.test.tsx
src/test/handlers.ts · src/test/fixtures/cronograma.ts
src/routes/index.tsx                             (edit — replace the placeholder)
```

**Never edit `plans/`** beyond `Status:`/README. **Never write to `../thesis-docs`.**

## 6. Steps

1. **Install the Gantt:**

```bash
npx kibo-ui add gantt          # → src/components/kibo-ui/gantt
# alternativa equivalente: npx shadcn@4 add @kibo-ui/gantt
```

`02-shadcn-components.md §2` picks Kibo UI because it is shadcn-native (same Tailwind/Radix styling, code owned in-repo). **SVAR React Gantt (MIT) is the documented fallback** if Kibo's API does not fit the weighted-progress model. That doc also warns: *"la 'avance planificado ponderado por valor monetario' es lógica de dominio propia — computarla en nuestro código y alimentar los props de Kibo; no esperes que ninguna librería de Gantt haga la ponderación"*. In our case the server already computed it — feed Kibo the `pesoPonderado` and `avancePorPeriodo` values as-is.

**If `npx kibo-ui add gantt` fails or the component cannot express periods-as-columns**, STOP, report, and propose SVAR — do not hand-roll a Gantt.

2. **`useCronograma(presupuestoId)`** — query with a 404 → "not configured" state rather than an error state. Mutations `setQueryData(qk.cronograma(presupuestoId), respuesta)`.

3. **S-34 configure dialog** — `unidadTiempo` select (Semanas / Meses), `numeroPeriodos` integer > 0. Used both for the initial POST and for later PUT reconfiguration. On 409 `reduccion-periodos-requiere-confirmacion`, open `DialogoConfirmarReduccion` listing the progress from the error body; confirming re-sends with `confirmarPerdida: true`.

4. **`TablaActividades`** — the core grid. Fixed left columns (item · descripción · precio total · peso ponderado · desviación) and **N period columns** built from `numeroPeriodos`, horizontally scrollable (`design/01 §8`: grids scroll horizontally on tablet). Each period cell is:
   - a **checkbox-like toggle** for "period active" when empty (marking it triggers the uniform distribution), and
   - an **editable numeric cell** once it has a value.

   Commit on blur/Enter exactly like plan 009's cycle: parse with `parsearEntradaDecimal`, mark `pendiente`, `PATCH /cronogramas/{id}/actividades/{aid}` with the **whole** `avancePorPeriodo` map (that is what `ActividadAvanceRequest` takes), repaint from the response, revert on error.

   Rows whose `desviacion` is non-zero get an amber chip with the deviation value — **a warning, not an error**.

5. **`FilasTotales`** — two pinned footer rows rendering `avancePorPeriodo[]` and `avanceAcumulado[]` from the response. Server values, verbatim.

6. **`GanttCronograma`** — Kibo Gantt fed from the same response: one bar per activity spanning its active periods, labelled with the accumulated weight. Read-only. Place it as a tab or a panel beside the table so both views share one data source.

7. **`BannerDesactualizado`** — renders when `desactualizado === true`; the "Marcar como revisado" button POSTs to `/revisado` and repaints.

8. **Empty/first-run state** — no cronograma yet: an `EstadoVacio` with a "Configurar cronograma" CTA opening S-34. If the budget has **no items**, say so instead (*"Agrega ítems al presupuesto antes de configurar el cronograma"*) with a link to S-27.

9. **Handlers, fixtures, tests, `npm run verify`, commit.**

## 7. Test plan

- `CronogramaPage.test.tsx` — 404 renders the "configurar" empty state, not an error; a configured cronograma renders activities, period columns matching `numeroPeriodos`, and both totals rows with the fixture's exact strings.
- `CeldaAvance.test.tsx` — marking a period writes a uniform distribution via one PATCH carrying the full `avancePorPeriodo` map; editing a cell commits on blur; invalid input performs no request; a failed request reverts the cell.
- `deviation.test.tsx` — an activity with non-zero `desviacion` shows a warning chip and **remains editable** (assert the input is not disabled) — this is the "reporta, no bloquea" rule.
- `DialogoConfigurar.test.tsx` — `numeroPeriodos` 0 and −1 rejected; a 409 `reduccion-periodos-requiere-confirmacion` opens the confirmation listing the losses, and confirming re-sends with `confirmarPerdida: true` (assert the second request body).
- `BannerDesactualizado.test.tsx` — appears only when `desactualizado` is true; "marcar como revisado" POSTs and the banner disappears on the new response (**TC-P36-01** UI half).
- `GanttCronograma.test.tsx` — renders one bar per activity; bars span the active periods of the fixture (**TC-P35-01** component half; the E2E half is plan 015). If Kibo's DOM is hard to assert on, assert on the props you pass it via a thin adapter — do **not** loosen the test to "it rendered something".

## 8. Done criteria

| Command | Expected |
|---|---|
| `npm run verify` | exit 0 |
| `npm test -- cronograma` | ≥ 16 tests passing |
| `grep -rn "toFixed\|parseFloat" src/features/cronograma \| wc -l` | `0` |
| `grep -rn "pesoPonderado" src/features/cronograma \| grep -c "="` | no assignment/computation — display only |
| `test -d src/components/kibo-ui/gantt` (or the fallback documented) | exit 0 |
| S-33 route no longer renders `Placeholder` | exit 0 |

## 9. Boundaries

- **Do not** compute `pesoPonderado`, the per-period totals, the accumulated row, or `desviacion`. All server-side.
- **Do not** let the user create, rename or delete activities. They are auto-imported 1:1 — that *is* RNF-02. A manual activity CRUD would break the thesis's integrity claim.
- **Do not** implement drag-to-reschedule (open decision, read-only chosen).
- **Do not** block an edit because Σ ≠ peso. Report the deviation.
- **Do not** send `confirmarPerdida: true` without an explicit user confirmation.
- **Do not** build the schedule export — plan 013.

## 10. Escape hatches

- If Kibo's Gantt cannot represent **discrete periods** (S1…Sn) rather than calendar dates, that is the documented trigger to fall back to SVAR (`02-shadcn-components.md §2`) — or, simpler and honest for a *"Gantt simplificado"*, render the bars as styled table cells across the existing period columns. Report which you chose and why.
- If `CronogramaResponse.desactualizado` is absent, derive the banner from `totalGeneral !== totalGeneralRevisado` (`07 §7` says the alert derives from those) and report the missing field.
- If activities do not appear after adding a budget item, that is a **server** sync issue (RNF-02) — report it; do not create the activity from the client.

## 11. Maintenance note

The invariant that makes RNF-02 true is "no client ever creates an activity". Any future feature request along the lines of "let me add an activity that isn't a budget item" breaks the thesis's 100 %-linkage claim and must go back to the humans, not into the code.

`ActividadAvanceRequest` takes the **whole** period map, not a delta. A future optimisation that sends only the changed period will silently clear the others.
