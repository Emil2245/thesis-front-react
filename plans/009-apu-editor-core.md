# 009 — APU editor: the core screen (P-19…P-22, S-20…S-23)

- **Status:** TODO
- **Written against:** repo state after plans 001–008. Spec repo `/home/etverkade/workspace/thesis-docs` at commit `d7508eb`.
- **Depends on:** 002, 003, 004, 006, 007, 008 (S-23 searches the insumo catalogue).
- **Blocks:** 010 (APU completion), 011 (budget items reference APUs).
- **Covers:** processes **P-19, P-20, P-21, P-22**; screens **S-20, S-21, S-22, S-23**; XP stories **US-16, US-17, US-18** (iteration I-05).
- **Thesis milestone this serves:** week 10 — *"reconstruir un APU real del workbook IESS en la UI y obtener su CT exacto"* (`roadmap/01` I-05).

---

## 1. Why this matters, and the one rule that governs everything here

S-22 is *la pantalla núcleo*. It is the screen the SUS usability study is really about, and the screen where the thesis's `exactitud_calculo` variable becomes visible to a user.

**The governing rule — ADR 9 (`../thesis-docs/plan/architecture/08-codebase-design.md §8`):**

> **Sin motor en el cliente (ADR 9):** ninguna fórmula de §16 existe en TypeScript. El grid del editor APU (S-22) hace commit por celda (blur/Enter) → `PATCH` → pinta el `ApuResponse` recalculado, con estado optimista «pendiente» mientras viaja. «Totales en vivo» (RNF-04/TC-P21-04) = sin recargar página, a granularidad de commit de celda.

This resolves what looks like a contradiction in the requirements. RNF-04 demands *"cálculo en tiempo real en la vista del APU (subtotales y totales al modificar cualquier valor)"*, and the low-fi wireframe in `design/01 §5` shows live totals. A naive reading says "compute the totals in JavaScript as the user types." **Do not.** The spec's definition of "en vivo" is *no page reload, at cell-commit granularity*. Every number displayed comes from the server's `ApuResponse`.

If you implement even one formula — `cantidad × precio`, the HM row, a section subtotal — you have created a second source of truth for the money math whose whole point is 0 % deviation against certified reference cases. Reject the temptation, including "just for the optimistic preview": the optimistic state shows the row as **pendiente**, it does not show a guessed number.

## 2. The calc contract you are rendering (read-only knowledge)

You do not implement any of this; you display its outputs. From `CLAUDE.md` and `domain/02-data-model.md §16`:

- An APU has **four sections in fixed order**: `EQUIPO` (M) · `MANO_OBRA` (N) · `MATERIAL` (O) · `TRANSPORTE` (P).
- M/N rows: `costo = cantidad × tarifa × rendimiento`. O/P rows: `costo = cantidad × precio`.
- **Herramienta Menor (HM)** is an automatic row in block M: `%HM × Subtotal_N`. It is **read-only and cannot be deleted** (`design/03` P-21 step 5; the API returns `fila-protegida` if you try).
- `CD` → optional `descuento` → `CD_ajustado` → `CI` → `CT`.
- For **auxiliares**: `CT = CD_ajustado`, `CI = 0`.
- Row price = `COALESCE(override, Insumo.precio_unitario)` — **null-means-inherit** (DM §8).

**Open decision that affects this screen — HM row position:** `design/02 §5.4` and `plan/README.md` list *"primera fila del bloque M (observado IESS) vs. última fila (v1.1 §2.5.2)"* as unresolved, with the **standing assumption: primera fila**. Do not hardcode the position: render rows in the `orden` the server returns, so that when the decision lands only the server changes. Flag this in your report.

**Open decision — editing model:** `design/01 §10.4` lists *"pure inline-grid vs row-opens-a-form"* as untested with users. Implement **inline editing** (it is what `design/03` P-21 step 3 describes and what "spreadsheet-familiar" demands, `design/01 §1.1`), and note that the SUS pilot (I-11) may revisit it.

## 3. Contract — endpoints (`../thesis-docs/plan/architecture/07-api-contract.md §5`)

