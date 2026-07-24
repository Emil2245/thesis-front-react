# 010 — APU completo: %CI por rubro, descuento, auxiliares, plantillas, desglose (P-23…P-27, S-24…S-26, S-36)

- **Status:** TODO
- **Written against:** repo state after plans 001–009. Spec repo `/home/etverkade/workspace/thesis-docs` at commit `d7508eb`.
- **Depends on:** 009 (`useApuEditor`, S-22), 007 (project parameters).
- **Covers:** processes **P-23, P-24, P-25, P-26, P-27**; screens **S-24, S-25, S-26, S-36**; XP stories **US-19, US-21, US-22, US-23** and the rubro half of **US-20** (iteration I-06).

---

## 1. Why this matters

Plan 009 shipped a read-only footer. This plan makes the three things that change an APU's *total* without touching a row — %CI, descuento, auxiliar status — editable, and adds the two trust features: templates (reuse) and the calculation breakdown (transparency, `design/01 §1.4`: *"Show how a number was computed so engineers trust the engine over their manual Excel"*).

**ADR 9 still governs.** Nothing here computes. The %CI control sends a PATCH and repaints from the response; the discount dialog shows a **server-computed** preview.

## 2. The four domain rules

### 2.1 %CI — null-means-inherit (P-23, §17 #17, D-05)

`APU.porcentaje_indirecto` is **nullable**. `NULL` means "inherit the project default from `ParametrosProyecto`". `ApuResponse` carries both:

- `porcentajeIndirecto?: Decimal | null` — the override, or null
- `porcentajeIndirectoEfectivo: Decimal` — what is actually applied

So the footer control shows `porcentajeIndirectoEfectivo`, with a visual indicator when `porcentajeIndirecto !== null` (i.e. it differs from the project default), and a **"usar el valor del proyecto"** action that sends `{ porcentajeIndirecto: null }` via `PATCH /apus/{id}`.

Editing the project default (plan 007, S-12) propagates automatically to every APU without an override. Do not replicate that propagation client-side; just invalidate.

Range: **0–100 %** (RNF-09).

### 2.2 Descuento al CD por rubro (P-24)

`POST /apus/{id}/descuento` with `{ porcentaje }`, **0–50 %** (RNF-09), reversible by sending `0`. `CD_ajustado = CD × (1 − %descuento)`. It **does not mutate insumo prices or rows** — say that in the dialog, because it is the user's main worry.

S-24 shows the resulting CD / CD_ajustado / CI / CT. Those come from the response, not from a client calculation. Since there is no per-rubro preview endpoint (unlike the global discount, which has `GET …/descuento-global/preview`), the dialog shows the **current** values before applying and the **new** values after — do not fabricate an intermediate preview.

**Open decision #11** (`design/02 §5.4`, `plan/README.md`): how project-level and rubro-level discounts interact, and % vs monto. Implement **percentage-only** per the standing assumption, and add a line of help text noting the project-level discount also exists. Flag it in your report.

### 2.3 Rubros auxiliares (P-25)

- `es_auxiliar = true` ⇒ **CT = CD_ajustado, CI = 0**. The footer hides the CI block entirely for auxiliaries.
- An auxiliary is available as an **insumo in block O** of other APUs in the same version; the row takes its price = the auxiliary's **CD**, not overridable, and it updates automatically when the auxiliary's CD changes.
- An auxiliary **never appears** in the budget item picker (S-29, plan 011).
- **D-08:** clearing the `es_auxiliar` flag is **blocked** when the rubro has references (a block-O row in another APU) or is already in the budget. The API returns 409 `flag-auxiliar-bloqueado` with the usages in the body — render them the same way plan 008 renders `insumo-en-uso` (reuse that dialog pattern).
- **Open decision #12:** whether an auxiliary may reference another auxiliary is unresolved; the standing assumption is **no nesting**, enforced server-side. The client does not need to enforce it — just surface the `validacion` error if the server rejects.

### 2.4 Plantillas (P-26, P-20, DM §12)

