# Plan 032 — APU row reordering (N04 §A3)

**Status:** TODO
**Written against:** `7d6223c`
**Spec source:** `07-api-contract.md` line 135 — `PATCH /apus/{id}/detalles/{did}` with `orden` field; N04 §A3
**Depends on:** Plan 030 (removes `esAuxiliar` from `FilaEditor`)
**Effort:** S-M (2-4 hours)
**Risk:** LOW — additive UI, backend handles atomic reorder

## Why

The spec (N04 §A3) requires that rows within an APU section be reorderable. The backend already supports `orden` in `ApuDetallePatchRequest` — sending `{ orden: N }` atomically moves the row to position N within its section. The frontend currently renders rows in whatever order the server returns them, with no UI to change order. The `orden` field exists on `ApuDetalleResponse` but is never consumed for sorting or mutation.

## What changes

1. **Add `orden` field** to `ApuDetallePatchRequest` in `contract.ts` (done in plan 030 step 1).
2. **Sort rows by `detalle.orden`** in `useApuEditor.ts` when building `FilaEditor[]`.
3. **Add up/down arrow buttons** to `FilaDetalle.tsx` for reordering.
4. **Add `reordenarFila` mutation** to `useApuEditor.ts`.
5. **Pass reorder handler** through `GridSeccion` to `FilaDetalle`.

## Steps

### Step 1 — Ensure `orden` is on `ApuDetallePatchRequest`

If plan 030 already executed, this is done. Otherwise add to `contract.ts`:

```typescript
export interface ApuDetallePatchRequest {
  cantidad?: Decimal;
  rendimiento?: Decimal;
  precioOverride?: Decimal | null;
  orden?: number;
}
```

### Step 2 — Sort rows by `orden` in `useApuEditor.ts`

In the `secciones` useMemo (around line 87-107), after building the `filas` array from `s?.detalles ?? []`, sort by `detalle.orden`:

```typescript
// Current (line ~98):
const filas: FilaEditor[] = (s?.detalles ?? []).map((d) => ({
  detalle: d,
  protegida: d.esHerramientaMenor,
  heredado: d.precioHeredado,
  estado: estadosCelda.get(d.id) ?? "estable",
}));

// Change to:
const filas: FilaEditor[] = (s?.detalles ?? [])
  .toSorted((a, b) => a.orden - b.orden)
  .map((d) => ({
    detalle: d,
    protegida: d.esHerramientaMenor,
    heredado: d.precioHeredado,
    estado: estadosCelda.get(d.id) ?? "estable",
  }));
```

Use `toSorted` (non-mutating) since the source array comes from TanStack Query's cache.

### Step 3 — Add `reordenarFila` to `useApuEditor.ts`

Add to the `UseApuEditor` interface:

```typescript
reordenarFila(detalleId: number, nuevoOrden: number): Promise<void>;
```

Implement with the existing `detalleMutation` pattern:

```typescript
const reordenarFila = useCallback(
  async (detalleId: number, nuevoOrden: number) => {
    await patch<ApuResponse>(`/apus/${apuId}/detalles/${detalleId}`, { orden: nuevoOrden });
    queryClient.invalidateQueries({ queryKey: qk.apuDetalle(Number(apuId)) });
  },
  [apuId, queryClient],
);
```

Add `reordenarFila` to the returned object.

### Step 4 — Thread `onReordenarFila` through `GridSeccion`

In `GridSeccion.tsx`, add to the props interface:

```typescript
onReordenarFila: (detalleId: number, nuevoOrden: number) => Promise<void>;
```

Pass it down to each `<FilaDetalle>`.

### Step 5 — Add up/down buttons to `FilaDetalle.tsx`

In `FilaDetalle.tsx`, add props:

```typescript
onReordenarFila: (detalleId: number, nuevoOrden: number) => Promise<void>;
indice: number;      // 0-based index in the rendered list
totalFilas: number;  // total rows in the section
```

In the actions column (last `<td>`), add up/down buttons next to the delete button:

```tsx
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

// In the actions cell, for non-protegida rows:
{!protegida && (
  <div className="flex items-center">
    <Button
      variant="ghost"
      size="icon-xs"
      disabled={indice === 0}
      onClick={() => onReordenarFila(detalle.id, detalle.orden - 1)}
      aria-label="Mover arriba"
    >
      <ArrowUpIcon className="size-3" />
    </Button>
    <Button
      variant="ghost"
      size="icon-xs"
      disabled={indice === totalFilas - 1}
      onClick={() => onReordenarFila(detalle.id, detalle.orden + 1)}
      aria-label="Mover abajo"
    >
      <ArrowDownIcon className="size-3" />
    </Button>
    <Button variant="ghost" size="icon-xs" onClick={() => onEliminarFila(detalle.id)}>
      <Trash2Icon className="size-3" />
    </Button>
  </div>
)}
```

For HM rows (protegida): the backend allows `orden` on HM rows (the only accepted field). If we want HM to stay at the top always, skip the buttons for protegida rows. Check spec: "HM acepta solo `orden`" means it CAN be reordered. Add the arrow buttons for protegida rows too, but without the delete button.

### Step 6 — Update `GridSeccion.tsx` to pass index and total

```tsx
{seccion.filas.map((fila, i) => (
  <FilaDetalle
    key={fila.detalle.id}
    fila={fila}
    indice={i}
    totalFilas={seccion.filas.length}
    muestraRendimiento={seccion.muestraRendimiento}
    onEditarCelda={onEditarCelda}
    onRestaurarHerencia={onRestaurarHerencia}
    onEliminarFila={onEliminarFila}
    onReordenarFila={onReordenarFila}
  />
))}
```

### Step 7 — Update `EditorApuPage.tsx`

Destructure `reordenarFila` from `useApuEditor` and pass it to each `<GridSeccion>`:

```tsx
<GridSeccion
  seccion={s}
  onEditarCelda={editarCelda}
  onRestaurarHerencia={restaurarHerencia}
  onEliminarFila={eliminarFila}
  onReordenarFila={reordenarFila}
/>
```

### Step 8 — Verify

```bash
pnpm run typecheck   # zero errors
pnpm run test        # all tests pass
pnpm run lint        # clean
```

## Out of scope

- Drag-and-drop reordering — arrows are simpler and sufficient for thesis scope.
- Section-level reorder — sections have a hardcoded order in `ORDEN_SECCIONES` which matches the spec.

## Escape hatches

- If the backend `orden` PATCH returns 400 for HM rows with only `orden`, skip arrow buttons on protegida rows.
- If `toSorted` isn't available (it is in all modern engines and our target), use `[...arr].sort()`.

## Maintenance notes

The `orden` values are 1-based (server contract). The backend handles the atomic shift of surrounding rows. The frontend only needs to send the destination order and re-fetch.
