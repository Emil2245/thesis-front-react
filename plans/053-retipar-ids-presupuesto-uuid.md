# Plan 053 — Re-tipar ids de presupuesto · capítulo · rubro a UUID string

**Status:** HECHO en `ola1-053`, 2026-09-06. `pnpm run verify` en verde (47 archivos, 226 tests, build ok).
**Escrito contra:** frontend `8cc08b5` · backend `origin/main` @ `c337950`
**Fuente de verdad:** `PresupuestoResponse`, `CapituloResponse`, `RubroResponse`,
`CapituloResource`, `RubroResource`, `PresupuestoVersionResource` en `origin/main`
**Esfuerzo:** M (3–4 h) · **Riesgo:** MEDIO — toca el dominio más grande del front
**Depende de:** [`061`](061-politica-de-dinero.md) — fija cómo se tipa el dinero; si va después, se re-tipa dos veces
**Bloquea a:** 054, 059, 055, 050, 058. Es la ola 1.

## Por qué

`e44c608` tipó `presupuestoId`, `capituloId` y `rubroId` como `number` porque el análisis se
hizo contra `test/stuff`, donde eran `Long`. En `origin/main` **no hay un solo id `Long` en la
frontera REST**: todos los path params se declaran `String` y se parsean con `UuidV7.parse(...)`,
y todos los campos id de DTO son `UUID`.

Las únicas excepciones en todo el backend son `UsuarioResponse.id` y `PerfilResponse.id`, que sí
son `Long`. No tocarlas.

El daño no es solo cosmético. Los guards numéricos derivados de ese tipado **desactivan queries
en producción**:

```ts
enabled: presupuestoId > 0          // usePresupuesto.ts:69, useExportar.ts:12 → siempre false con UUID
Number(searchParams.get("v")) || 0  // ExportPage.tsx:56 → siempre NaN → 0
```

`2ebf40d` ya migró proyecto/insumo/apu/firmante/base/plantilla correctamente. Este plan termina
el trabajo con el mismo método.

## Método TDD

El seam de este repo es `src/test/fixtures/*` + `src/test/handlers.ts` (MSW). El ciclo es:

1. **Rojo por tipos:** cambiar las fixtures a UUIDs string. `npm run typecheck` explota en cada
   sitio que asume `number`. La lista de errores *es* la lista de trabajo — no hay que buscarla
   a mano.
2. **Verde:** corregir `contract.ts`, luego `queryKeys.ts`, luego los hooks, luego las páginas.
3. **Regresión:** un test por cada guard reparado, que falle con el código de hoy.

**Gate:** `npm run typecheck` (`tsc -b --noEmit`). **Nunca `npx tsc --noEmit`** — `tsconfig.json`
es `"files": []` con project references y ese comando siempre sale 0 sin comprobar nada. Ya se dio
un commit por limpio con 8 errores de tipo dentro.

## Rebanadas

### Rebanada 1 — fixtures en rojo

`src/test/fixtures/presupuesto.ts`: `presupuestoId`, `capitulos[].id`, `rubros[].id`,
`rubros[].apuId`, `parentId`, `origenId` → UUIDv7 string.

Usar UUIDv7 reales y **estables** (no `crypto.randomUUID()` en fixture: los snapshots y las
queryKeys deben ser deterministas). Formato v7: `0198xxxx-xxxx-7xxx-8xxx-xxxxxxxxxxxx`.

Al terminar esta rebanada `npm run typecheck` debe fallar. Si sale limpio, las fixtures no se
están usando desde los tests y eso es un hallazgo aparte.

### Rebanada 2 — `contract.ts`

Líneas 422, 425, 432, 437, 447, 455, 460, 469, 478, 508, 519, 536, 537, 547, 548 (§5.3 del
handoff): `number` → `string`.

Dos cambios que no son de tipo y van aquí:

- **Borrar `RubroResponse.alertas`.** No existe en `origin/main`. Cualquier UI que lo lea está
  leyendo `undefined` hoy.
- **Borrar los marcadores `TODO(047)`** de `src/api/contract.ts:483` y `src/shell/contexto.ts:19`.
  Afirman que ciertos ids son `Long` en el backend. Es falso. El plan 047 quedó anulado.

### Rebanada 3 — `queryKeys.ts`

`apus`, `presupuesto`, `presupuestoResumen`, `presupuestoValidacion`, `cronograma` toman
`presupuestoId: number` → `string`. Es cambio de firma puro; el array de la key ya serializa bien.

### Rebanada 4 — guards (aquí van los tests de regresión)

| Sitio | Hoy | Debe ser |
|---|---|---|
| `usePresupuesto.ts:69` | `enabled: presupuestoId > 0` | `enabled: !!presupuestoId` |
| `useExportar.ts:12` | `enabled: presupuestoId > 0` | `enabled: !!presupuestoId` |
| `ExportPage.tsx:56` | `Number(searchParams.get("v")) \|\| 0` | `searchParams.get("v") ?? undefined` |
| `CronogramaPage.tsx:26` | `presupuestoId ?? 0` | `presupuestoId ?? undefined` (055 lo termina) |

