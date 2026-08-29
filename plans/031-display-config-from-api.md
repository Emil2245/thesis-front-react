# Plan 031 — Display config from API (`GET /api/v1/config/display`)

**Status:** TODO
**Written against:** `7d6223c`
**Spec source:** `thesis-docs/CLAUDE.md` — Motor de calculo display section; backend commit `417f9bd`
**Effort:** S (< 2 hours)
**Risk:** LOW — additive; existing hardcoded defaults serve as fallback

## Why

The backend exposes `GET /api/v1/config/display` returning `{precisionDinero: int, precisionPorcentaje: int}` (defaults 2 and 4 respectively, configurable via `app.display.precision` / `app.display.precision-porcentaje`). The frontend currently hardcodes `dp=2` in `Moneda`, `dp=2` in `Porcentaje`, and `min=2, max=4` in `Numero`. When the admin changes precision, the UI ignores it. Additionally, `FilaCapitulo.tsx` uses a raw `.toFixed(2)` that bypasses the central formatters.

## What changes

1. **Add `DisplayConfigResponse` type** to `contract.ts`.
2. **Add a `useDisplayConfig` hook** that fetches `GET /config/display` once (stale time = infinity, since it rarely changes).
3. **Create a `DisplayConfigContext`** provider so any component can read precision without prop-drilling.
4. **Update `Moneda`, `Porcentaje`, `Numero`** to read defaults from context when no explicit `dp`/`min`/`max` prop is given.
5. **Fix `FilaCapitulo.tsx`** to use `<Moneda>` instead of `.toFixed(2)`.
6. **Mount the provider** in the app root (inside the auth boundary, so the fetch is only made when logged in).

## Steps

### Step 1 — Add type to `src/api/contract.ts`

After the `LogActividadResponse` block, add:

```typescript
// ————— Display config —————
export interface DisplayConfigResponse {
  precisionDinero: number;
  precisionPorcentaje: number;
}
```

### Step 2 — Add query key to `src/api/queryKeys.ts`

Add to the `qk` object:

```typescript
displayConfig: () => ["display-config"] as const,
```

### Step 3 — Create `src/hooks/useDisplayConfig.ts`

```typescript
import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { DisplayConfigResponse } from "@/api/contract";

const DEFAULTS: DisplayConfigResponse = { precisionDinero: 2, precisionPorcentaje: 4 };

export function useDisplayConfig() {
  return useQuery({
    queryKey: qk.displayConfig(),
    queryFn: () => get<DisplayConfigResponse>("/config/display"),
    staleTime: Infinity,
    placeholderData: DEFAULTS,
  });
}
```

### Step 4 — Create `src/contexts/DisplayConfigContext.tsx`

A thin context that provides the config. Uses `useDisplayConfig` internally. Fallback to hardcoded defaults if the fetch fails or is pending.

```typescript
import { createContext, useContext } from "react";
import type { DisplayConfigResponse } from "@/api/contract";
import { useDisplayConfig } from "@/hooks/useDisplayConfig";

const DEFAULTS: DisplayConfigResponse = { precisionDinero: 2, precisionPorcentaje: 4 };
const Ctx = createContext<DisplayConfigResponse>(DEFAULTS);

export function DisplayConfigProvider({ children }: { children: React.ReactNode }) {
  const { data } = useDisplayConfig();
  return <Ctx value={data ?? DEFAULTS}>{children}</Ctx>;
}

export function useDisplayPrecision() {
  return useContext(Ctx);
}
```

### Step 5 — Update `src/components/comunes/Moneda.tsx`

Import `useDisplayPrecision`. Change the default `dp` from hardcoded `2` to `undefined`, and inside the component resolve it:

```typescript
import { useDisplayPrecision } from "@/contexts/DisplayConfigContext";

export function Moneda({ valor, dp, className }: {
  valor: Decimal | number | null | undefined;
  dp?: number;
  className?: string;
}) {
  const { precisionDinero } = useDisplayPrecision();
  return <span className={cn("num", className)}>{formatearMoneda(valor, dp ?? precisionDinero)}</span>;
}
```

### Step 6 — Update `src/components/comunes/Porcentaje.tsx`

Same pattern:

```typescript
import { useDisplayPrecision } from "@/contexts/DisplayConfigContext";

export function Porcentaje({ valor, dp, className }: { ... }) {
  const { precisionPorcentaje } = useDisplayPrecision();
  return <span className={cn("num", className)}>{formatearPorcentaje(valor, dp ?? precisionPorcentaje)}</span>;
}
```

### Step 7 — Update `src/components/comunes/Numero.tsx`

Use `precisionDinero` as `min` fallback:

```typescript
const { precisionDinero } = useDisplayPrecision();
// min defaults to precisionDinero, max defaults to precisionDinero + 2
```

### Step 8 — Fix `src/features/presupuesto/components/FilaCapitulo.tsx`

Replace `Number(capitulo.total).toFixed(2)` with `<Moneda valor={capitulo.total} />` or `formatearMoneda(capitulo.total)`.

### Step 9 — Mount provider

In `src/App.tsx` (or the authenticated layout wrapper), wrap the app content with `<DisplayConfigProvider>`.

### Step 10 — Add MSW handler for tests

In `src/test/handlers.ts`, add:

```typescript
http.get("*/config/display", () => HttpResponse.json({ precisionDinero: 2, precisionPorcentaje: 4 })),
```

### Step 11 — Verify

```bash
pnpm run typecheck   # zero errors
pnpm run test        # all tests pass
pnpm run lint        # clean
```

## Out of scope

- Admin UI for editing display precision — that's admin panel work.
- Changing the formatting functions in `decimal.ts` themselves — they already accept `dp` parameters.
- Display config for Excel/PDF exports — backend handles that.

## Escape hatches

- If `GET /config/display` is not yet deployed, the `placeholderData` and context defaults ensure the UI works identically to today.
- If a component can't use hooks (rare edge case), keep its explicit `dp` prop.

## Maintenance notes

When new display precision settings are added (e.g. `precisionNumero`), extend `DisplayConfigResponse` and the context. The Moneda/Porcentaje components are the single point where precision applies.
