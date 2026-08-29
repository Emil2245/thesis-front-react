# Plan 036 — Parametrizable validation ranges (N04 §A6)

**Status:** TODO
**Written against:** `7d6223c`
**Spec source:** `07-api-contract.md` line 104, 232; N04 §A6; backend commit `531f948`
**Effort:** S (2-3 hours)
**Risk:** LOW — schema change, no new UI components

## Why

The frontend hardcodes validation ranges in Zod schemas:
- `porcentajeHerramientaMenor`: `.max(20)` — should come from `rangoHmMax * 100`
- `porcentajeIndirecto`: `.max(100)` — should come from `rangoCiMax * 100`
- `iva`: `.max(30)` — should come from `rangoIvaMax * 100`
- `descuentoSchema.porcentaje`: `.max(50)` — should come from `rangoDescuentoMax * 100`

The backend now stores configurable ranges in `ParametrosSistema` (fields: `rangoHmMin/Max`, `rangoCiMin/Max`, `rangoIvaMin/Max`, `rangoDescuentoMin/Max`). These are exposed via `GET /proyectos/parametros-sistema` which returns the full `ParametrosSistema` entity including range fields. The admin can change these ranges, and the backend validates dynamically. The frontend must match.

## What changes

1. **Add range fields** to `ParametrosSistemaResponse` in `contract.ts`.
2. **Create `useParametrosSistema` hook** to fetch system params (or reuse existing admin hook).
3. **Make `parametrosSchema` and `descuentoSchema` factory functions** that accept ranges.
4. **Update `ParametrosPage.tsx`** labels to show dynamic ranges.
5. **Update `DialogoDescuentoGlobal.tsx`** to use dynamic max.

## Steps

### Step 1 — Update `src/api/contract.ts`

Add range fields to `ParametrosSistemaResponse`:

```typescript
export interface ParametrosSistemaResponse {
  porcentajeHerramientaMenor: Decimal;
  porcentajeIndirecto?: Decimal | null;
  iva: Decimal;
  moneda: string;
  // Dynamic ranges (stored as decimals 0-1):
  rangoHmMin: Decimal;
  rangoHmMax: Decimal;
  rangoCiMin: Decimal;
  rangoCiMax: Decimal;
  rangoDescuentoMin: Decimal;
  rangoDescuentoMax: Decimal;
  rangoIvaMin: Decimal;
  rangoIvaMax: Decimal;
}
```

### Step 2 — Add query key and hook

In `src/api/queryKeys.ts`:

```typescript
parametrosSistema: () => ["parametros-sistema"] as const,
```

Create `src/hooks/useParametrosSistema.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { ParametrosSistemaResponse } from "@/api/contract";

export function useParametrosSistema() {
  return useQuery({
    queryKey: qk.parametrosSistema(),
    queryFn: () => get<ParametrosSistemaResponse>("/proyectos/parametros-sistema"),
    staleTime: 5 * 60 * 1000,
  });
}
```

Note: The endpoint path might be `/admin/parametros-sistema` (admin-only) or there might be a public read. Check: the existing `GET /proyectos/parametros-sistema` in the resource returns `ParametrosSistema` for any authenticated user. If the endpoint is admin-only, we need a lighter endpoint or embed ranges in the project parametros response. **Escape hatch below.**

### Step 3 — Make schemas accept dynamic ranges

Refactor `src/features/proyectos/schemas.ts`:

```typescript
export interface RangosValidacion {
  hmMin: number;  // in % (e.g. 0)
  hmMax: number;  // in % (e.g. 20)
  ciMin: number;
  ciMax: number;
  ivaMin: number;
  ivaMax: number;
  descuentoMax: number;
}

const DEFAULTS: RangosValidacion = {
  hmMin: 0, hmMax: 20,
  ciMin: 0, ciMax: 100,
  ivaMin: 0, ivaMax: 30,
  descuentoMax: 50,
};

export function crearParametrosSchema(rangos: RangosValidacion = DEFAULTS) {
  return z
    .object({
      porcentajeHerramientaMenor: z.number()
        .min(rangos.hmMin, `Mínimo ${rangos.hmMin} %`)
        .max(rangos.hmMax, `Máximo ${rangos.hmMax} %`),
      porcentajeIndirecto: z.number()
        .min(rangos.ciMin, `Mínimo ${rangos.ciMin} %`)
        .max(rangos.ciMax, `Máximo ${rangos.ciMax} %`)
        .nullable(),
      iva: z.number()
        .min(rangos.ivaMin, `Mínimo ${rangos.ivaMin} %`)
        .max(rangos.ivaMax, `Máximo ${rangos.ivaMax} %`),
      moneda: z.string().min(1),
      mostrarSeccionesVacias: z.boolean(),
      sufijosSeccionActivos: z.boolean(),
      mostrarSubtotalesSeccion: z.boolean(),
      mostrarSubtotalesPie: z.boolean(),
      mostrarNombreProyectoHeader: z.boolean(),
      enumerarApus: z.boolean(),
      mensajeFooter: z.string().max(200).optional(),
      modoCodigoRubro: z.enum(["AUTOGENERADO", "MANUAL"]),
    })
    .transform((v) => ({
      ...v,
      porcentajeHerramientaMenor: Number((v.porcentajeHerramientaMenor / 100).toFixed(6)),
      porcentajeIndirecto:
        v.porcentajeIndirecto != null ? Number((v.porcentajeIndirecto / 100).toFixed(6)) : null,
      iva: Number((v.iva / 100).toFixed(6)),
    }));
}

export function crearDescuentoSchema(maxPorcentaje = 50) {
  return z.object({
    porcentaje: z.number().min(0, "Mínimo 0 %").max(maxPorcentaje, `Máximo ${maxPorcentaje} %`),
  });
}

// Keep backwards-compatible exports for tests and code that doesn't have ranges yet:
export const parametrosSchema = crearParametrosSchema();
export const descuentoSchema = crearDescuentoSchema();
```

