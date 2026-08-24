# Plan 018: Parámetros de proyecto con valores numéricos reales del backend

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3514822..HEAD -- src/api/contract.ts src/features/proyectos/hooks/useParametros.ts src/features/proyectos/pages/ParametrosPage.tsx src/features/proyectos/schemas.ts src/test/fixtures/proyectos.ts`
> On mismatch with the excerpts below, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: ninguno técnico; ejecutar en serie con 016 (ambos tocan `schemas.ts`, `contract.ts`, `fixtures/proyectos.ts`)
- **Category**: tech-debt
- **Planned at**: commit `3514822`, 2026-08-24

## Why this matters

El backend serializa los porcentajes de parámetros como **números JSON** (`iva: 0.15`, `porcentajeHerramientaMenor: 0.05` — verificado en `api/bruno/06-proyecto/TC-06-05-parametros-proyecto.bru` y `TC-06-06-actualizar-parametros.bru`), pero el front los tipa como strings `Decimal`. La página funciona *de casualidad* (los formateadores hacen `Number()` interno y Jackson coersea strings al guardar), pero el sistema de tipos miente, `esCero()` crashearía con un número, y cualquier futuro consumo de estos campos puede romper. Este plan hace honestos los tipos y el PUT envía números como el Bruno collection.

**Desviación consciente**: igual que en el plan 017, la convención "Decimal strings" de `AGENTS.md` cede ante el contrato real del backend para estos campos.

## Current state

### Contrato verificado del backend

```
GET /proyectos/{id}/parametros
→ 200 { iva: 0.15, modoCodigoRubro: "AUTOGENERADO",
        porcentajeHerramientaMenor: 0.05, ... }          # números

PUT /proyectos/{id}/parametros
{ "porcentajeHerramientaMenor": 0.07, "porcentajeIndirecto": 0.20,
  "iva": 0.15, "moneda": "USD" }                          # números
→ 200 ParametrosProyectoResponse
```

Forma completa de `ParametrosProyectoResponse` según el recurso Quarkus: `{ proyectoId, porcentajeHerramientaMenor: number, porcentajeIndirecto: number|null, iva: number, moneda: string, mostrarSeccionesVacias, sufijosSeccionActivos, mostrarSubtotalesSeccion, mostrarSubtotalesPie, mostrarNombreProyectoHeader, enumerarApus, mensajeFooter: string|null, modoCodigoRubro: "AUTOGENERADO"|"MANUAL" }`.

### Archivos del front a cambiar

- `src/api/contract.ts:151-172`:

```ts
export interface ParametrosProyectoResponse {
  porcentajeHerramientaMenor: Decimal;
  porcentajeIndirecto?: Decimal | null;
  iva: Decimal;
  moneda: string;
  mostrarSeccionesVacias: boolean;
  sufijosSeccionActivos: boolean;
  mostrarSubtotalesSeccion: boolean;
  mostrarSubtotalesPie: boolean;
  mostrarNombreProyectoHeader: true;   // ← ojo: literal, debe ser boolean
  enumerarApus: false;                 // ← ídem
  mensajeFooter: "";
  modoCodigoRubro: "AUTOGENERADO";
}
```

(y `ParametrosProyectoActualizarRequest` junto a él). Los literales `true`/`false`/`""`/`"AUTOGENERADO"` son un error de transcripción: deben ser `boolean`/`string`/union.

- `src/features/proyectos/schemas.ts:29-50` — `parametrosSchema` con `.transform()` que hoy devuelve **strings fracción** (`String((v.porcentajeHerramientaMenor / 100).toFixed(6))`) enviados por PUT.
- `src/features/proyectos/pages/ParametrosPage.tsx:50-56` — mapea `Number(params.x) * 100` para los inputs (funciona igual con números; no requiere cambios funcionales).
- `src/features/proyectos/hooks/useParametros.ts` — GET/PUT tipados con esos DTOs.
- `src/test/fixtures/proyectos.ts:44-57` — `parametrosFixture` con `"0.050000" as never`.

Nota: `DialogoNuevoApu.tsx:46` también consume `useParametros`; verifica que tras el cambio de tipos no quede roto (usa los mismos nombres de campo).

Convenciones: ver `AGENTS.md` (pnpm, español, MSW estricto, sin comentarios).

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `pnpm run typecheck` | exit 0              |
| Tests     | `pnpm run test -- src/features/proyectos` | all pass |
| Full gate | `pnpm run verify`    | exit 0              |

## Scope

**In scope**:
- `src/api/contract.ts` (solo interfaces Parametros*)
- `src/features/proyectos/schemas.ts` (solo `parametrosSchema`)
- `src/features/proyectos/hooks/useParametros.ts`
- `src/features/proyectos/pages/ParametrosPage.tsx` (solo si el typecheck lo exige)
- `src/test/fixtures/proyectos.ts` (solo `parametrosFixture`)
- `plans/README.md`

**Out of scope**:
- `src/api/contract.ts` líneas 577+ (`ParametrosSistemaResponse` — panel admin sin backend).
- Cualquier cosa del editor APU (`PieTotales`, `useApuEditor` usan Decimals string de OTROS DTOs que sí llegan como… todavía desconocido contra back real; no tocar aquí).

## Git workflow

Rama actual; un commit: `fix: use numeric percentages for project parameters API`.

## Steps

### Step 1: Contratos numéricos

En `src/api/contract.ts` reescribe ambas interfaces:

```ts
export interface ParametrosProyectoResponse {
  proyectoId?: number;
  porcentajeHerramientaMenor: number;
  porcentajeIndirecto?: number | null;
  iva: number;
  moneda: string;
  mostrarSeccionesVacias: boolean;
  sufijosSeccionActivos: boolean;
  mostrarSubtotalesSeccion: boolean;
  mostrarSubtotalesPie: boolean;
  mostrarNombreProyectoHeader: boolean;
  enumerarApus: boolean;
  mensajeFooter?: string | null;
  modoCodigoRubro: "AUTOGENERADO" | "MANUAL";
}