| Método | Path | Request | Response | Códigos | Errores |
|---|---|---|---|---|---|
| GET | `/presupuestos/{id}/apus?q&soloAuxiliares&page…` | — | `Page<ApuResumenResponse>` | 200, 404 | — |
| POST | `/presupuestos/{id}/apus` | `ApuCrearRequest` | `ApuResponse` | 201, 400, 404 | `validacion` · `codigo-duplicado` (único por versión) |
| GET | `/apus/{id}` | — | `ApuResponse` | 200, 404 | — |
| PATCH | `/apus/{id}` | `ApuPatchRequest` | `ApuResponse` | 200, 400, 404, 409 | `validacion` · `codigo-duplicado` · `flag-auxiliar-bloqueado` |
| DELETE | `/apus/{id}` | — | — | 204, 404, 409 | `apu-referenciado` |
| POST | `/apus/{id}/duplicar` | — | `ApuResponse` | 201, 404 | — |
| POST | `/apus/{id}/detalles` | `ApuDetalleCrearRequest` | `ApuResponse` | 201, 400, 404 | `validacion` (insumo XOR auxiliar) |
| PATCH | `/apus/{id}/detalles/{did}` | `ApuDetallePatchRequest` | `ApuResponse` | 200, 400, 404, 409 | `validacion` · **`fila-protegida`** (fila HM). `precioOverride: null` = restaurar herencia |
| DELETE | `/apus/{id}/detalles/{did}` | — | `ApuResponse` | 200, 404, 409 | `fila-protegida` |
| GET | `/proyectos/{id}/insumos/busqueda?fuente&q&tipo` | — | `InsumoBusquedaResponse[]` | 200, 404 | — (S-23) |

**Note the response shape:** every mutation returns the **whole recalculated `ApuResponse`**. That is the mechanism for "live totals" — one `setQueryData(qk.apu(id), response)` repaints header, all four grids, and the footer at once.

**PATCH semantics (`07 §1`):** omitting a field means "don't touch"; sending `null` means **clear/inherit**. So restoring price inheritance is literally `{ precioOverride: null }`, and it must survive JSON serialisation — never build the body with a spread that drops null keys.

## 4. Screens

| ID | Pantalla | Tipo | Ruta | Prio | Contenido clave | Procesos |
|---|---|---|---|---|---|---|
| S-20 | Lista de APUs | Página | `/proyectos/:id/apus` | N | Tabla: código, descripción, unidad, CD/CT, badge **auxiliar**, filtros; crear/duplicar/eliminar | P-19 |
| S-21 | Nuevo APU | Diálogo | (desde S-20) | N | Desde cero (código auto/manual según `modo_codigo_rubro`) o **desde plantilla** con preview + aviso "valores referenciales" | P-20 |
| S-22 | **Editor de APU** | Página | `/proyectos/:id/apus/:apuId` | N | Encabezado; grids M/N/O/P con edición inline; fila HM automática read-only; indicador heredado-vs-override; pie CD → descuento → CI → CT en vivo | P-21–P-25, P-27 |
| S-23 | Selector de insumo | Diálogo/combobox | (desde S-22) | N | Búsqueda multi-fuente: local · centrales · combinada; en bloque O incluye rubros auxiliares | P-21, P-25 |

## 5. `useApuEditor` — the deep module (this plan's centrepiece)

`08-codebase-design.md §8` names it explicitly:

> **`apu-editor` como módulo profundo del cliente:** un hook `useApuEditor(apuId)` esconde: orden fijo de secciones, fila HM read-only, badge heredado-vs-override, commit optimista y rollback en error. La página y los tests (RTL) usan solo el hook — su interfaz es la superficie de test.

And §9's testing rule: *"no se testea 'por dentro' de un módulo profundo — si un test necesita acceder a una clase interna, la interfaz está mal, no el test."*

So: **the page renders; the hook decides.** Target interface:

