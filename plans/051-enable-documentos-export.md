# Plan 051 — Enable the documentos/export module

**Status:** TODO
**Written against:** `e44c608`
**Spec source:** backend `DocumentoResource` (both of them — see **Maintenance notes**); `plans/ROADMAP-V2-BACKEND-PARITY.md`
**Effort:** M (3-4 hours)
**Risk:** MEDIUM — every export URL in the frontend is currently wrong; one export is blocked upstream

## Why

`documentos` is gated in `MODULOS_SIN_BACKEND` (`src/lib/disponibilidad.ts`). The comment above
the gate says *"El backend no tiene ningún endpoint de exportación todavía (plan 027)"* — that is
now false. `test/stuff` serves five export endpoints.

But the gate was hiding more than an unbuilt backend. **Every one of the four URLs in
`opcionesExport` is wrong**, and two of the four advertise a format the backend cannot produce.
Un-gating without fixing them ships four buttons that all fail.

### What the backend actually serves

`src/main/java/ec/uce/propuestas/documento/resource/DocumentoResource.java`:

| Endpoint | Path param | Produces |
|---|---|---|
| `GET /documentos/apu/{apuId}?formato=xlsx` | `Long` | XLSX (one APU) |
| `GET /documentos/apus/{presupuestoId}` | `Long` | XLSX (all APUs) |
| `GET /documentos/presupuesto/{presupuestoId}` | `Long` | XLSX |
| `GET /documentos/cronograma/{presupuestoId}` | `Long` | XLSX |

`src/main/java/ec/uce/propuestas/documento/DocumentoResource.java` (a **second** class on the
same `@Path`):

| Endpoint | Path param | Produces |
|---|---|---|
| `GET /documentos/especificaciones-tecnicas/{presupuestoId}?formato=docx&titulo1=&titulo2=` | **UUID** | DOCX |

### What the frontend calls today

`src/features/exportar/hooks/useExportar.ts`, `opcionesExport`:

| key | current endpoint | reality |
|---|---|---|
| `presupuesto-pdf` | `/presupuestos/{id}/exportar/pdf` | wrong path, **and PDF does not exist** |
| `presupuesto-excel` | `/presupuestos/{id}/exportar/excel` | wrong path |
| `apus` | `/presupuestos/{id}/apus/exportar` | wrong path, filename says `.pdf`, server sends XLSX |
| `cronograma` | `/presupuestos/{id}/cronograma/exportar` | wrong path, filename says `.pdf`, server sends XLSX |

## Decisions the human must make

### Decision A — PDF (blocking)

The UI offers *"Presupuesto (PDF)"*. **The backend produces XLSX and DOCX only. There is no PDF
generator anywhere in `test/stuff`.**

- **Recommended: remove the PDF affordance.** One deleted array entry, honest UI, smallest
  diff. Users get XLSX, which is what the system actually makes.
- Alternative: keep the button and file a backend plan for PDF rendering. That is a real
  feature (a renderer, templates, page layout), not a config flag.

**Do not wire `presupuesto-pdf` to the XLSX endpoint and rename the file `.pdf`.** That ships a
corrupt download. This plan's steps assume the recommendation; if the human picks the
alternative, stop and write the backend plan first.

### Decision B — Especificaciones técnicas (blocked, not a choice)

The ET export takes the presupuesto's **UUIDv7 `public_id`**. The frontend only ever holds the
**`Long presupuestoId`** — `PresupuestoResponse` exposes no UUID field
(`presupuesto/dto/PresupuestoResponse.java`). So the frontend **cannot call this endpoint at
all** right now.

Per `plans/047`, that endpoint is the one *correctly* following the UUIDv7 doctrine; the rest of
the presupuesto module is the laggard. Resolving this needs the Step 5 follow-up in 047
(expose the presupuesto `publicId`), not a frontend workaround.

**Leave ET export out of this plan.** Note it in the UI's absence, not with a broken button.

## What changes

1. Rewrite `opcionesExport` with the real `/documentos/*` paths and correct `.xlsx` filenames.
2. Drop the `presupuesto-pdf` entry (Decision A).
3. Un-gate the module and export `ExportPageActiva` as `ExportPage`.
4. MSW handlers for the four real paths.
5. A test that asserts the **requested URL**, not merely that a download was attempted.

## Steps

### Step 1 — Rewrite `opcionesExport`

`src/features/exportar/hooks/useExportar.ts`. Replace the whole array:

```typescript
export const opcionesExport = [
  {
    key: "presupuesto",
    label: "Presupuesto (Excel)",
    endpoint: (presupuestoId: number) => `/documentos/presupuesto/${presupuestoId}`,
    nombre: (pid: string) => `presupuesto_${pid}.xlsx`,
  },
  {
    key: "apus",
    label: "APUs (Excel)",
    endpoint: (presupuestoId: number) => `/documentos/apus/${presupuestoId}`,
    nombre: (pid: string) => `apus_${pid}.xlsx`,
  },
  {
    key: "cronograma",
    label: "Cronograma (Excel)",
    endpoint: (presupuestoId: number) => `/documentos/cronograma/${presupuestoId}`,
    nombre: (pid: string) => `cronograma_${pid}.xlsx`,
  },
] as const;
```

