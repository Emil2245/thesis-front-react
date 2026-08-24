# Plan 017: Alinear el módulo de insumos con los endpoints reales del backend

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3514822..HEAD -- src/api/contract.ts src/features/insumos src/features/apu-editor/hooks/useBusquedaParaApu.ts src/lib/decimal.ts src/test/handlers.ts src/test/fixtures/insumos.ts`
> If any in-scope file changed since `3514822`, compare the "Current state"
> excerpts against the live code; on mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED (toca tipos compartidos de dinero; se mitigará ampliando firmas, no rompiéndolas)
- **Depends on**: none técnico; ejecutar en serie con 016/018 porque todos editan `src/test/handlers.ts` y `src/api/contract.ts`
- **Category**: bug
- **Planned at**: commit `3514822`, 2026-08-24

## Why this matters

El módulo de insumos del front quedó escrito contra un contrato hipotético: campo `precio` (string Decimal) cuando el backend envía `precioUnitario` (número JSON), búsqueda en `/insumos/busqueda` cuando el backend expone `/insumos/selector`, importación en `/insumos/import?soloValidar=` cuando el backend solo tiene `POST /insumos/importar` (multipart, sin modo dry-run), copia en `/insumos/copiar-base` cuando el backend es `/insumos/copiar` con `{fuenteTipo}`, y bases centrales con `totalInsumos` (no `insumoCount`) sin endpoint para listar los insumos de una base. Contra el backend real: la tabla muestra precios vacíos, crear/editar insumo falla por nombre de campo, la importación y la copia dan 404. Este plan alinea todo con los contratos verificados en la colección Bruno (`TC-07-*`).

**Desviación consciente de la convención del repo**: `AGENTS.md` dice "Money: Decimal branded strings… never parse to number". El backend REAL serializa estos montos como números JSON (`expect(res.body.precioUnitario).to.equal(0.65)` en TC-07-01). La realidad gana: los DTOs de insumo pasan a `number`. Los formateadores de `src/lib/decimal.ts` ya hacen `Number(valor)` internamente, así que el formateo es-EC sigue igual; solo hay que ampliar sus firmas de tipo.

## Current state

### Contrato verificado del backend (fuente de verdad, colección Bruno `api/bruno/07-insumo/` + código Quarkus)

- `InsumoResponse`: `{ id, codigo, tipo ("EQUIPO"|"MANO_OBRA"|"MATERIAL"|"TRANSPORTE"), descripcion, unidad, precioUnitario: number, fechaActualizacion: string, desactualizado: boolean }`. En el selector además: `fuente: "CENTRAL"|"PROYECTO"`, `baseNombre?: string`.
- Crear: `POST /proyectos/{id}/insumos` body `{ codigo, tipo, descripcion, unidad, precioUnitario }` → 201 (TC-07-01/02); código duplicado → 400 problem `codigo:"validacion"` (TC-07-05).
- Editar: `PUT .../insumos/{iid}` body `{ descripcion?, unidad?, precioUnitario? }` → 200 (TC-07-04).
- Eliminar: 204 (TC-07-09).
- Listar: `GET .../insumos?tipo&q&desactualizados&page&size` → Page `{items,total,page,size,totalPaginas}` (el interceptor del front ya normaliza a `{contenido,totalElementos}`) (TC-07-03).
- Búsqueda multifuente: `GET .../insumos/selector?q&soloCentrales&page&size` → Page de filas con `fuente` (TC-07-08). **No existe** `/insumos/busqueda`.
- Importar CSV: `POST .../insumos/importar` multipart con campo `archivo`; el campo `tipo` existe pero el servicio lo ignora (`InsumoResource.importar` llama `importacion.importarCsv(base.id, contenido)`). Respuesta `{ creados, actualizados, errores:[{fila,campo,mensaje}] }` (TC-07-10). **No hay modo soloValidar.**
- Copiar base: `POST .../insumos/copiar` body `{ fuenteTipo: "CENTRAL", baseId }` → 200 `{ copiados, omitidos: [] }` (TC-07-07). **No existe** `/copiar-base`.
- Bases centrales: `GET /bases-centrales` → array plano `{ id, nombre, tipo: "CENTRAL", archivada, totalInsumos }` (TC-07-06). **No existe** `GET /bases-centrales/{id}/insumos`.
- Error contract global: problem+json con `codigo`/`mensaje`.

### Archivos del front a cambiar (estado actual)

- `src/api/contract.ts:200-281` — `InsumoResponse { … precio: Decimal; tarifa?; jornal? … }`, `InsumoCrearRequest/InsumoEditarRequest` con `precio`, `ImportResultadoResponse.errores: [{fila,mensaje}]`, `CopiarBaseRequest { baseId, tipos? }`, `BaseInsumosResponse { … insumoCount: number }`.
- `src/features/insumos/schemas.ts` — `insumoSchema` ya usa input `precioUnitario` (bien), pero `csvRowSchema` usa columna `precio`.
- `src/features/insumos/components/DialogoInsumo.tsx` — línea 79 lee `insumo.precio`; líneas 110/120 envían `precio:` (debería ser `precioUnitario:` numérico).
- `src/features/insumos/components/TablaInsumos.tsx` — línea 124 `columnHelper.accessor("precio", …)`.
- `src/features/insumos/components/VistaBasesCentrales.tsx` — línea 22 llama `GET /bases-centrales/${baseId}/insumos` (no existe); línea 87 renderiza `base.insumoCount`; línea 49 `formatearMoneda(i.precio)`.
- `src/features/insumos/components/DialogoCopiarBase.tsx` — línea 44 POSTea `/copiar-base` con `{baseId}`; línea 83 muestra `b.insumoCount`.
- `src/features/insumos/components/AsistenteImportCsv.tsx` — asistente de 3 pasos que usa `soloValidar` (líneas 60, 77).
- `src/features/insumos/hooks/useImportCsv.ts` — URL `/insumos/import?soloValidar=` con FormData.
- `src/features/insumos/hooks/useBusquedaInsumos.ts` — GET `/insumos/busqueda` esperando array plano (hoy sin consumidores activos, pero su test mock la URL).
- `src/features/apu-editor/hooks/useBusquedaParaApu.ts` — GET `/proyectos/${proyectoId}/insumos/busqueda` (línea 22), consumido por `SelectorInsumo`.
- `src/features/apu-editor/components/SelectorInsumo.tsx` — línea 98 renderiza `formatearMoneda(r.precio)`.
- `src/components/comunes/Moneda.tsx` — prop `valor: Decimal | null | undefined`.
- `src/lib/decimal.ts` — `formatearMoneda/formatearNumero/formatearPorcentaje(valor: Decimal | …)`.
- `src/test/fixtures/insumos.ts` — fixtures con `precio: "12.500000"`, `jornal`, `tarifa`, `basesCentralesFixture` con `insumoCount`, `insumosBusquedaFixture` array plano.
- `src/test/handlers.ts:152-181` — mocks `/insumos`, `/insumos/:iid`, `/import`, `/copiar-base`, `/busqueda`, `/bases-centrales`, `/bases-centrales/:id/insumos`.
- Tests afectados: `DialogoInsumo.test.tsx`, `TablaInsumos.test.tsx`, `SelectorInsumo.test.tsx` (mockea `/busqueda`), `AsistenteImportCsv.test.tsx`, `InsumosPage.test.tsx`.

### Convenciones del repo

Ver `AGENTS.md`: UI español, pnpm, MSW con `onUnhandledRequest:"error"` (toda URL nueva necesita mock o el suite explota), tests por label accesible en español, sin comentarios. Commits estilo `fix:`/`feat:`/`chore:`.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Install   | `pnpm install`       | exit 0              |
| Typecheck | `pnpm run typecheck` | exit 0              |
| Tests     | `pnpm run test -- src/features/insumos src/features/apu-editor` | all pass |
| Full gate | `pnpm run verify`    | exit 0              |

## Scope

**In scope**:
- `src/api/contract.ts` (bloque Insumos/Bases líneas ~200-281)
- `src/lib/decimal.ts` (solo firmas de las 3 funciones formatear*)
- `src/components/comunes/Moneda.tsx` (solo tipo de la prop)
- `src/features/insumos/**` (hooks, schemas, componentes)
- `src/features/apu-editor/hooks/useBusquedaParaApu.ts`
- `src/features/apu-editor/components/SelectorInsumo.tsx` (solo la línea del precio)
- `src/test/fixtures/insumos.ts`, `src/test/handlers.ts` (sección insumos/bases)
- Tests existentes de los componentes listados
- `plans/README.md`

**Out of scope**:
- `src/features/apu-editor/hooks/useApuEditor.ts`, `GridSeccion.tsx`, `PieTotales.tsx` (los Decimals del editor de APU siguen siendo strings del contrato APU; NO tocar).
- Cualquier componente de presupuesto/cronograma/admin.
- Backend (`../thesis-back-quarkus`) — solo lectura.
- `DialogoUsoInsumo` / flujo `insumo-en-uso` (el backend aún no expone uso; no romperlo más).

## Git workflow

Rama actual del operador; commits por paso (`fix: rename insumo price field to precioUnitario`, etc.). No push ni PR.

## Steps

### Step 1: DTOs en `src/api/contract.ts`

Reemplaza el bloque de insumos (líneas ~200-270) con:

```ts
export interface InsumoResponse {
  id: number;
  codigo: string;
  tipo: TipoInsumo;
  descripcion: string;
  unidad: string;
  precioUnitario: number;
  fechaActualizacion: string;
  desactualizado: boolean;
  fuente?: "LOCAL" | "CENTRAL";
  baseNombre?: string;
}

export interface InsumoCrearRequest {
  codigo: string;
  tipo: TipoInsumo;
  descripcion: string;
  unidad: string;
  precioUnitario: number;
}

export interface InsumoEditarRequest {
  descripcion?: string;
  unidad?: string;
  precioUnitario?: number;
}

export interface InsumoBusquedaResponse {
  id: number;
  codigo: string;
  descripcion: string;
  tipo: TipoInsumo;
  unidad: string;
  precioUnitario: number;
  fuente?: "LOCAL" | "CENTRAL";
  baseNombre?: string;
}

export interface ImportResultadoResponse {
  creados: number;
  actualizados: number;
  errores: Array<{ fila: number; campo?: string; mensaje: string }>;
}

export interface CopiarBaseRequest {
  fuenteTipo: "CENTRAL" | "PROYECTO";
  baseId?: number;
  proyectoId?: number;
}
```

Y `BaseInsumosResponse`:

```ts
export interface BaseInsumosResponse {
  id: number;
  nombre: string;
  tipo: "CENTRAL";
  archivada: boolean;
  totalInsumos: number;
}
```

Borra `tarifa`/`jornal` de donde aparezcan (ya no existen en el backend).

**Verify**: `pnpm run typecheck` → errores concentrados en los archivos del Scope (DialogoInsumo, TablaInsumos, VistaBasesCentrales, DialogoCopiarBase, SelectorInsumo, hooks, fixtures, handlers). Si aparece alguno FUERA del scope, STOP.

### Step 2: Firmas de formato tolerantes a número (`decimal.ts` + `Moneda.tsx`)

En `src/lib/decimal.ts` cambia SOLO las firmas de `formatearMoneda`, `formatearNumero`, `formatearPorcentaje` a:

```ts
valor: Decimal | number | null | undefined
```

(La implementación no cambia: ya hace `Number(valor)`.) En `Moneda.tsx`, la prop pasa a `valor: Decimal | number | null | undefined`.

**Verify**: `pnpm run test -- src/lib` → decimal tests pass.

### Step 3: Componentes de lectura (tabla, selector, bases)

1. `TablaInsumos.tsx:124` — `accessor("precioUnitario", …)`.
2. `SelectorInsumo.tsx:98` — `formatearMoneda(r.precioUnitario)`.
3. `VistaBasesCentrales.tsx`:
   - Línea 87: `{base.totalInsumos} insumos`.
   - **Elimina** el componente `BaseInsumosList` y el bloque expandible (`expandida`, botón con chevrons): el backend no tiene `GET /bases-centrales/{id}/insumos`. Deja cada base como fila simple (nombre, badge "Archivada" si aplica, contador). Quita imports muertos (`useQuery`, `get`, `Page`, `InsumoResponse`, `CargandoTabla`, Table*, chevrons, `formatearMoneda` si queda sin uso).
4. `DialogoCopiarBase.tsx`:
   - Línea 44: `post<CopiaBaseResultadoResponse>(\`/proyectos/${proyectoId}/insumos/copiar\`, { fuenteTipo: "CENTRAL", baseId: Number(baseId) })`.
   - Línea 83: `(b.totalInsumos} insumos`.

**Verify**: `pnpm run typecheck` → solo quedan errores en hooks/import/asistente.

### Step 4: Hooks y mutaciones

1. `useBusquedaParaApu.ts`: cambia queryFn a

```ts
queryFn: () =>
  get<Page<InsumoBusquedaResponse>>(`/proyectos/${proyectoId}/insumos/selector`, params),
```

con `params: { q?: string; soloCentrales?: boolean; page?: number; size?: number }`. Los consumidores que hacían `.map` sobre un array ahora necesitan `data?.contenido ?? []` — busca usos con `grep -rn "useBusquedaParaApu" src/` y ajusta (esperado: `SelectorInsumo.tsx`).

2. `useBusquedaInsumos.ts`: misma migración a `/insumos/selector` (mantiene `enabled: !!params.q`). Si tras `grep -rn "useBusquedaInsumos" src/` no hay consumidores fuera de su propio archivo, bórralo junto con su referencia en tests.
3. `useImportCsv.ts`:

```ts
mutationFn: ({ formData }: { formData: FormData }) =>
  post<ImportResultadoResponse>(`/proyectos/${proyectoId}/insumos/importar`, formData),
```

(sin `soloValidar`).

**Verify**: `pnpm run typecheck` → solo errores en `AsistenteImportCsv.tsx` y `DialogoInsumo.tsx`.

### Step 5: `AsistenteImportCsv.tsx` — asistente de 2 pasos

El backend no tiene dry-run: fusiona "Validar" e "Importar".

1. `const PASOS = ["Seleccionar archivo", "Importar"];`
2. Elimina `handleValidar` y el paso 1 de validación; `handleImportar` llama `importar.mutateAsync({ formData })` y muestra toast con `creados/actualizados/errores.length` (igual que hoy).
3. Tras importar, si `res.errores.length > 0`, muestra la lista de errores (fila + mensaje) en el paso final en vez de cerrar de golpe; si no, `onClose()`.
4. Mantén el texto de columnas pero renombra la columna mencionada: "codigo, descripcion, tipo, unidad, precioUnitario".
5. Deja el catch de `ApiError` con `csv-invalido` si existe ese código en `src/api/problem.ts`; si no existe, elimina esa rama y deja toast genérico.

### Step 6: `DialogoInsumo.tsx`

1. Línea 79: `precioUnitario: String(insumo.precioUnitario)`.
2. Líneas 104-122: envía `precioUnitario: Number(precio)` en ambos branches (crear/editar), eliminando `asDecimal(precio)` (borra el import si queda sin uso).

### Step 7: Fixtures y handlers de prueba

1. `src/test/fixtures/insumos.ts`: convierte `precio: "12.500000" as never` → `precioUnitario: 12.5` en todos los rows; borra `jornal`/`tarifa`; `basesCentralesFixture` → `{ id, nombre, tipo: "CENTRAL", archivada, totalInsumos }` (93/45/120); `insumosBusquedaFixture` con `precioUnitario` numérico.
2. `src/test/handlers.ts` sección insumos (~152-181):
   - `http.post(\`${API}/proyectos/:id/insumos/importar\`, …)` (reemplaza `/import`; devuelve `importResultadoFixture`).
   - `http.post(\`${API}/proyectos/:id/insumos/copiar\`, …)` (reemplaza `/copiar-base`).
   - `http.get(\`${API}/proyectos/:id/insumos/selector\`, …)` devuelve `pagina(insumosBusquedaFixture)` (reemplaza `/busqueda`).
   - **Elimina** `http.get(\`${API}/bases-centrales/:id/insumos\`, …)` (endpoint ya no lo llama nadie).
3. Actualiza los tests que referencian URLs/campos viejos: `SelectorInsumo.test.tsx` (mock `/selector` con `pagina(...)`), `AsistenteImportCsv.test.tsx` (flujo de 2 pasos), `TablaInsumos.test.tsx` (fixtures nuevos), `DialogoInsumo.test.tsx` (labels iguales; verificar submit).

**Verify**: `pnpm exec prettier --write src/features/insumos src/features/apu-editor src/test src/lib/decimal.ts src/components/comunes/Moneda.tsx && pnpm run test -- src/features/insumos src/features/apu-editor src/lib` → all pass.

### Step 8: Verificación completa

**Verify**: `pnpm run verify` → exit 0.

## Test plan

- Nuevo caso en `DialogoInsumo.test.tsx`: capturar el body del POST al crear y asertar `{ precioUnitario: 12.5 }` numérico y ausencia de `precio` (patrón handler con `await request.json()`).
- Nuevo caso en `TablaInsumos.test.tsx` o `VistaBasesCentrales` inline: renderizar bases con `totalInsumos` y asertar el texto "93 insumos"; asertar que NO se hace request a `/bases-centrales/{id}/insumos` (MSW `onUnhandledRequest:"error"` ya lo garantiza si sobra el mock).
- `AsistenteImportCsv.test.tsx`: flujo feliz de 2 pasos contra `/importar`.
- Patrón estructural: `ListaProyectosPage.test.tsx`.

## Done criteria

- [ ] `grep -rn "copiar-base\|insumos/busqueda\|insumos/import?" src/` → sin resultados
- [ ] `grep -rn "insumoCount" src/` → sin resultados
- [ ] `grep -rn "jornal\|tarifa" src/api/contract.ts` → sin resultados
- [ ] `grep -rn "soloValidar" src/` → sin resultados
- [ ] `pnpm run verify` → exit 0
- [ ] `git status` → solo archivos in-scope
- [ ] `plans/README.md` fila 017 actualizada

## STOP conditions

- Drift check detecta cambios post-`3514822` que contradigan los excerpts.
- `typecheck` marca errores de precio fuera del Scope (p.ej. algún componente de presupuesto consumiendo `InsumoResponse`) — reporta en lugar de ampliar alcance.
- Descubres que el backend SÍ implementa `GET /bases-centrales/{id}/insumos` (entonces conserva la vista expandible y reporta).
- Un paso falla dos veces tras intento razonable.

## Maintenance notes

- Cuando el backend implemente listing por base central, restaurar la vista expandible de `VistaBasesCentrales` (git history tiene el componente completo antes de este plan).
- `DialogoUsoInsumo` depende del problem `insumo-en-uso` con `usos`; el backend aún no lo emite — revisar cuando aterrice P-18.
- Revisor: confirmar que ningún test sigue mockeando URLs eliminadas y que `onUnhandledRequest:"error"` no dispara fallos ocultos.