```ts
export type EstadoCelda = "estable" | "pendiente" | "error";

export interface FilaEditor {
  detalle: ApuDetalleResponse;
  /** Fila HM: ni editable ni eliminable (DM §9). */
  protegida: boolean;
  /** Precio heredado del insumo (override NULL) vs fijado a mano (P-22). */
  heredado: boolean;
  /** Fila de rubro auxiliar: precio = CD del auxiliar, sin override posible. */
  esAuxiliar: boolean;
  estado: EstadoCelda;
}

export interface SeccionEditor {
  tipo: SeccionTipo;          // EQUIPO | MANO_OBRA | MATERIAL | TRANSPORTE
  etiqueta: string;           // "Equipo", "Mano de obra", …
  bloque: "M" | "N" | "O" | "P";
  subtotal: Decimal;
  filas: FilaEditor[];
  /** Columnas visibles: M/N muestran rendimiento y costo/hora; O/P no. */
  muestraRendimiento: boolean;
}

export interface UseApuEditor {
  apu: ApuResponse | undefined;
  secciones: SeccionEditor[];      // SIEMPRE en el orden fijo M, N, O, P
  cargando: boolean;
  guardando: boolean;              // alguna mutación en vuelo
  error: ApiError | null;

  editarCelda(
    detalleId: number,
    campo: "cantidad" | "rendimiento" | "precioOverride",
    valor: string,
  ): Promise<void>;
  restaurarHerencia(detalleId: number): Promise<void>;   // precioOverride: null
  agregarFila(seccion: SeccionTipo, sel: SeleccionInsumo): Promise<void>;
  eliminarFila(detalleId: number): Promise<void>;
  editarEncabezado(patch: ApuPatchRequest): Promise<void>;
}
```

### 5.1 The commit cycle (implement exactly this)

1. User edits a cell and blurs / presses **Enter**.
2. Parse the input with `parsearEntradaDecimal` (plan 004). Invalid → mark the cell `error` with an inline message; **no request**.
3. Validate against the RNF-09 range for that field (see §6). Out of range → `error`, no request.
4. Unchanged value → no request (avoid a PATCH per focus change).
5. Mark the row `pendiente` — a subtle spinner or muted styling. **Do not display a guessed new total.** The old server numbers stay visible until the new ones arrive; that is honest and it is what ADR 9 requires.
6. `PATCH /apus/{id}/detalles/{did}` with **only** the changed field.
7. On success: `queryClient.setQueryData(qk.apu(apuId), response)` — the entire screen repaints from the server. Row returns to `estable`.
8. On error: revert the input to the server value, mark `error`, show the message. `validacion` → inline on the cell; `fila-protegida` → an explanatory toast (*"La fila de Herramienta Menor se calcula automáticamente"*).
9. **Also invalidate** `qk.presupuesto(presupuestoId)` and `qk.cronograma(presupuestoId)` — the CT changed, so the budget and schedule downstream changed (RNF-02).

**Escape-hatch rule for step 5:** if a stakeholder asks for the totals to update *as the user types*, that is a request to put the engine in the client. Say no and cite ADR 9; the correct lever is making the PATCH fast.

### 5.2 Keyboard behaviour (`design/01 §1.1`, §8: "Excel users live on the keyboard")

- `Enter` commits and moves to the same column of the next row.
- `Tab` commits and moves to the next editable cell.
- `Escape` cancels the edit and restores the server value.
- Arrow keys navigate between cells when not editing.
- Protected cells (HM row, computed columns, auxiliary price) are skipped by keyboard navigation, not merely disabled on click.

## 6. Validation (RNF-09, `res/docs/requirements/v1.1-non-functional-requirements.md §9`)

| Field | Rule |
|---|---|
| `cantidad` | decimal **> 0**, fractions allowed (0.10) |
| `rendimiento` | decimal **> 0** (M/N only; the **user** enters it — the system never derives it, v1.1 Anexo C.3) |
| `precioOverride` | decimal **> 0**, or `null` to inherit |
| `porcentajeIndirecto` | 0–100 % (plan 010 owns the footer control) |

Put these in `src/features/apu-editor/schemas.ts` and import them in tests — never duplicate (`quality/01 §B2`).

Warnings that do **not** block (`design/03` P-21, alternativos): `rendimiento = 0` on save → alert; `CD = 0` → alert. Render them as amber inline warnings, not errors.

## 7. Files in scope

```
src/features/apu-editor/
  pages/{ListaApusPage,EditorApuPage}.tsx          S-20, S-22
  components/{DialogoNuevoApu,SelectorInsumo,GridSeccion,FilaDetalle,CeldaEditable,
              PieTotales,EncabezadoApu,BadgeHerencia,BadgeAuxiliar}.tsx
  hooks/{useApuEditor.ts,useApus.ts,useBusquedaParaApu.ts}
  schemas.ts
  *.test.tsx
src/test/handlers.ts · src/test/fixtures/apu.ts
src/routes/index.tsx                                (edit — replace placeholders)
```