Three entries, not four — the PDF one is gone. The path param is the **presupuesto** id
(`Long`), which stays numeric after plan 046; rename the parameter from `id` to
`presupuestoId` so the next reader does not pass a proyecto id.

`GET /documentos/apu/{apuId}` (single APU) is a different surface — it belongs on the APU
editor, not this page. Out of scope; see **Out of scope**.

### Step 2 — Icon logic

`ExportPageActiva` picks its icon with `op.key.includes("excel")`. No key contains `"excel"`
any more, so every row would render the generic `FileDown`. All three are spreadsheets now:

```tsx
<TableCell className="flex items-center gap-2">
  <FileSpreadsheet className="size-4 text-muted-foreground" />
  {op.label}
</TableCell>
```

Drop the conditional and the now-unused `FileDown` import from the label cell (it is still used
inside the button).

### Step 3 — Un-gate the module

`src/lib/disponibilidad.ts` — remove `"documentos"`:

```typescript
export const MODULOS_SIN_BACKEND = new Set([
  "plantillas",
  "plantillas-proyecto",
  "admin",
] as const);
```

Also fix the stale block comment above the set: it claims the backend has "nueve recursos
JAX-RS, sin paquetes presupuesto/cronograma/export/plantilla/admin", which has been untrue since
`test/stuff`.

`src/features/exportar/pages/ExportPage.tsx` — delete the stub `ExportPage` (and its
`ModuloNoDisponible` import), then rename `ExportPageActiva` → `ExportPage`. Follow exactly what
`e44c608` did for `PresupuestoPage`/`VersionesPage`.

Grep for `ExportPageActiva` afterwards; the route file and tests import it by name.

### Step 4 — MSW handlers

`src/test/handlers.ts`. `descargar` returns a blob, so the handler must too:

```typescript
http.get("*/documentos/presupuesto/:id", () =>
  HttpResponse.arrayBuffer(new ArrayBuffer(8), {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  }),
),
http.get("*/documentos/apus/:id", () => HttpResponse.arrayBuffer(new ArrayBuffer(8))),
http.get("*/documentos/cronograma/:id", () => HttpResponse.arrayBuffer(new ArrayBuffer(8))),
```

### Step 5 — Test the URL, red first

The failure this plan exists to prevent is *"the button downloads from the wrong path"*. A test
that only asserts "a download happened" cannot see that, and would have passed against the
broken URLs. Assert the path.

New file `src/test/features/exportar/pages/ExportPage.test.tsx`:

1. **Red:** capture the requested URL via an MSW `onUnhandledRequest` spy or a
   `server.events.on("request:start", …)` listener; assert clicking *Presupuesto (Excel)*
   requests `/documentos/presupuesto/{id}`. Run it before Step 1 and watch it fail on the old
   path.
2. **Green:** apply Step 1.
3. Then: exports are disabled while `validacion.exportable === false`; the three rows render.

`jsdom` has no real download. `descargarConFallback` calls `URL.createObjectURL` and clicks an
anchor — stub `URL.createObjectURL`/`revokeObjectURL` in the test setup, and assert the anchor's
`download` attribute for the `.xlsx` filename.

### Step 6 — Sidebar

`src/shell/Sidebar.tsx` gates the nav entry on the same set, so removing `"documentos"` drops
the "Próximamente" badge automatically. `src/test/shell/Sidebar.test.tsx` asserts which entries
carry the badge — update it, as `e44c608` did for presupuesto.

### Step 7 — Verify

```bash
npm run typecheck   # zero errors
npx vitest run     # all pass
npm run lint       # no new warnings
```

Baseline at `e44c608` is 45 files / 207 tests green, `tsc` clean, lint warnings pre-existing
only.

## Seams under test

- `src/test/features/exportar/pages/ExportPage.test.tsx` — **primary seam.** The page's public
  behaviour: which documents are offered, which URL each requests, when they are disabled.
- `src/test/shell/Sidebar.test.tsx` — the module is no longer "próximamente".

Test through the rendered page with MSW behind it. Do **not** unit-test `opcionesExport` by
importing the array and asserting its strings — that is the tautology trap: it restates the
constant instead of checking that clicking the button hits that path.

## Out of scope

- **PDF export** — Decision A. Backend feature if wanted.
- **Especificaciones técnicas (DOCX)** — Decision B. Blocked on plan 047 Step 5.
- **Single-APU export** (`GET /documentos/apu/{apuId}`) — belongs on the APU editor page.
  Separate slice, and note its `apuId` is a `Long` while plan 046 moves APU ids to UUID
  strings, so it needs 047's follow-up too.
- Export progress/queueing. The endpoints are synchronous.

## Escape hatches

- If `descargar` sets an `Accept` header the MSW handler does not match, relax the handler
  rather than the client.
- If the backend rejects the numeric `presupuestoId` after plan 047's follow-up lands, this
  plan's URLs change shape — cross-check 047 status before starting.

## Maintenance notes

Two classes carry `@Path("/documentos")`: `documento/DocumentoResource.java` (ET, UUID) and
`documento/resource/DocumentoResource.java` (the four XLSX exports, Long). Grepping for the
class name finds the wrong file half the time. Flagged for merge in plan 047's Maintenance
notes.

The `validacion.exportable` gate already works and is wired to a real endpoint
(`GET /presupuestos/{id}/validacion`) — `useValidacionExport` needs no change.
