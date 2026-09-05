# Plan 048 — Enable plantillas de APU (un-gate `plantillas`)

**Status:** TODO
**Written against:** `e44c608`
**Spec source:** backend `test/stuff` @ `eb9a1da`, `PlantillaApuResource` (`/plantillas-apu`); supersedes the gate added in plan 027
**Effort:** S (1-2 hours)
**Risk:** LOW — the page is fully written; this removes a stub and fixes two contract mismatches

## Why

`MisPlantillasPage` renders a `ModuloNoDisponible` stub because `/plantillas-apu` did not exist when plan 027 landed. It exists now on `test/stuff`:

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/plantillas-apu?q=&tipo=` | — | `PlantillaApuResumenResponse[]` |
| GET | `/plantillas-apu/{id}` | — | `PlantillaApuDetalleResponse` |
| PUT | `/plantillas-apu/{id}` | `{nombre?, descripcionRubro?}` | `PlantillaApuResumenResponse` |
| DELETE | `/plantillas-apu/{id}` | — | 204 |

All ids are **UUIDv7 strings**. `usePlantillas.ts` already types plantilla ids as `string`, so this module is mostly ready. Two things are wrong:

1. `PlantillaApuEditarRequest` declares `descripcion?` — the backend field is **`descripcionRubro?`**. Latent today (the page only ever sends `nombre`), but it would silently drop the field the moment someone edits a description.
2. `useGuardarPlantilla(apuId: number)` — `apuId` is a UUIDv7 string on the backend.

## What changes

1. **Fix `PlantillaApuEditarRequest.descripcion` → `descripcionRubro`** in `contract.ts`.
2. **Fix `useGuardarPlantilla(apuId)` to `string`.**
3. **Remove `"plantillas"`** from `MODULOS_SIN_BACKEND`.
4. **Delete the stub** `MisPlantillasPage` and export `MisPlantillasPageActiva` as `MisPlantillasPage`.
5. **Update the tests** that assert the degraded state.

## Steps

### Step 1 — Fix the contract in `src/api/contract.ts`

```typescript
export interface PlantillaApuEditarRequest {
  nombre?: string;
  descripcionRubro?: string;   // was: descripcion
}
```

Grep for `PlantillaApuEditarRequest` call sites — `MisPlantillasPage` sends `{ nombre }` only, so nothing else should need touching. If any caller sends `descripcion`, rename it.

### Step 2 — Fix the APU id type in `src/features/apu-editor/hooks/usePlantillas.ts`

```typescript
export function useGuardarPlantilla(apuId: string) {
  // body unchanged
}
```

Then fix its callers. `src/features/apu-editor/pages/EditorApuPage.tsx` and `DialogoGuardarPlantilla` pass the APU id; both should already be carrying a UUID string once plan 046 lands. If 046 has not landed yet, this step will surface a type error at the call site — that error is correct, and 046 resolves it. Coordinate: **land 046 first if it is in flight.**

### Step 3 — Remove the module from the gate

In `src/lib/disponibilidad.ts`, drop `"plantillas"`:

```typescript
export const MODULOS_SIN_BACKEND = new Set([
  "documentos",
  "plantillas-proyecto",
  "admin",
] as const);
```

Also update the doc comment above the set — it currently claims no `plantilla` package exists in the backend, which is no longer true.

### Step 4 — Delete the stub page

In `src/features/plantillas/pages/MisPlantillasPage.tsx`:

- Delete the comment block at lines 34-36 and the stub `export function MisPlantillasPage()` (lines 37-47).
- Rename `export function MisPlantillasPageActiva()` → `export function MisPlantillasPage()`.
- Drop the now-unused `ModuloNoDisponible` import.

Verify nothing else imports `MisPlantillasPageActiva`:

```bash
grep -rn "MisPlantillasPageActiva" src/
```

### Step 5 — Update `src/test/features/plantillas/pages/MisPlantillasPage.test.tsx`

- Delete the whole `describe("MisPlantillasPage")` block asserting `/todavía no está disponible/i`.
- Delete the stale comment block at lines 9-13.
- Change the import to just `{ MisPlantillasPage }` and rename the remaining `describe` and its render calls.

### Step 6 — Update `src/test/shell/Sidebar.test.tsx`

The suite already asserts no `"pronto"` badge for presupuesto/cronograma/insumos. Add the same assertion for the plantillas entry, mirroring the existing pattern:

```typescript
expect(within(filaPlantillas).queryByText("pronto")).not.toBeInTheDocument();
```

### Step 7 — Verify the MSW handlers and fixture match the real shapes

`src/test/handlers.ts` already stubs all four `/plantillas-apu` routes (lines 272-309). Confirm:

- ids are **UUID strings**, not numbers
- the list handler honours `?tipo=PERSONAL` (the page calls `usePlantillas("PERSONAL")`)
- `plantillaDetalleFixture` in `src/test/fixtures/apu.ts` has a string `id` and a `snapshotSecciones`

Fix any that are numeric.

### Step 8 — Verify

```bash
npm run typecheck   # zero errors
npx vitest run     # all green
npm run lint       # clean
```

## Seams under test

TDD at the page seam, against MSW — not against the hooks directly.

| File | Covers |
|---|---|
| `src/test/features/plantillas/pages/MisPlantillasPage.test.tsx` | list, rename (inline edit → `PUT`), delete (confirm → `DELETE`), preview dialog (`GET /plantillas-apu/{id}`), empty state |
| `src/test/shell/Sidebar.test.tsx` | the plantillas entry is no longer badged "pronto" |
| `src/test/features/apu-editor/components/DialogoGuardarPlantilla.test.tsx` | `POST /apus/{uuid}/guardar-plantilla` still passes with a string id |

The existing suite only covers list + table headers. Add red-first tests for **rename** and **delete** before touching them — both are wired to real mutations now and neither is currently asserted.

## Out of scope

- Creating plantillas from this page — they are created from the APU editor (`guardar-plantilla`), which already works.
- `tipo: "SISTEMA"` plantillas — those live in the admin module (plan 050).
- The `advertencias` field on `PlantillaApuDetalleResponse` — surfaced when applying a plantilla, not when previewing it.

## Escape hatches

- If `PUT /plantillas-apu/{id}` rejects a partial body (only `nombre`), send both fields with the current `descripcionRubro` value preserved.
- If the list endpoint returns a paginated `Page<T>` rather than a bare array, adjust `usePlantillas` to unwrap `.contenido` — the response interceptor in `src/api/client.ts` normalises `{items,total}` → `{contenido,totalElementos}`.

## Maintenance notes

`usePlantillas` keys off `qk.plantillas({tipo})` while the mutations invalidate the raw literal `["plantillas-apu"]`. That works because the key factory returns `["plantillas-apu", filtros]` and invalidation matches by prefix — but if the factory ever changes shape, the mutations go stale silently. Prefer `qk.plantillas()` in the `invalidateQueries` calls while you are in the file.