- `POST /apus/{id}/guardar-plantilla` with `{ nombre, descripcionRubro? }` creates a `PERSONAL` template. The system fixes `tipo=PERSONAL`, `usuario_id`, `unidad` from the source APU, and `snapshot_secciones` — **a snapshot without prices**.
- Loading a template (plan 009's S-21) preloads insumos, cantidades and rendimientos; **prices resolve against the project's active insumo source**, not from the template.
- S-36 (`/plantillas`) manages the user's PERSONAL templates: list, preview the snapshot, rename, delete. Deleting does **not** affect APUs already created from it — say so in the confirmation.

## 3. Contract — endpoints (`../thesis-docs/plan/architecture/07-api-contract.md §5`)

| Método | Path | Request | Response | Códigos | Errores |
|---|---|---|---|---|---|
| PATCH | `/apus/{id}` | `ApuPatchRequest` | `ApuResponse` | 200, 400, 404, 409 | `validacion` · `flag-auxiliar-bloqueado`. `porcentajeIndirecto: null` = heredar |
| POST | `/apus/{id}/descuento` | `DescuentoRubroRequest` | `ApuResponse` | 200, 400, 404 | `validacion` (0–50 %) |
| GET | `/apus/{id}/calculo` | — | `ApuCalculoResponse` | 200, 404 | — (fórmulas instanciadas, DM §16) |
| POST | `/apus/{id}/guardar-plantilla` | `PlantillaApuCrearRequest` | `PlantillaApuResponse` | 201, 400, 404 | `validacion` |
| GET | `/plantillas-apu?tipo&q` | — | `PlantillaApuResponse[]` | 200 | — (SISTEMA + PERSONAL propias) |
| GET | `/plantillas-apu/{id}` | — | `PlantillaApuDetalleResponse` | 200, 404 | — (preview del snapshot) |
| PUT | `/plantillas-apu/{id}` | `PlantillaApuEditarRequest` | `PlantillaApuResponse` | 200, 400, 404 | `validacion` (solo PERSONAL propias) |
| DELETE | `/plantillas-apu/{id}` | — | — | 204, 404 | — |

`ApuCalculoResponse` shape (`07 §11`) — this is what S-26 renders:

```jsonc
{ "formulas": [ { "concepto": "HM", "formula": "5% × 8.99", "resultado": "0.45" } ],
  "subtotales": { "M": "", "N": "", "O": "", "P": "" },
  "cd": "", "cdAjustado": "", "ci": "", "ct": "" }
```

Note that **the server sends the formula as an already-instantiated string**. The client renders text. It does not build formula strings.

## 4. Screens

| ID | Pantalla | Tipo | Ruta | Prio | Contenido clave | Procesos |
|---|---|---|---|---|---|---|
| S-24 | Descuento del rubro | Diálogo | (desde S-22) | S | % 0–50 sobre el CD; muestra CD/CD_ajustado/CI/CT resultantes; reversible | P-24 |
| S-25 | Guardar como plantilla | Diálogo | (desde S-22) | S | Nombre + descripción; crea `PlantillaAPU` PERSONAL (snapshot sin precios) | P-26 |
| S-26 | Desglose de cálculo | Popover | (desde S-22) | S | Fórmula y valores de la fila o total seleccionado | P-27 |
| S-36 | Mis plantillas | Página | `/plantillas` | S | Plantillas PERSONAL: listar, renombrar, eliminar; preview del snapshot | P-26 |

## 5. Files in scope

```
src/features/apu-editor/
  components/{ControlPorcentajeCi,DialogoDescuentoRubro,DialogoGuardarPlantilla,
              PopoverDesglose,ToggleAuxiliar}.tsx
  hooks/{useDescuentoRubro.ts,useCalculoApu.ts,usePlantillas.ts}
  components/PieTotales.tsx                     (edit — make %CI editable, hide CI for auxiliares)
  hooks/useApuEditor.ts                         (edit — add editarPorcentajeCi, aplicarDescuento, alternarAuxiliar)
src/features/plantillas/pages/MisPlantillasPage.tsx     S-36
src/test/handlers.ts · src/test/fixtures/apu.ts (extend)
src/routes/index.tsx                            (edit — /plantillas)
```

**Out of scope:** SISTEMA templates admin (S-40/P-40) — plan 014. Global discount S-13 (P-12) — already built in plan 007; this plan only adds the *per-rubro* one. **Never edit `plans/`** beyond `Status:`/README. **Never write to `../thesis-docs`.**

## 6. Steps

1. **Extend `useApuEditor`** with three methods, each following plan 009's commit cycle (pendiente → PATCH/POST → `setQueryData` → invalidate presupuesto + cronograma):

```ts
editarPorcentajeCi(valor: string | null): Promise<void>;   // null = heredar del proyecto
aplicarDescuento(porcentaje: string): Promise<void>;       // "0" = revertir
alternarAuxiliar(esAuxiliar: boolean): Promise<void>;      // 409 flag-auxiliar-bloqueado
```

2. **`ControlPorcentajeCi`** in the footer: displays `porcentajeIndirectoEfectivo` as a human percentage, editable inline, 0–100 validation, with a badge when `porcentajeIndirecto !== null` (*"valor propio del rubro"*) and a link-button *"usar el valor del proyecto (X %)"* that sends null. **Assert in a test that the request body contains the key `porcentajeIndirecto` with value `null`** — a spread that strips nulls silently converts "inherit" into "no change", which is the single easiest bug to introduce here.

3. **`PieTotales`** update: when `apu.esAuxiliar`, hide the CI row entirely and label the total *"Costo total (CT = CD)"*. Show the CD_ajustado line only when `porcentajeDescuento` is non-zero (use `esCero` from plan 004).

4. **`ToggleAuxiliar`** in the header. Turning it **off** may 409 with `flag-auxiliar-bloqueado`; render the usages from the error body in a dialog with the message *"Retira primero estas referencias"*, reusing plan 008's usage-list pattern.

5. **S-24** — discount dialog: input 0–50, current CD/CI/CT shown, apply → response → show the new values and a success toast. A *"Quitar descuento"* button sends `0`. Help text: *"El descuento se aplica al costo directo del rubro. No modifica los precios de tus insumos."*

6. **S-25** — save-as-template dialog: nombre (required) + descripción (optional). On success, a toast linking to `/plantillas`. Help text: *"La plantilla guarda insumos, cantidades y rendimientos, pero no los precios: al usarla, los precios se toman de la base de insumos del proyecto."*

7. **S-26** — breakdown popover. Clicking any computed value (a row cost, a subtotal, CD, CI, CT) opens a popover rendering `ApuCalculoResponse.formulas` filtered to that concept, e.g. `HM = 5 % × 8.99 = 0.45`. Fetch with `qk.apuCalculo(apuId)`. Render the server's strings verbatim.

8. **S-36** — templates page: list PERSONAL templates (`GET /plantillas-apu?tipo=PERSONAL`), preview the snapshot in a dialog (`GET /plantillas-apu/{id}`), rename (`PUT`), delete (`DELETE`, with the "no afecta a los APUs ya creados" note in the confirmation).

9. **Handlers, tests, `npm run verify`, commit.**

## 7. Test plan

- `ControlPorcentajeCi.test.tsx` — shows the effective %; 101 rejected, 100 accepted, 0 accepted (RNF-09); "usar el valor del proyecto" sends a body **containing `porcentajeIndirecto: null`** (assert on the intercepted JSON text, not the parsed object, so a stripped key fails); the badge appears only when an override exists.
- `PieTotales.test.tsx` — for `esAuxiliar: true` the CI row is **absent** from the DOM (not merely hidden) and CT equals CD_ajustado in the fixture; for a non-auxiliary the CI row renders.
- `DialogoDescuentoRubro.test.tsx` — 51 rejected client-side; 50 accepted; applying repaints CT from the response; "quitar descuento" sends `"0"`; the dialog never displays a number the server did not return.
- `ToggleAuxiliar.test.tsx` — a 409 `flag-auxiliar-bloqueado` renders the usage list from the error body.
- `PopoverDesglose.test.tsx` — renders `formulas[]` verbatim; no formula string is constructed in the component (assert by fixture: an intentionally odd server string like `"5% × 8.99"` appears exactly).
- `MisPlantillasPage.test.tsx` — list, rename, delete-with-confirmation; the confirmation mentions that existing APUs are unaffected.
- `DialogoGuardarPlantilla.test.tsx` — nombre required; success toast; the request matches `PlantillaApuCrearRequest`.

## 8. Done criteria

| Command | Expected |
|---|---|
| `npm run verify` | exit 0 |
| `npm test -- apu-editor plantillas` | ≥ 20 new tests passing |
| `grep -rn "toFixed\|parseFloat" src/features/apu-editor src/features/plantillas \| wc -l` | `0` |
| a test asserts the literal string `"porcentajeIndirecto":null` in a request body | exit 0 |
| `/plantillas` route no longer renders `Placeholder` | exit 0 |
| manual: no arithmetic on money anywhere in the diff | reviewer confirms |

## 9. Boundaries

- **Do not** compute CD_ajustado, CI or CT. Every displayed number comes from `ApuResponse` or `ApuCalculoResponse`.
- **Do not** build a client-side preview of the per-rubro discount. There is no preview endpoint for it; showing a guessed number would be a client-side calculation.
- **Do not** construct formula strings for S-26.
- **Do not** enforce the no-nested-auxiliaries rule client-side (open decision #12) — surface the server's error.
- **Do not** build SISTEMA template administration (P-40) — plan 014.
- **Do not** change plan 009's commit cycle or section ordering.

## 10. Escape hatches

- If `ApuCalculoResponse.formulas` comes back empty or without a per-concept key you can filter on, render all formulas in the popover and **report the contract gap** rather than inventing a filter.
- If the humans resolve open decision #11 (discount semantics: % vs monto, project + rubro interaction), follow their answer and note the deviation from this plan.
- If turning the auxiliary flag **on** for an APU already in the budget is not blocked server-side, report it — D-08 covers turning it off, and the reverse case may be a spec gap.

## 11. Maintenance note

The null-means-inherit path (`porcentajeIndirecto: null`) is invisible in most tooling: it looks like an omitted field. Any refactor of request-body construction in this module — especially adopting a generic "clean undefined/null" helper — will break inheritance silently. The literal-string assertion in §8 is the guard; keep it.