**Test rojo antes del fix**, uno por guard:

```
dado un presupuestoId UUID válido
cuando se monta el hook
entonces la query se dispara (MSW recibe la petición)
```

Con el código de hoy `"0198…" > 0` es `false` y la query nunca sale, así que el test falla. Es la
prueba de que el bug era real y no un detalle de tipos.

### Rebanada 5 — call sites

`useCapituloMutaciones.ts:15,25,37,50` · `useRubroMutaciones.ts:25,46,59` ·
`useVersionMutaciones.ts:15,28,38` · `usePresupuesto.ts:52`.

Aquí también entra un bug SILENT que el tipado tapa: `useCapituloMutaciones.ts:15` declara
`parentId?: number` y el backend espera `UUID parentId`. Hoy manda un número, Jackson lo rechaza
o lo descarta. Al pasar a `string` el bug se cierra solo, pero **añadir un test** que verifique
que `parentId` viaja como el UUID del capítulo padre — no como índice.

### Rebanada 6 — comentarios mentirosos

`usePresupuesto.ts:44` traga el 404 de `GET /proyectos/{id}/presupuestos` con un comentario que
dice que la ruta no existe. **Sí existe**, la sirve `ProyectoResource`. Ese catch está escondiendo
fallos reales desde entonces. Quitarlo y dejar que el error suba.

## Fuera de alcance

- `e2e/screenshots.spec.ts` tiene ~26 ids numéricos. Está fuera del gate de vitest y el plan 021
  es su dueño. No tocar aquí; anotarlo en el plan 021.
- Cronograma: lo hace el 055. Este plan solo deja `CronogramaPage` compilando.

## Definición de hecho

- `npm run verify` en verde.
- Cero `number` para ids de presupuesto/capítulo/rubro en `src/api/contract.ts`.
- Cero ocurrencias de `TODO(047)` y de `RubroResponse.alertas` en `src/`.
- Los 4 tests de guard existen y fallan si se revierte el fix.

## Notas de ejecución (2026-09-06, rama `ola1-053`)

Backend reverificado contra `origin/main` @ `c337950` antes de tocar nada: la
premisa del plan se sostiene entera. Todos los ids de `PresupuestoResponse`,
`CapituloResponse`, `RubroResponse`, `PresupuestoVersionResponse` y los DTOs de
cronograma son `UUID`; todos los path params son `String` + `UuidV7.parse`;
`RubroResponse.alertas` no existe; `GET /proyectos/{id}/presupuestos` sí existe
en `ProyectoResource`. Solo `UsuarioResponse.id` y `PerfilResponse.id` son
`Long`, y no se tocaron.

Los 6 tests de regresión viven en
`src/test/features/presupuesto/hooks/guards-uuid.test.tsx`. Los 5 de guard se
verificaron en rojo revirtiendo los guards a `presupuestoId > 0` y a
`Number(searchParams.get("v")) || 0`: los 5 fallan. El de `parentId` no falla en
runtime sino en `typecheck` — revertir `parentId?: string` a `number` rompe la
llamada del test.

### Desviaciones del plan

- **`?? undefined` → `?? ""`.** El plan pedía `searchParams.get("v") ?? undefined`
  en `ExportPage` y `presupuestoId ?? undefined` en `CronogramaPage`. Se usó
  `?? ""`: el guard pasó a ser `!!presupuestoId`, así que `""` lo apaga igual
  que `undefined` y evita propagar `string | undefined` por toda la firma de los
  hooks. Mismo efecto, menos tipos.
- **El catch mentiroso estaba duplicado.** El plan señala
  `usePresupuesto.ts:44`, pero `src/shell/contexto.ts` tenía copiado el mismo
  `useVersiones` con el mismo tragado del 404. Se quitó en los dos: parchear
  solo el que nombra el plan dejaba el otro escondiendo fallos.

### Hallazgos que NO se arreglaron aquí

- **`RubroRefResponse.rubroId` no existe en el backend.** El DTO real es
  `RubroRefResponse(UUID id, String item, String codigo, String descripcion)`:
  el campo se llama `id`, no `rubroId`. Hoy `ExportPage` lo usa solo como `key`
  de React, así que el síntoma es invisible. Es forma de DTO, no tipo de id →
  le toca al **plan 059**.
- **`src/shell/contexto.ts::useVersiones` y
  `src/features/presupuesto/hooks/usePresupuesto.ts::useVersiones` son el mismo
  hook duplicado** (misma queryKey, misma petición). Unificarlos implica que
  `shell/` importe de `features/`, que es una dirección nueva de dependencia:
  decisión de arquitectura, no de este plan. Candidato para el **060**.
- **`useParametros.ts` invalidaba `qk.apus(0)`**, una key que nunca casó con
  nada. Se borró la línea: el `["presupuesto"]` de la línea siguiente ya
  invalida los APUs de cualquier presupuesto. (Esto sí se arregló, se anota por
  ser un cambio fuera del alcance literal del plan.)
- **`e2e/screenshots.spec.ts`** sigue con 5 ids numéricos. Anotado en
  `plans/021-reparar-suite-de-capturas-e2e.md`, su dueño.
