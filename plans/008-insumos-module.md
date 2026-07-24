# 008 — Insumos: catálogo, CRUD, import CSV, bases centrales, copia y uso (P-13…P-18, S-14…S-19)

- **Status:** TODO
- **Written against:** repo state after plans 001–007. Spec repo `/home/etverkade/workspace/thesis-docs` at commit `d7508eb`.
- **Depends on:** 002, 003, 004, 006, 007 (a project must exist).
- **Blocks:** 009 (the APU row picker S-23 searches this catalogue).
- **Covers:** processes **P-13…P-18**; screens **S-14…S-19**; XP stories **US-12…US-15** (iteration I-04).

---

## 1. Why this matters

The *insumo* database is the priced input to everything: an APU row multiplies an insumo's price by a quantity and a yield, so every cost in the system traces back to this table. Two decisions from the 07-06-2026 interview shape it:

- Hourly labour and equipment rates enter **precomputed** (`CLAUDE.md`, Domain rules) — the system never derives `jornal/hr` or `tarifa/hr` from salary tables. There is no calculator screen here, just a price field.
- Insumos live in **bases**: `CENTRAL` bases (Super-Admin owned, read-only for users) and per-project **copies** (editable, independent between projects). `BaseInsumos` is a separate entity (§17 #13) and `Insumo.codigo` is unique **per base**, not globally.

The deliverable that proves this module (`roadmap/01` I-04) is: *the IESS seed (93 insumos from `_artifacts/`) imported by CSV and copied from a seeded central base.*

## 2. Contract — endpoints (`../thesis-docs/plan/architecture/07-api-contract.md §4`)

| Método | Path | Request | Response | Códigos | Errores |
|---|---|---|---|---|---|
| GET | `/proyectos/{id}/insumos?tipo&q&desactualizados&page…` | — | `Page<InsumoResponse>` | 200, 404 | — |
| POST | `/proyectos/{id}/insumos` | `InsumoCrearRequest` | `InsumoResponse` | 201, 400, 404 | `validacion` · `codigo-duplicado` |
| PUT | `/proyectos/{id}/insumos/{iid}` | `InsumoEditarRequest` | `InsumoResponse` | 200, 400, 404 | `validacion` |
| DELETE | `/proyectos/{id}/insumos/{iid}` | — | — | 204, 404, **409** | **`insumo-en-uso`** (el body lista los usos) |
| GET | `/proyectos/{id}/insumos/{iid}/uso` | — | `InsumoUsoResponse[]` | 200, 404 | — |
| POST | `/proyectos/{id}/insumos/import?soloValidar=` | multipart CSV + `tipo` | `ImportResultadoResponse` | 200, 400, 404 | `csv-invalido` |
| POST | `/proyectos/{id}/insumos/copiar-base` | `CopiarBaseRequest` | `CopiaBaseResultadoResponse` | 200, 400, 404 | `validacion` |
| GET | `/proyectos/{id}/insumos/busqueda?fuente=LOCAL\|CENTRAL\|COMBINADA&q&tipo` | — | `InsumoBusquedaResponse[]` | 200, 404 | — |
| GET | `/bases-centrales` | — | `BaseInsumosResponse[]` | 200 | — (excluye archivadas; ETag) |
| GET | `/bases-centrales/{id}/insumos?tipo&q&page…` | — | `Page<InsumoResponse>` | 200, 404 | — (read-only) |

**Side effect to surface:** `PUT …/insumos/{iid}` — *"Editar precio propaga por herencia a filas sin override (DM §8)"*. After a price edit, invalidate the APU and presupuesto keys.

## 3. Screens (`design/02-pantallas-flujos.md §3`)

| ID | Pantalla | Tipo | Ruta | Prio | Contenido clave | Procesos |
|---|---|---|---|---|---|---|
| S-14 | Insumos del proyecto | Página | `/proyectos/:id/insumos` | N | Tabla filtrable, tabs por tipo (Materiales/MO/Equipo/Transporte), badge "desactualizado > 3 meses", búsqueda | P-13 |
| S-15 | Crear/editar insumo | Diálogo | (desde S-14) | N | Form por tipo: unidad fija `h` en MO/equipo; precio/tarifa/jornal | P-14 |
| S-16 | Importar CSV | Asistente | (desde S-14 / S-39) | N | ① plantilla por tipo + upload ② preview con errores fila a fila ③ resumen (n creados / m errores) | P-15 |
| S-17 | Bases centrales | Vista | (tab en S-14) | S | Explorar/buscar bases centrales read-only | P-16 |
| S-18 | Copiar base al proyecto | Diálogo | (desde S-14/S-08) | N | Elegir fuente (base central o proyecto propio) → copia independiente | P-17 |
| S-19 | Uso del insumo | Diálogo | (desde S-14) | S | "Dónde se usa": lista de APUs que lo referencian; explica el bloqueo de borrado | P-18 |

## 4. Domain rules

- **Four types** (`InsumoCrearRequest.tipo`): `EQUIPO` · `MANO_OBRA` · `MATERIAL` · `TRANSPORTE`. The form differs per type (`design/03` P-14): for `MANO_OBRA` and `EQUIPO` the unidad is fixed to `h` (hours) and the price field is labelled *Jornal/hr* and *Tarifa/hr* respectively; for `MATERIAL` and `TRANSPORTE` the unidad is free and the field is *Precio unitario* / *Tarifa*.
- **Unidades = open catalogue** (§17 #10, resolved): a seed catalogue plus free text with a **non-blocking warning**. A closed list would break the IESS golden master. So: a combobox that allows creating a value, showing a soft warning for values outside the seed list — never a blocking error.
- **RNF-09:** prices, tariffs and costs are **decimals > 0**. Enforce in Zod; the server is authoritative.
- **Desactualizado** (RNF-08): `InsumoResponse.desactualizado` is a **server-computed** boolean for "more than 3 months without update". Render the badge from that field; do **not** compute it from `fechaActualizacion` in the client.
- **D-06 — import CSV is an upsert by `codigo`** (updates precio/descripción/unidad if it exists, creates if not). The result reports creados / actualizados / errores per row. The wizard's step ② uses `?soloValidar=true` — same code path, no writes.
- **D-07 — copying a base onto a project that already has insumos keeps the existing one and skips the conflict**; skipped `codigo`s are reported (`CopiaBaseResultadoResponse.omitidos`). Show that list; do not silently swallow it.
- **§4.7 — an insumo in use cannot be deleted.** DELETE returns 409 `insumo-en-uso` with a `usos[]` array in the body. The UI turns that into S-19's content rather than a bare toast.
- **A9 assumption (open):** rows referencing a **central** base are frozen at the moment they are added (snapshot), so Super-Admin price edits do **not** propagate to users' APU rows. `design/02 §5.4` says the UI must **indicate the price's source**. Implement a source indicator (`LOCAL` / `CENTRAL` + base name) in the search results, and flag the assumption in your report.

## 5. Files in scope

```
src/features/insumos/
  pages/InsumosPage.tsx                     S-14 (+ tab S-17)
  components/{TablaInsumos,DialogoInsumo,AsistenteImportCsv,VistaBasesCentrales,
              DialogoCopiarBase,DialogoUsoInsumo,BadgeDesactualizado,
              ComboboxUnidad}.tsx
  hooks/{useInsumos.ts,useInsumoMutaciones.ts,useImportCsv.ts,useBasesCentrales.ts,
         useBusquedaInsumos.ts}
  schemas.ts
  *.test.tsx
src/test/handlers.ts · src/test/fixtures/insumos.ts
src/routes/index.tsx                        (edit — replace the S-14 placeholder)
```

**Out of scope:** the admin-side central-base management (S-38/S-39, P-39) — plan 014, which **reuses** `DialogoInsumo` and `AsistenteImportCsv` from here with a different destination endpoint. Design them with the destination as a prop for exactly that reason. **Never edit `plans/`** beyond `Status:`/README. **Never write to `../thesis-docs`.**

## 6. Steps

1. **Install:** `npx shadcn@4 add data-table combobox command native-select drawer` and `npm install papaparse @types/papaparse` (CSV parsing in the browser for the preview — `01-react-libraries.md §8`).
2. **Schemas** — a discriminated union on `tipo` so the per-type rules are typed:

```ts
const precioPositivo = z
  .string()
  .refine((v) => parsearEntradaDecimal(v) !== null, "Ingresa un número válido")
  .refine((v) => Number(parsearEntradaDecimal(v)) > 0, "El precio debe ser mayor que 0");

const base = { codigo: z.string().optional(), descripcion: z.string().min(1, "La descripción es obligatoria") };

export const insumoSchema = z.discriminatedUnion("tipo", [
  z.object({ ...base, tipo: z.literal("MANO_OBRA"), unidad: z.literal("h"), precioUnitario: precioPositivo }),
  z.object({ ...base, tipo: z.literal("EQUIPO"),    unidad: z.literal("h"), precioUnitario: precioPositivo }),
  z.object({ ...base, tipo: z.literal("MATERIAL"),  unidad: z.string().min(1, "La unidad es obligatoria"), precioUnitario: precioPositivo }),
  z.object({ ...base, tipo: z.literal("TRANSPORTE"),unidad: z.string().min(1, "La unidad es obligatoria"), precioUnitario: precioPositivo }),
]);
```

3. **S-14** — TanStack data table with tabs by tipo, a search box (debounced into `?q`), a "solo desactualizados" filter, server-side pagination via the `Page<T>` envelope, and a toolbar: *Nuevo* · *Importar CSV* · *Copiar base*. Row actions: editar · ver uso · eliminar. Empty state with a CTA (P-44).
4. **S-15** — the create/edit dialog, form fields switching on `tipo`. `codigo` is **immutable on edit** (`InsumoEditarRequest` omits it — it is the upsert key). Show that as a disabled field, not a missing one.
5. **S-16 — the CSV wizard.** Three steps: ① download a per-type template + file upload (accept `.csv`); ② **preview**: parse locally with PapaParse for an immediate column check, then call `POST …/import?soloValidar=true` and render the authoritative row-by-row errors from `ImportResultadoResponse.errores[]` (`{ fila, campo, mensaje }`) in a table, with valid rows counted; ③ confirm → `?soloValidar=false` → summary toast *"n creados, m actualizados, k errores"*. **The server's validation is authoritative** — the local parse only speeds up feedback, it never gates the upload on its own opinion.
6. **S-17** — a tab inside S-14 listing central bases (`GET /bases-centrales`) and their insumos, clearly **read-only** (no edit/delete affordances at all, not disabled ones).
7. **S-18** — copy dialog: source = central base or own project → POST → render `copiados` and the `omitidos[]` list with the D-07 explanation (*"se conservó el insumo existente del proyecto"*).
8. **S-19** — usage dialog: `GET …/uso` → table of APUs (`apuId`, `codigo`, `descripcion`, `bloque`, `override`). Reachable both from the row menu **and** automatically when a DELETE returns 409 `insumo-en-uso` — in that case seed it from the error body's `usos[]` so the user sees the reason in one step.
9. **Invalidation:** after any insumo mutation, invalidate `qk.insumos(proyectoId)`; after a **price** change or an import, also invalidate `qk.apu(*)` and the presupuesto/cronograma keys — the server propagated by inheritance (DM §8) and the visible totals changed.
10. **Handlers, fixtures, tests, `npm run verify`, commit.**

## 7. Test plan

- `TablaInsumos.test.tsx` — renders rows; tipo tabs filter; the `desactualizado` badge appears only when the field is true (and is **not** derived from a date); empty state CTA.
- `DialogoInsumo.test.tsx` — imports `insumoSchema`. `MANO_OBRA` forces unidad `h` and labels the price *Jornal/hr*; `MATERIAL` allows a free unidad; price `0` and `-1` rejected, `0.10` accepted (RNF-09 fractions); on edit, `codigo` is not editable; server `codigo-duplicado` lands on the codigo field.
- `AsistenteImportCsv.test.tsx` — step ② renders per-row errors from `ImportResultadoResponse`; a file with one bad row shows exactly one error row and still allows importing the valid ones; step ③ reports creados **and** actualizados separately (D-06 upsert semantics); a `csv-invalido` problem shows a blocking message.
- `DialogoCopiarBase.test.tsx` — renders `omitidos` with the "se conservó el existente" explanation (D-07).
- `DialogoUsoInsumo.test.tsx` — a 409 `insumo-en-uso` on delete opens the dialog pre-filled from the error body (**TC-P18-01** UI half).
- `useBusquedaInsumos.test.ts` — `fuente=COMBINADA` results carry a visible source indicator per row (LOCAL vs CENTRAL + base name).

## 8. Done criteria

| Command | Expected |
|---|---|
| `npm run verify` | exit 0 |
| `npm test -- insumos` | ≥ 22 tests passing |
| `grep -rn "desactualizado" src/features/insumos \| grep -c "fechaActualizacion"` | `0` — the badge is not derived client-side |
| `grep -rn "toFixed\|parseFloat" src/features/insumos \| wc -l` | `0` |
| S-14 route no longer renders `Placeholder` | exit 0 |
| `DialogoInsumo` and `AsistenteImportCsv` accept a destination prop | verified by reading the props type |

## 9. Boundaries

- **Do not** build any hourly-cost calculator for labour or equipment (SST, 13°, 14°, FR, AP, FAS / CE, I, CM, CR, CDi, CL, CLL). Those values arrive **precomputed** — decision locked 07-06-2026 (`CLAUDE.md`). A screen that computes them contradicts the requirements.
- **Do not** enforce a closed unidad list (§17 #10) — warn, never block.
- **Do not** implement admin central-base CRUD (P-39) — plan 014.
- **Do not** compute the "> 3 meses" staleness client-side.
- **Do not** let the browser-side PapaParse result decide whether an import may proceed; the server validates.

## 10. Escape hatches

- If a per-type CSV template is not defined anywhere you can find, generate the header row from `InsumoCrearRequest`'s fields for that tipo and **report that the template spec is missing** — do not invent extra columns.
- If the A9 decision (central-base propagation) is resolved to *live propagation* while you work, the only change here is the source-indicator copy; report it rather than redesigning.
- If `InsumoBusquedaResponse` lacks the base name for CENTRAL rows, show `Central` alone and report the contract gap.

## 11. Maintenance note

`DialogoInsumo` and `AsistenteImportCsv` are reused verbatim by plan 014 with a central-base destination. Keep the destination in props, never read it from the route inside those components — otherwise plan 014 will fork them and the two copies will drift.

The invalidation set in Step 9 is the mechanism behind RNF-02's *"propagación insumo → APU → presupuesto → cronograma"*. If someone trims it, the propagation still happens on the server but the UI stops showing it, which looks exactly like a calc bug.
