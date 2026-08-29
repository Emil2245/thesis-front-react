# Plan 034 — PlantillaAPU type updates (Plan 04 / UUIDv7 / advertencias)

**Status:** TODO
**Written against:** `7d6223c`
**Spec source:** `07-api-contract.md` lines 138, 141-144, 404-415; Plan 04 (backend DONE 2026-08-29)
**Effort:** M (3-5 hours)
**Risk:** LOW — type updates + UI adjustments; backend already deployed

## Why

The backend's Plan 04 (plantilla APU overhaul) is done. Key changes:
1. Plantilla IDs are now **UUIDv7 strings**, not numeric.
2. The list endpoint returns `PlantillaApuResumenResponse` (not `PlantillaApuResponse`) with fields: `id` (UUIDv7 string), `nombre`, `tipo`, `descripcionRubro?`, `unidad?`, `createdAt`, `updatedAt`.
3. The detail endpoint returns `PlantillaApuDetalleResponse` with `snapshotSecciones` (opaque JSONB) instead of `snapshot: ApuResponse`.
4. Creating an APU from a template can return **200** (not 201) with `advertencias[]` when some inputs couldn't be resolved against the project's base.
5. `AdvertenciaPlantillaResponse` type: `{ insumoCodigo, motivo, mensaje }`.
6. Pending rows (insumo not found) persist with `insumoId = null` and show as "pendiente" in the UI.
7. `PlantillaApuCrearRequest` now has `descripcionRubro?` instead of just `descripcion?`.

The frontend types are stale — `PlantillaApuResponse.id: number`, `PlantillaApuDetalleResponse.snapshot: ApuResponse`, no advertencias support.

## What changes

1. **Update `PlantillaApuResponse`** → rename to `PlantillaApuResumenResponse`, change `id` to string, add `descripcionRubro`, `unidad`, `createdAt`, `updatedAt`.
2. **Update `PlantillaApuDetalleResponse`** → extend `PlantillaApuResumenResponse`, replace `snapshot: ApuResponse` with `snapshotSecciones: unknown`, add `advertencias?`.
3. **Add `AdvertenciaPlantillaResponse`** type.
4. **Add `advertencias?` to `ApuResponse`** (returned when creating from template).
5. **Update `PlantillaApuCrearRequest`** → rename `descripcion` to `descripcionRubro`.
6. **Update `usePlantillas.ts`** — all hooks use `PlantillaApuResumenResponse` for list/mutate, string id.
7. **Update `DialogoNuevoApu.tsx`** — handle 200-with-advertencias on APU creation from template; show warnings.
8. **Update `DialogoGuardarPlantilla.tsx`** — use `descripcionRubro` field name.
9. **Update `MisPlantillasPage.tsx`** — string id in table key and API calls.
10. **Handle pending rows** in `FilaDetalle.tsx` — show visual indicator when `insumoId` is null.

## Steps

### Step 1 — Update types in `src/api/contract.ts`

Replace existing plantilla types:

```typescript
// DELETE PlantillaApuResponse and replace with:
export interface PlantillaApuResumenResponse {
  id: string;  // UUIDv7
  nombre: string;
  descripcionRubro?: string;
  unidad?: string;
  tipo: "SISTEMA" | "PERSONAL";
  createdAt: string;
  updatedAt: string;
}

// UPDATE PlantillaApuDetalleResponse:
export interface PlantillaApuDetalleResponse extends PlantillaApuResumenResponse {
  snapshotSecciones: unknown;
  advertencias?: AdvertenciaPlantillaResponse[];
}

// ADD:
export interface AdvertenciaPlantillaResponse {
  insumoCodigo: string;
  motivo: string;
  mensaje: string;
}

// UPDATE PlantillaApuCrearRequest:
export interface PlantillaApuCrearRequest {
  nombre: string;
  descripcionRubro?: string;
}

// UPDATE ApuCrearRequest — plantillaId is now a string (UUIDv7):
export interface ApuCrearRequest {
  codigo: string;
  descripcion: string;
  unidad: string;
  plantillaId?: string;
}

// ADD to ApuResponse:
export interface ApuResponse {
  // ... existing fields ...
  advertencias?: AdvertenciaPlantillaResponse[];
}

// KEEP PlantillaApuEditarRequest as is but confirm field name:
export interface PlantillaApuEditarRequest {
  nombre?: string;
  descripcionRubro?: string;
}

// DELETE PlantillaSistemaCrearRequest (admin-only, out of scope for now)
```