**Out of scope, owned by plan 010:** S-24 (descuento por rubro), S-25 (guardar como plantilla), S-26 (desglose de cálculo), the `%CI` footer control (P-23), and the auxiliary-rubro *creation* flow (P-25). This plan's footer shows CD → CD_ajustado → CI → CT **read-only**; plan 010 makes %CI and descuento editable. S-23 must already **list auxiliaries in block O** (they exist as data), but making an APU auxiliary is 010's job.

**Never edit `plans/`** beyond `Status:`/README. **Never write to `../thesis-docs`.**

## 8. Steps

1. **Install:** `npx shadcn@4 add data-table combobox command tooltip alert` (most already present from earlier plans — the CLI is idempotent).
2. **Fixtures first.** Build `src/test/fixtures/apu.ts` from a **real** IESS APU in `../thesis-docs/plan/domain/_artifacts/apus-sample-*.json`. Read one of those files and transcribe one APU into an `ApuResponse` fixture including the HM row. This makes every test in this plan exercise realistic shapes, and it is the same data the backend's golden masters use.
3. **`useApuEditor`** per §5. Section ordering is fixed and derived from a constant, never from the server's array order:

```ts
const ORDEN_SECCIONES = ["EQUIPO", "MANO_OBRA", "MATERIAL", "TRANSPORTE"] as const;
const BLOQUE: Record<SeccionTipo, "M" | "N" | "O" | "P"> = {
  EQUIPO: "M", MANO_OBRA: "N", MATERIAL: "O", TRANSPORTE: "P",
};
const ETIQUETA: Record<SeccionTipo, string> = {
  EQUIPO: "Equipo", MANO_OBRA: "Mano de obra",
  MATERIAL: "Materiales", TRANSPORTE: "Transporte",
};
```

