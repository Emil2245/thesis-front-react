# 013 — Exportar documentos SERCOP: selección, validaciones bloqueantes, preview y descarga (P-37, S-35)

- **Status:** TODO
- **Written against:** repo state after plans 001–012. Spec repo `/home/etverkade/workspace/thesis-docs` at commit `d7508eb`.
- **Depends on:** 011 (validation endpoint + budget), 012 (cronograma), 007 (project parameters and firmantes feed the cover page).
- **Covers:** process **P-37**; screen **S-35**; XP story **US-34** (iteration I-10).
- **Thesis milestone:** week 20 — the **conformity rate** (CHK-01…CHK-31) is measured on the files this screen downloads.

---

## 1. Why this matters, and what the frontend is *not* responsible for

Document generation is **server-side, and that is an architectural decision with a reason** (ADR 4, RNF-03, `../thesis-docs/plan/frontend/01-react-libraries.md §5`):

> Generating server-side means: (a) one source of truth for SERCOP templates, (b) unit-testable export in the same place as the calc engine, (c) no dependence on the client.

And `07-api-contract.md §8`: *"redondeo a 2 dp **solo aquí**"* — the 2-decimal rounding that appears in the exported files happens in the backend generator, nowhere else.

So this plan builds a **launcher**: choose deliverable + format + version → run the blocking checklist → preview → download. It generates nothing. Do not add ExcelJS or @react-pdf/renderer; `01-react-libraries.md §5` keeps them only as a hypothetical fallback and the decision went the other way.

## 2. Contract — endpoints (`07 §8`)

| Método | Path | Response | Códigos | Errores |
|---|---|---|---|---|
| GET | `/documentos/apu/{apuId}?formato=xlsx\|pdf` | stream (attachment) | 200, 404, **409** | **`export-bloqueado`** (checklist P-32; body lista ítems y enlaces) |
| GET | `/documentos/apus/{presupuestoId}?formato=` | stream | 200, 404, 409 | `export-bloqueado` |
| GET | `/documentos/presupuesto/{presupuestoId}?formato=` | stream | 200, 404, 409 | `export-bloqueado` |
| GET | `/documentos/cronograma/{presupuestoId}?formato=` | stream | 200, 404, 409 | `export-bloqueado` |

Plus the checklist source (`07 §6`):

| GET | `/presupuestos/{id}/validacion` | `ValidacionPresupuestoResponse` | 200, 404 |

```jsonc
ValidacionPresupuestoResponse { "exportable": false,
  "itemsPuCero": [ RubroRefResponse ], "itemsCantidadCero": [ RubroRefResponse ],
  "itemsSinActividad": [ RubroRefResponse ] }
RubroRefResponse { "rubroId": 1, "item": "1.1.1", "codigo": "", "descripcion": "" }
```

**Open decisions carried in the contract (`07 §8`):** sync vs async generation, and persist vs stream. *"Este contrato asume sync + stream; si se adopta async, estos GETs devuelven 202 + `Location` de un job (cambio aditivo)."* Build for **sync + stream**, and isolate the download call behind one function so an async variant is a change in one place (§6 Step 5).

## 3. Screen (`design/02-pantallas-flujos.md §3`)

| ID | Pantalla | Tipo | Ruta | Prio | Contenido clave | Procesos |
|---|---|---|---|---|---|---|
| S-35 | Exportar documentos | Página | `/proyectos/:id/documentos` | N | Selección de entregable (APU individual / todos los APUs / presupuesto / cronograma) + formato (.xlsx/.pdf) + versión (default vigente); checklist de validaciones bloqueantes; preview; descarga | P-37, P-32 |

Flow F-09 (`design/02 §4`): *"elegir entregable + formato + versión → checklist bloqueante (ítems con PU = 0 listados, rubros sin actividad) → preview → descargar. El export bloqueado enlaza a la pantalla donde se corrige."*

## 4. Domain rules