export interface ParametrosProyectoActualizarRequest {
  porcentajeHerramientaMenor: number;
  porcentajeIndirecto?: number | null;
  iva: number;
  moneda: string;
}
```

(Si `ParametrosProyectoActualizarRequest` tiene hoy otros campos opcionales de presentación, elimínalos: el PUT del backend solo acepta esos cuatro.)

**Verify**: `pnpm run typecheck` → errores solo en `schemas.ts` / fixtures.

### Step 2: Transform numérico en `parametrosSchema`

Reemplaza el `.transform(...)` de `src/features/proyectos/schemas.ts:44-50` para devolver fracciones numéricas:

```ts
.transform((v) => ({
  ...v,
  porcentajeHerramientaMenor: Number((v.porcentajeHerramientaMenor / 100).toFixed(6)),
  porcentajeIndirecto:
    v.porcentajeIndirecto != null ? Number((v.porcentajeIndirecto / 100).toFixed(6)) : null,
  iva: Number((v.iva / 100).toFixed(6)),
}));
```

**Verify**: `pnpm run typecheck` → exit 0 (ajusta `ParametrosPage.tsx` solo si algún cast `as never` ya no compila; el mapeo `Number(params.x) * 100` es válido tal cual con números).

### Step 3: Fixture a números

`src/test/fixtures/proyectos.ts` → `parametrosFixture`: `porcentajeHerramientaMenor: 0.05, porcentajeIndirecto: 0.15, iva: 0.12` (sin `as never`), resto igual.

**Verify**: `pnpm run test -- src/features/proyectos` → all pass (incluye `ParametrosPage.test.tsx` y `AsistenteCrearProyecto.test.tsx` si usa el fixture).

### Step 4: Verificación completa

**Verify**: `pnpm run verify` → exit 0.

## Test plan

- En `ParametrosPage.test.tsx` añade (si no existe) un caso que capture el body del PUT con handler `await request.json()` y aserte `{ porcentajeHerramientaMenor: 0.07 }` **numérico** al guardar "% Herramienta menor = 7".
- Caso de render: con fixture numérico `0.05`, el input muestra `5`.
- Patrón: tests existentes de esa página.

## Done criteria

- [ ] `grep -n "as never" src/test/fixtures/proyectos.ts` → sin resultados en `parametrosFixture`
- [ ] `grep -n "Decimal" src/api/contract.ts | grep -i parametros` → sin resultados
- [ ] `pnpm run verify` → exit 0
- [ ] `git status` → solo archivos in-scope
- [ ] `plans/README.md` fila 018 actualizada

## STOP conditions

- Drift check contradice los excerpts.
- Tras Step 1 aparecen errores de typecheck fuera del Scope (otro consumidor de `ParametrosProyectoResponse` con aritmética de strings) — reporta, no lo parches.
- Un paso falla dos veces.

## Maintenance notes

- Cuando exista `PUT /admin/parametros-sistema`, replicar este patrón numérico en las interfaces `ParametrosSistema*` (hoy muertas).
- Si el front vuelve a necesitar precisión decimal exacta para cálculo local, hacerlo con strings SOLO después de convertir explícitamente — nunca confiando en el tipo del wire.
