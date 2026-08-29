# Plan 030 — Remove `esAuxiliar` / no-links between APUs (N04 §2 / v1.3 §2.5.6)

**Status:** TODO
**Written against:** `7d6223c`
**Spec source:** `thesis-docs` commit `29a9237` — v1.3 §2.5.6, `03-procesos-detalle.md` P-25 SUPERSEDED, `07-api-contract.md` updated DTOs
**Processes:** P-19, P-20, P-21, P-22, P-25 (superseded)
**Effort:** S (< 2 hours)
**Risk:** LOW — pure deletion + type narrowing; no new behavior

## Why

N04 §2 (18-08-2026) eliminated the concept of "auxiliary APUs" that reference other APUs. The rule is: **no links between APUs exist**. The backend has already removed `es_auxiliar` and `apu_auxiliar_id` columns. The frontend still references these fields in types, DTOs, components, fixtures, and tests. Sending `esAuxiliar` or `apuAuxiliarId` to the backend will cause validation errors or be silently ignored; the UI exposes a "Rubro auxiliar" toggle and badge that no longer mean anything.

## What changes

1. **Delete the `BadgeAuxiliar` component** — it renders nothing useful (the field is always `false` from the backend).
2. **Remove all `esAuxiliar` and `apuAuxiliarId` fields** from DTOs in `contract.ts`.
3. **Remove the auxiliar toggle and conflict dialog** from `EncabezadoApu.tsx`.
4. **Remove `alternarAuxiliar`** from `useApuEditor.ts` and its call site in `EditorApuPage.tsx`.
5. **Clean up fixtures** — remove `esAuxiliar` and `apuAuxiliarId` from `src/test/fixtures/apu.ts`.
6. **Update all tests** that reference these fields.

## Steps

### Step 1 — Update `src/api/contract.ts`

Remove `esAuxiliar` from:
- `ApuResponse` (line ~298): delete `esAuxiliar: boolean;`
- `ApuResumenResponse` (line ~318): delete `esAuxiliar: boolean;`
- `ApuCrearRequest` (line ~329): delete `esAuxiliar?: boolean;`
- `ApuPatchRequest` (line ~336): delete `esAuxiliar?: boolean;`

Remove `apuAuxiliarId` from:
- `ApuDetalleResponse` (line ~283): delete `apuAuxiliarId?: number | null;`
- `ApuDetalleCrearRequest` (line ~341): delete `apuAuxiliarId?: number;`

Add `orden` to `ApuDetallePatchRequest` (prepare for plan 032):
```typescript
export interface ApuDetallePatchRequest {
  cantidad?: Decimal;
  rendimiento?: Decimal;
  precioOverride?: Decimal | null;
  orden?: number;
}
```

**Verify:** `pnpm run typecheck` — expect errors in files that still reference deleted fields. Fix those files in subsequent steps.

### Step 2 — Delete `src/features/apu-editor/components/BadgeAuxiliar.tsx`

Delete the entire file. It only has one export used in `EncabezadoApu.tsx`.

### Step 3 — Clean `src/features/apu-editor/components/EncabezadoApu.tsx`

Current file at `7d6223c`:

**Remove these imports:**
```typescript
import { BadgeAuxiliar } from "./BadgeAuxiliar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
```

**Remove from props interface:**
```typescript
// DELETE this line:
onAlternarAuxiliar?: (esAuxiliar: boolean) => Promise<void>;
```

**Remove from destructured props:**
```typescript
// Change from:
export function EncabezadoApu({ apu, onEditar, onAlternarAuxiliar }: EncabezadoApuProps) {
// To:
export function EncabezadoApu({ apu, onEditar }: EncabezadoApuProps) {
```

**Delete entirely:**
- The `conflictoAbierto` and `usos` state variables (lines ~33-34)
- The `manejarToggleAuxiliar` callback (lines ~52-63)
- The `insignia` prop in `<EncabezadoPagina>` (line ~109): `insignia={<BadgeAuxiliar esAuxiliar={apu.esAuxiliar} />}`
- The Switch + Label block in `meta` (lines ~116-125)
- The entire `<AlertDialog>` block (lines ~135-157)

Only keep the `AlertDialog` import set if something else in the file uses it — in this case, nothing does after removing the auxiliar conflict dialog.

### Step 4 — Clean `src/features/apu-editor/hooks/useApuEditor.ts`

Remove the `alternarAuxiliar` function and its export. Current code has:
```typescript
alternarAuxiliar: async (esAuxiliar: boolean) => {
  await patchApu({ esAuxiliar });
},
```
Delete this function and remove it from the returned object.

### Step 5 — Clean `src/features/apu-editor/pages/EditorApuPage.tsx`

Remove `alternarAuxiliar` from the destructured return of `useApuEditor`:
```typescript
// Change from:
const { apu, secciones, cargando, editarCelda, restaurarHerencia, eliminarFila,
        editarEncabezado, editarPorcentajeCi, aplicarDescuento, alternarAuxiliar } = useApuEditor(…);
// To:
const { apu, secciones, cargando, editarCelda, restaurarHerencia, eliminarFila,
        editarEncabezado, editarPorcentajeCi, aplicarDescuento } = useApuEditor(…);
```

Remove `onAlternarAuxiliar={alternarAuxiliar}` from the `<EncabezadoApu>` JSX.

### Step 6 — Clean fixtures

**`src/test/fixtures/apu.ts`**: Remove all `esAuxiliar` and `apuAuxiliarId` fields from:
- `apuResumenFixture` (4 items, remove `esAuxiliar` from each)
- `apuDetalleFixture` (remove `esAuxiliar` from root, `apuAuxiliarId` from every detail)
- `apuConHmFixture` (remove `apuAuxiliarId` from every detail)

**`src/test/fixtures/apu.ts` line 1**: Update import — `PlantillaApuDetalleResponse` stays for now.

### Step 7 — Fix any remaining references

Grep for `esAuxiliar`, `apuAuxiliarId`, `auxiliar`, `BadgeAuxiliar`, `soloAuxiliares`, `alternarAuxiliar` across all `src/**/*.{ts,tsx}` files. Fix or remove every hit. Expected locations:
- `src/features/apu-editor/pages/ListaApusPage.tsx` — may have a filter or column for auxiliar
- `src/test/handlers.ts` — the `soloAuxiliares` query param in the APU list handler
- Test files that assert on `esAuxiliar` presence

### Step 8 — Verify

```bash
pnpm run typecheck   # zero errors
pnpm run test        # all 197 tests pass
pnpm run lint        # clean
```

## Out of scope

- Adding `orden` UI to `GridSeccion` — that's plan 032.
- Changing plantilla types — that's plan 034.
- Any backend changes.

## Escape hatches

- If `pnpm run typecheck` reveals references in files not listed here, fix them following the same pattern (delete the field/prop).
- If a test explicitly asserts `esAuxiliar: false`, just remove that assertion.

## Maintenance notes

This plan makes the frontend match the v1.3 spec. If a future version re-introduces APU links, the types and UI would need to be re-added — but that's explicitly ruled out by the thesis scope.