4. **S-20** — data table of `ApuResumenResponse`: código · descripción · unidad · CD · CT · `auxiliar` badge · `vinculado` indicator. Filters: text `q`, `soloAuxiliares`. Actions: crear (S-21) · abrir · duplicar · eliminar. Deleting a referenced APU returns 409 `apu-referenciado` → explain which link blocks it.
5. **S-21** — new-APU dialog. Two paths: *desde cero* (código auto or manual per the project's `modoCodigoRubro` — read it from `qk.parametrosProyecto`) and *desde plantilla* (`GET /plantillas-apu`, preview the snapshot, and show the mandatory notice **"los valores son referenciales y deben revisarse"**, v1.1 §3). On 201, navigate to S-22.
6. **S-22 layout** (follow the wireframe in `design/01 §5`):
   - **Encabezado:** código · descripción · unidad · auxiliar badge. Inline-editable via `editarEncabezado`.
   - **Four grids** in fixed order, each with a `bloque` label. M/N columns: insumo · unidad · cantidad · rendimiento · costo/hora · costo. O/P columns: insumo · unidad · cantidad · precio · costo. All numeric cells carry `className="num"` (plan 004).
   - **HM row** rendered inside block M with a distinct style, a tooltip explaining `%HM × Subtotal N`, no edit affordance, no delete button.
   - **`BadgeHerencia`** per priced row: `heredado` (from `precioHeredado: true`) vs `manual`, with a "restaurar herencia" action on manual rows (P-22).
   - **Footer:** CD → CD_ajustado (only when a discount exists) → CI → **CT**, all read-only here, prominent, tabular.
   - **Empty sections** shown or hidden per the project's `mostrarSeccionesVacias` parameter.
7. **S-23** — the insumo picker. `GET /proyectos/{id}/insumos/busqueda?fuente=LOCAL|CENTRAL|COMBINADA&q&tipo`, with `tipo` bound to the section being added to. **In block O it must also list the project's auxiliary rubros** (they become `apuAuxiliarId` rows). Each result shows its source (LOCAL / CENTRAL + base name) per the A9 assumption (plan 008 §4).
8. **Auxiliary rows are special:** price is always the auxiliary's CD, **not overridable** (v1.1 §2.5.6; the API ignores `precioUnitarioTarifa`). Render the price cell as read-only with a tooltip, and make `restaurarHerencia` unavailable on those rows.
9. **Handlers, tests, `npm run verify`, commit.**

## 9. Test plan

Test **through the hook and the page**, never through internals (`08 §9`).

`useApuEditor.test.ts`:
- sections always come back in M, N, O, P order regardless of the server's array order;
- the HM row is `protegida: true` and every other row is not;
- a row with `precioHeredado: true` is `heredado: true`;
- `editarCelda` with `"abc"` performs **no** request and marks the cell `error`;
- `editarCelda` with `"0"` on cantidad performs no request (RNF-09 > 0);
- `editarCelda` with a valid value marks the row `pendiente`, then `estable` after the response, and the query cache holds the server's returned `ApuResponse`;
- **on failure the cell reverts to the server value** and the cache is unchanged;
- `restaurarHerencia` sends a body with `precioOverride` **present and null** (assert the intercepted JSON contains the key — this is the null-means-inherit contract, easy to break with a spread);
- editing a cell invalidates the presupuesto and cronograma keys.

`EditorApuPage.test.tsx`:
- renders four grids labelled Equipo / Mano de obra / Materiales / Transporte;
- the HM row has no edit control and no delete button; attempting `PATCH` on it (via the API returning `fila-protegida`) shows the explanatory message;
- the footer renders CD, CI and CT from the response — assert the **exact strings** from the fixture, so a formatting regression fails here;
- **TC-P21-04 (component-level half):** after a cell commit the footer shows the new CT **without a remount/reload**. Plan 015 covers the E2E half.
- keyboard: `Enter` commits and moves down; `Escape` restores.

`SelectorInsumo.test.tsx`: `fuente` switching; block O includes auxiliaries and other blocks do not; source indicator rendered.

`ListaApusPage.test.tsx`: auxiliar badge; `soloAuxiliares` filter; delete blocked with `apu-referenciado` shows where it is used.

`DialogoNuevoApu.test.tsx`: `MANUAL` mode shows an editable código field and `AUTOGENERADO` does not; a duplicate código surfaces `codigo-duplicado` on the field; the template path renders the "valores referenciales" notice.

## 10. Done criteria

| Command | Expected |
|---|---|
| `npm run verify` | exit 0 |
| `npm test -- apu-editor` | ≥ 28 tests passing |
| **`grep -rnE "\*\|/" src/features/apu-editor --include=*.ts --include=*.tsx \| grep -vE "import\|//\|\*/\|/\*\|className\|\"/" `** | manually review every hit: **no arithmetic on money** |
| `grep -rn "toFixed\|parseFloat" src/features/apu-editor \| wc -l` | `0` |
| `grep -rn "ORDEN_SECCIONES" src/features/apu-editor \| wc -l` | ≥ 1 |
| S-20 and S-22 routes no longer render `Placeholder` | exit 0 |

The third row is a manual gate, and it is the most important one in this plan: **read every hit and confirm none of them multiplies, adds or rounds a cost.**

## 11. Boundaries

- **Do not** implement any cost formula, subtotal, HM value, CD, CI or CT in TypeScript. Not for previews, not for optimistic UI, not "temporarily". (ADR 9.)
- **Do not** make the HM row editable or deletable.
- **Do not** allow a price override on an auxiliary row.
- **Do not** hardcode the HM row's position in block M — render by `orden`.
- **Do not** build S-24/S-25/S-26 or the editable %CI — plan 010.
- **Do not** batch cell edits into a single "Guardar" button. The spec's model is commit-per-cell; a batch save would make "totales en vivo" false.
- **Do not** create per-row query keys. One key per APU (`qk.apu(id)`).

## 12. Escape hatches

- If a `PATCH` round-trip is slow enough to feel broken (> ~1 s locally), **report it** as a backend performance issue. Do not respond by computing locally.
- If `ApuResponse` lacks a field the footer needs (e.g. `cdAjustado` when no discount exists), render from what is present and report the gap — do not derive it.
- If the humans resolve the HM-position decision, no client change should be needed. If you find yourself needing one, your rendering is position-dependent — fix that instead.
- If `../thesis-docs/plan/domain/_artifacts/apus-sample-*.json` cannot be parsed into an `ApuResponse` shape, build the fixture by hand from `design/01 §5`'s wireframe values and **report the mismatch** — it may indicate contract drift between the extractor's output and the API design.

## 13. Maintenance note

This module will attract exactly one kind of regression: someone adding a small client-side computation to improve perceived responsiveness. Every code review of `src/features/apu-editor/**` should ask "does this file contain arithmetic on a money value?" The `grep` gate in §10 exists to make that question mechanical, and it belongs in CI (plan 015).

The second thing to watch: the invalidation of presupuesto/cronograma keys after a cell edit. It is easy to drop when optimising, and dropping it makes the budget screen show stale totals — which reads as a calc bug in a thesis whose central claim is that these stay synchronised.