### Step 4 — Update `ParametrosPage.tsx`

Fetch system params for ranges and pass to schema factory:

```typescript
const { data: sistema } = useParametrosSistema();

const rangos = sistema ? {
  hmMin: Number(sistema.rangoHmMin) * 100,
  hmMax: Number(sistema.rangoHmMax) * 100,
  ciMin: Number(sistema.rangoCiMin) * 100,
  ciMax: Number(sistema.rangoCiMax) * 100,
  ivaMin: Number(sistema.rangoIvaMin) * 100,
  ivaMax: Number(sistema.rangoIvaMax) * 100,
  descuentoMax: Number(sistema.rangoDescuentoMax) * 100,
} : undefined;

const schema = useMemo(() => crearParametrosSchema(rangos), [rangos]);

const form = useForm({
  resolver: zodResolver(schema),
  // ...
});
```

Update labels from hardcoded `"% Herramienta menor (0–20 %)"` to dynamic:

```tsx
<Label>% Herramienta menor ({rangos?.hmMin ?? 0}–{rangos?.hmMax ?? 20} %)</Label>
<Label>% Indirectos ({rangos?.ciMin ?? 0}–{rangos?.ciMax ?? 100} %)</Label>
<Label>IVA ({rangos?.ivaMin ?? 0}–{rangos?.ivaMax ?? 30} %)</Label>
```

### Step 5 — Update `DialogoDescuentoGlobal.tsx`

Fetch the system-level descuento max and pass to `crearDescuentoSchema`:

```typescript
const { data: sistema } = useParametrosSistema();
const maxDesc = sistema ? Number(sistema.rangoDescuentoMax) * 100 : 50;
const schema = useMemo(() => crearDescuentoSchema(maxDesc), [maxDesc]);
```

### Step 6 — Add MSW handler

In `src/test/handlers.ts`:

```typescript
http.get("*/proyectos/parametros-sistema", () =>
  HttpResponse.json({
    porcentajeHerramientaMenor: "0.050000",
    porcentajeIndirecto: "0.180000",
    iva: "0.150000",
    moneda: "USD",
    rangoHmMin: "0.0000", rangoHmMax: "0.2000",
    rangoCiMin: "0.0000", rangoCiMax: "1.0000",
    rangoDescuentoMin: "0.0000", rangoDescuentoMax: "0.5000",
    rangoIvaMin: "0.0000", rangoIvaMax: "0.3000",
  }),
),
```

### Step 7 — Verify

```bash
pnpm run typecheck   # zero errors
pnpm run test        # all tests pass
pnpm run lint        # clean
```

## Out of scope

- Admin UI for editing the ranges themselves — that's the admin parametros panel.
- Per-project range overrides — ranges are global (ParametrosSistema level).

## Escape hatches

- **If `/proyectos/parametros-sistema` is admin-only (403 for regular users):** The backend might need a public endpoint like `GET /config/rangos` or include ranges in the `ParametrosProyectoResponse`. In that case, either: (a) add range fields to `ParametrosProyectoResponse` and read them from the project's own params response, or (b) add a new public config endpoint. For now, check if the existing resource has `@RolesAllowed` — the `GET` method doesn't seem to have it (it's in `ProyectoResource` without role restriction on the GET). If it does 403, fall back to hardcoded defaults (the backwards-compatible exports).
- If `ParametrosSistemaResponse` doesn't include ranges in the JSON (entity fields not exposed), the hook will get `undefined` for range fields and the defaults kick in.

## Maintenance notes

The factory pattern (`crearParametrosSchema`) keeps the schema testable with fixed ranges while allowing runtime configuration. If ranges change shape (e.g., per-project overrides), only the hook and the `rangos` computation need updating.