### Step 2 — Update `src/features/apu-editor/hooks/usePlantillas.ts`

Change all type references from `PlantillaApuResponse` to `PlantillaApuResumenResponse`. The `usePlantillaDetalle` hook's `enabled` check changes from `id > 0` to `!!id` (string, not number):

```typescript
export function usePlantillaDetalle(id: string | null) {
  return useQuery({
    queryKey: qk.plantillaDetalle(id),
    queryFn: () => get<PlantillaApuDetalleResponse>(`/plantillas-apu/${id}`),
    enabled: !!id,
  });
}
```

Update `useGuardarPlantilla` return type to `PlantillaApuResumenResponse`.
Update `useRenombrarPlantilla` return type to `PlantillaApuResumenResponse`.

### Step 3 — Update `src/features/apu-editor/components/DialogoNuevoApu.tsx`

The creation response can be 200 (with advertencias) or 201 (clean). Both return `ApuResponse`. Handle advertencias:

After the `onCreate` call returns:
```typescript
const resultado = await crearApu.mutateAsync(req);
if (resultado.advertencias?.length) {
  // Show a toast or inline alert with the warnings
  toast.warning(`APU creado con ${resultado.advertencias.length} advertencia(s)`, {
    description: resultado.advertencias.map(a => a.mensaje).join("; "),
  });
}
```

Change `plantillaId` state from `number | null` to `string | null`.

The `useEffect` that auto-fills from template detail needs to adapt — `PlantillaApuDetalleResponse` no longer has `snapshot.descripcion` / `snapshot.unidad`. Instead use `descripcionRubro` and `unidad` from the resumen fields directly:

```typescript
useEffect(() => {
  if (plantillaDetalle.data) {
    setDescripcion(plantillaDetalle.data.descripcionRubro ?? "");
    setUnidad(plantillaDetalle.data.unidad ?? "");
  }
}, [plantillaDetalle.data]);
```

### Step 4 — Update `DialogoGuardarPlantilla.tsx`

Change field name from `descripcion` to `descripcionRubro` in the POST body:

```typescript
await post(`/apus/${apuId}/guardar-plantilla`, { nombre, descripcionRubro: descripcion });
```

### Step 5 — Update `MisPlantillasPageActiva`

Change `PlantillaApuResponse` to `PlantillaApuResumenResponse` throughout. Use `p.id` (string) as React key — already works. The rename/delete hooks already use `id` parameter — just ensure the URL path uses the string id correctly.

### Step 6 — Handle pending rows in `FilaDetalle.tsx`

When `detalle.insumoId === null` and the row is not HM (not protegida), show a warning badge:

```tsx
{detalle.insumoId === null && !protegida && (
  <Badge variant="outline" className="text-amber-600 border-amber-300">Pendiente</Badge>
)}
```

This indicates the row was created from a template but the input wasn't found in the project's base.

### Step 7 — Update fixtures

In `src/test/fixtures/apu.ts`, update `plantillaDetalleFixture` to use string id and new shape:

```typescript
export const plantillaResumenFixture: PlantillaApuResumenResponse = {
  id: "019185a6-2b3a-7000-8000-000000000001",
  nombre: "Plantilla hormigón simple",
  tipo: "PERSONAL",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};
```

### Step 8 — Verify

```bash
pnpm run typecheck   # zero errors
pnpm run test        # all tests pass
pnpm run lint        # clean
```

## Out of scope

- Admin plantilla management (SISTEMA type) — separate admin feature.
- Rendering the `snapshotSecciones` JSONB in the preview dialog — keep the existing preview but adapt to the new opaque shape or simplify to show metadata only.

## Escape hatches

- If the backend hasn't deployed Plan 04 yet, the old endpoints will still return numeric ids and `snapshot` — but the user's instructions say to assume endpoints are done.
- If `snapshotSecciones` structure is needed for preview, read it as `Record<string, unknown>` and render what's available.

## Maintenance notes

The `PlantillaApuResumenResponse` → `PlantillaApuDetalleResponse` inheritance means the detail type has all list fields plus the snapshot. Future fields added to the resumen type automatically appear in the detail.