- **Four deliverables:** APU individual (plus which APU) · todos los APUs · presupuesto · cronograma. Two formats: `.xlsx` and `.pdf`.
- **Version:** defaults to the **vigente**; the user may choose another (`useVersionActiva` from plan 006 supplies the active one, and the picker offers all versions).
- **Blocking checklist (P-32, v1.1 §9):** items with `PU = 0`, `cantidad = 0`, and rubros **sin actividad** (RNF-02). While `exportable === false`, the download buttons are disabled and the checklist is shown with **links to where each problem is fixed**:
  - `itemsPuCero` → the APU editor (`/proyectos/:id/apus/:apuId`) — an item's PU is zero because its APU is incomplete;
  - `itemsCantidadCero` → the budget tree (`/proyectos/:id/presupuesto`);
  - `itemsSinActividad` → the cronograma (`/proyectos/:id/cronograma`).
- **Defence in depth:** even with the client check, a 409 `export-bloqueado` may come back (someone edited in another tab). Handle it by rendering the error body's list in the same checklist component.
- **Presentation parameters** (`mostrarSeccionesVacias`, `sufijosSeccionActivos`, `mostrarSubtotalesSeccion`, `mostrarSubtotalesPie`, `mostrarNombreProyectoHeader`, `enumerarApus`, `mensajeFooter`) and the **firmantes** are applied by the server from the project's configuration. Show them read-only on S-35 as a "así se generará" summary with a link to S-12/S-11 — users need to see what will appear before downloading, and this is cheap.

## 5. Preview — be honest about what is feasible

`design/03` P-37 step 3 says *"Preview del documento"*. There is no preview endpoint in the contract; the only sources are the same streaming GETs.

**Implement it as:** call the same endpoint, hold the returned `Blob`, and
- for **PDF**: render it in an `<object>`/`<iframe>` via `URL.createObjectURL(blob)`;
- for **XLSX**: browsers cannot render it, so show a **file summary card** instead (name, size, format, deliverable, version) with a Download button — do **not** install a spreadsheet renderer to fake it.

Revoke every object URL on unmount (`URL.revokeObjectURL`) or you leak memory across previews.

Flag in your report that the PDF preview costs a second generation round-trip; if the humans adopt async generation (`07 §8`), preview and download should share one job.

## 6. Files in scope

```
src/features/exportar/
  pages/DocumentosPage.tsx                      S-35
  components/{SelectorEntregable,SelectorFormato,ChecklistValidacion,
              PreviewDocumento,ResumenPresentacion}.tsx
  hooks/{useValidacionExport.ts,useDescargarDocumento.ts}
  descarga.ts                                   (the single download seam)
  *.test.tsx
src/test/handlers.ts · src/test/fixtures/exportar.ts
src/routes/index.tsx                            (edit — replace the placeholder)
```

**Never edit `plans/`** beyond `Status:`/README. **Never write to `../thesis-docs`.**

## 7. Steps

1. **`src/features/exportar/descarga.ts`** — the one place that knows how a file arrives:

```ts
import { descargar } from "@/api/request";

export type Entregable = "apu" | "apus" | "presupuesto" | "cronograma";
export type Formato = "xlsx" | "pdf";

/** Construye la ruta del contrato (architecture/07 §8). */
export function rutaDocumento(entregable: Entregable, id: number): string {
  return `/documentos/${entregable}/${id}`;
}

/**
 * Descarga sincrónica por streaming (07 §8 asume sync + stream).
 * Si se adopta generación asíncrona (202 + Location de un job), este archivo
 * es el ÚNICO que cambia.
 */
export async function obtenerDocumento(
  entregable: Entregable,
  id: number,
  formato: Formato,
): Promise<Blob> {
  return descargar(rutaDocumento(entregable, id), { formato });
}

/** Dispara la descarga en el navegador y limpia la URL temporal. */
export function guardarArchivo(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

Filename: prefer the server's `Content-Disposition` when present (the backend sets `nombreArchivo`, `08-codebase-design.md §4`); fall back to `<entregable>-v<version>.<formato>`.

2. **`useValidacionExport(presupuestoId)`** — wraps `qk.presupuestoValidacion`. Refetch on window focus is off globally (plan 002), so add an explicit "revalidar" button; a stale checklist that blocks a fixed budget is the most annoying failure mode of this screen.

3. **`ChecklistValidacion`** — three groups, each with its count, its list of `RubroRefResponse` (item · código · descripción) and a link per row. Green "todo listo" state when `exportable === true`. Also used to render a 409 `export-bloqueado` body, so accept the lists as props rather than reading the query internally.

4. **`SelectorEntregable` / `SelectorFormato`** — radio/segmented controls. Choosing "APU individual" reveals an APU picker (`GET /presupuestos/{id}/apus`). Note that **APU exports are per-APU** and use `apuId`, while the other three use `presupuestoId` — get this wiring right; it is the easiest bug in this plan.

5. **`ResumenPresentacion`** — read-only summary of the project's presentation toggles and firmantes, with links to S-12 and S-11.

6. **`PreviewDocumento`** — per §5. Loading state with a spinner and a *"Generando documento…"* message; errors surface via `notificarError` (plan 006).

7. **`DocumentosPage`** — composes the above with a `Progress`/spinner during generation and a success toast on download (`02-shadcn-components.md §1`, Documentos row).

8. **Handlers, fixtures, tests, `npm run verify`, commit.**

## 8. Test plan

MSW can return a `Blob`/`ArrayBuffer` body; assert on the request, the disabled states and the error handling rather than on file contents (file conformity is the backend's parse-back suite, CHK-01…31).

- `ChecklistValidacion.test.tsx` — renders the three groups with counts; each row links to the right route (`itemsPuCero` → `/apus/:apuId`, `itemsSinActividad` → `/cronograma`); the green state renders when `exportable`.
- `DocumentosPage.test.tsx` —
  - with `exportable: false`, **every download button is disabled** and the checklist is visible;
  - with `exportable: true`, downloading calls the right URL with the right `formato` query;
  - "APU individual" hits `/documentos/apu/{apuId}`, "todos los APUs" hits `/documentos/apus/{presupuestoId}` — assert both, they are easy to swap;
  - a 409 `export-bloqueado` renders the error body's lists in the checklist (**TC-P37** UI half);
  - the version selector defaults to the vigente.
- `descarga.test.ts` — `rutaDocumento` for all four deliverables; `guardarArchivo` creates and revokes the object URL (spy on `URL.createObjectURL`/`revokeObjectURL`).
- `PreviewDocumento.test.tsx` — PDF renders an object element with a blob URL; XLSX renders the summary card and **no** viewer; the object URL is revoked on unmount.

## 9. Done criteria

| Command | Expected |
|---|---|
| `npm run verify` | exit 0 |
| `npm test -- exportar` | ≥ 14 tests passing |
| `grep -rn "exceljs\|xlsx\|@react-pdf" package.json \| wc -l` | `0` — no client-side generation |
| `grep -rn "revokeObjectURL" src/features/exportar \| wc -l` | ≥ 2 |
| a test asserts download buttons are disabled when `exportable: false` | exit 0 |
| S-35 route no longer renders `Placeholder` | exit 0 |

## 10. Boundaries

- **Do not** generate xlsx or pdf in the browser. Server-side only (ADR 4 / RNF-03).
- **Do not** round any number for display on this screen in a way that implies it is what the file contains — the file's 2-decimal rounding is the server's, and S-35 shows no cost figures beyond what other screens already show.
- **Do not** implement the SERCOP layout, the CHK checklist, or the cover page. `design/04-export-sercop-spec.md` is a **backend** spec.
- **Do not** bypass the checklist with a "descargar de todas formas" escape. The blocking is a requirement (v1.1 §9).
- **Do not** spread download logic across components — everything goes through `descarga.ts`.

## 11. Escape hatches

- If the backend adopts **async** generation (202 + `Location`), change only `descarga.ts` to poll the job and report that you did.
- If `Content-Disposition` is not exposed to JS (it needs `Access-Control-Expose-Headers` on a cross-origin API), fall back to the constructed filename and **report the CORS gap** — it is a one-line backend fix.
- If the PDF preview proves unreliable across browsers, degrade to the summary card for both formats and report it; a broken preview is worse than an honest absent one.

## 12. Maintenance note

This screen is the last gate before the artefacts the thesis measures conformity on. Two things to watch in review: (a) anything that weakens the blocking checklist, and (b) any client-side formatting of numbers that ends up looking like it came from the file. The exported document and the screen must never disagree, and the only way to guarantee that is for the screen not to compute anything.
