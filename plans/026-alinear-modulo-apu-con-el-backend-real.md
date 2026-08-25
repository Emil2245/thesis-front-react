# Plan 026: Alinear el módulo APU con el backend real (números JSON, DTOs y endpoints inexistentes)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ab31892..HEAD -- src/api/contract.ts src/lib/decimal.ts src/features/apu-editor/`
> `PieTotales.tsx`, `GridSeccion.tsx`, `FilaDetalle.tsx`, `EncabezadoApu.tsx` y
> `EditorApuPage.tsx` **tienen cambios sin commitear** del rediseño de UI.

## Status

- **Estado**: Done — ejecutado en rama `plan/026`, commits `b8326f2..a3e38d7`
- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: ninguno. Si 020 va antes, rebasa: ambos tocan `DialogoNuevoApu.tsx`.
- **Category**: bug
- **Planned at**: commit `ab31892` + rediseño de UI sin commitear, 2026-08-24
- **Backend verificado en**: `../thesis-back-quarkus`, paquete `ec.uce.propuestas.apu`

## Why this matters

Los planes 016–018 alinearon proyectos, insumos y parámetros con el backend real
y dejaron constancia de la desviación de fondo: **el backend serializa
`BigDecimal` como número JSON, no como string**. El plan 017 excluyó
explícitamente el editor de APU ("los Decimals del editor de APU siguen siendo
strings del contrato APU; NO tocar"). Esa exclusión dejó un crash.

`ec.uce.propuestas.common.JacksonConfig` solo registra `JsonNullableModule`: no
activa `WRITE_BIGDECIMAL_AS_PLAIN` ni ningún serializador a string. Por tanto
`ApuResponse.porcentajeDescuento` llega como `0` (número), y el front hace:

```ts
// src/features/apu-editor/components/PieTotales.tsx:59
const tieneDescuento = !esCero(apu.porcentajeDescuento);

// src/lib/decimal.ts:58-61
export function esCero(valor: Decimal | null | undefined): boolean {
  if (valor == null) return true;
  return /^-?0+(\.0+)?$/.test(valor.trim());   // ← los números no tienen .trim()
}
```

Contra el backend real, abrir cualquier APU lanza
`TypeError: valor.trim is not a function` y tumba el editor entero al límite de
error. El plan 018 ya lo había predicho por escrito ("*`esCero()` crashearía con
un número*") para los parámetros; aquí ocurre de verdad.

Además hay tres desalineaciones más, todas verificadas contra el código Java:

- `ApuResponse` del front declara `cdAjustado` y `vinculado`; el record del
  backend **no los tiene**. Llegan `undefined`.
- `ListaApusPage` envía `?soloAuxiliares=true`; `PresupuestoApuResource.listar`
  solo acepta `q`, `page` y `size`. El filtro no hace nada, en silencio.
- Cuatro endpoints que el front llama **no existen** en el backend:
  `POST /apus/{id}/duplicar`, `POST /apus/{id}/descuento`,
  `GET /apus/{id}/calculo`, `POST /apus/{id}/guardar-plantilla`.

Al aterrizar esto, el editor de APU funciona contra el backend real y las
acciones que no tienen respaldo dejan de ofrecerse como si funcionaran.

## Current state

### Lo que el backend expone de verdad (`src/main/java/ec/uce/propuestas/apu/resource/`)

```java
@Path("/presupuestos/{presupuestoId}/apus")     // PresupuestoApuResource
  @GET  listar(@QueryParam("q") String q,
               @QueryParam("page") @DefaultValue("0") int page,
               @QueryParam("size") @DefaultValue("25") int size)  → Page<ApuResumenResponse>
  @POST crear(@Valid ApuCrearRequest req)

@Path("/apus/{apuId}")                          // ApuResource
  @GET    obtener()                                       → ApuResponse
  @PATCH  editarCabecera(@Valid ApuPatchRequest req)       → ApuResponse
  @DELETE eliminar()
  @POST   /detalles                 agregarDetalle(...)
  @PATCH  /detalles/{detalleId}     editarDetalle(...)     → ApuResponse
  @DELETE /detalles/{detalleId}     eliminarDetalle(...)   → ApuResponse
```

**Eso es todo.** No hay `/duplicar`, `/descuento`, `/calculo` ni
`/guardar-plantilla`, y no existe ningún recurso de plantillas.

### Los DTOs del backend (records Java, `apu/dto/`)

```java
public record ApuResponse(
        Long id, String codigo, String descripcion, String unidad,
        boolean esAuxiliar,
        BigDecimal costoDirecto, BigDecimal costoIndirecto, BigDecimal costoTotal,
        BigDecimal porcentajeIndirecto, BigDecimal porcentajeIndirectoEfectivo,
        BigDecimal porcentajeDescuento,
        List<ApuSeccionResponse> secciones) {}

public record ApuSeccionResponse(
        SeccionTipo tipo, Short orden, BigDecimal subtotal,
        List<ApuDetalleResponse> detalles) {}

public record ApuDetalleResponse(
        Long id, Short orden, String descripcion, boolean esHerramientaMenor,
        Long insumoId, Long apuAuxiliarId,
        BigDecimal cantidad, BigDecimal rendimiento, String unidad,
        BigDecimal precioEfectivo, boolean precioHeredado,
        BigDecimal costoHora, BigDecimal costo) {}

public record ApuResumenResponse(
        Long id, String codigo, String descripcion, String unidad,
        boolean esAuxiliar, BigDecimal costoDirecto, BigDecimal costoTotal,
        boolean vinculado) {}
```

`ApuDetalleResponse` coincide campo a campo con el front. `ApuResumenResponse`
también. `ApuResponse` **no**: el front añade `cdAjustado` y `vinculado`.

### Los DTOs del front (`src/api/contract.ts:277-315`)

```ts
export interface ApuResponse {
  id: number; codigo: string; descripcion: string; unidad: string;
  esAuxiliar: boolean;
  costoDirecto: Decimal;
  costoTotal: Decimal;
  vinculado: boolean;                       // ← no existe en el backend
  porcentajeIndirecto?: Decimal | null;
  porcentajeIndirectoEfectivo: Decimal;
  porcentajeDescuento: Decimal;
  cdAjustado: Decimal;                      // ← no existe en el backend
  costoIndirecto: Decimal;
  secciones: Array<{ … }>;
}
```

### El precedente a seguir

`plans/017-align-insumos-module-with-backend.md` resolvió exactamente esto para
insumos y dejó escrita la decisión:

> **Desviación consciente de la convención del repo**: `AGENTS.md` dice "Money:
> Decimal branded strings… never parse to number". El backend REAL serializa
> estos montos como números JSON. La realidad gana: los DTOs de insumo pasan a
> `number`. Los formateadores de `src/lib/decimal.ts` ya hacen `Number(valor)`
> internamente, así que el formateo es-EC sigue igual; solo hay que ampliar sus
> firmas de tipo.

Este plan aplica la **misma** decisión al módulo APU. Lee ese plan antes de
empezar: su sección "Current state" documenta cómo se ampliaron las firmas de
`formatearMoneda` / `formatearNumero` / `formatearPorcentaje`.

### Dónde se consumen los Decimals del APU

```
src/features/apu-editor/components/PieTotales.tsx        costoDirecto, cdAjustado,
                                                          porcentajeIndirecto(Efectivo),
                                                          porcentajeDescuento, costoIndirecto, costoTotal
src/features/apu-editor/components/GridSeccion.tsx       seccion.subtotal
src/features/apu-editor/components/FilaDetalle.tsx       cantidad, rendimiento, costoHora,
                                                          precioEfectivo, costo
src/features/apu-editor/hooks/useApuEditor.ts            construye SeccionEditor/FilaEditor
src/features/apu-editor/pages/ListaApusPage.tsx          costoTotal (del resumen)
src/features/apu-editor/components/DialogoDescuentoRubro.tsx  costoTotal
```

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm run typecheck` | exit 0 |
| Tests | `pnpm test` | todos pasan |
| Test dirigido | `pnpm test -- apu-editor` | pasa |
| Gate | `pnpm run verify` | exit 0 |

## Scope

**In scope**:
- `src/api/contract.ts` (solo los DTOs del módulo APU)
- `src/lib/decimal.ts` (solo la firma de `esCero`)
- `src/features/apu-editor/components/PieTotales.tsx`
- `src/features/apu-editor/pages/ListaApusPage.tsx`
- `src/features/apu-editor/hooks/useApus.ts`
- `src/test/fixtures/apu.ts`
- Los `*.test.tsx` del módulo que se rompan por el cambio de tipos

**Out of scope** (NO tocar):
- Los DTOs de insumos, proyectos y parámetros — ya alineados por 016–018.
- `src/features/apu-editor/hooks/useApuEditor.ts` **salvo** que el cambio de
  tipos lo rompa; si lo rompe, el arreglo se limita a las firmas, no a la
  lógica. Es un módulo profundo que se prueba por su interfaz (`08 §9`).
- **Eliminar** las funcionalidades sin endpoint (duplicar, descuento, desglose,
  guardar plantilla). Este plan las **deshabilita visiblemente**, no las borra:
  el backend puede implementarlas y el código debe seguir ahí. Ver paso 5.
- Todo lo relativo a presupuesto, cronograma, exportar y admin — plan 027.

## Git workflow

- Rama: `advisor/026-apu-backend-real`
- Un commit por paso.
- Estilo: conventional commits, p. ej. `fix: APU money fields are JSON numbers, not Decimal strings`
- No hagas push ni abras PR salvo instrucción explícita.

## Steps

### Step 1: `esCero` acepta números (arregla el crash)

En `src/lib/decimal.ts`:

```ts
export function esCero(valor: Decimal | number | null | undefined): boolean {
  if (valor == null) return true;
  if (typeof valor === "number") return valor === 0;
  return /^-?0+(\.0+)?$/.test(valor.trim());
}
```

Mantén la rama de string: otros contratos siguen enviando strings y el módulo
APU no es el único consumidor futuro.

**Verify**: `pnpm run typecheck` → exit 0. Añade en `src/lib/decimal.test.ts`
(existe: mira `src/components/comunes/Moneda.test.tsx` para el estilo si no)
casos `esCero(0) === true`, `esCero(0.0) === true`, `esCero(1) === false`.

### Step 2: Los DTOs del APU dicen la verdad

En `src/api/contract.ts`, en los cuatro interfaces del módulo APU
(`ApuResponse`, `ApuResumenResponse`, `ApuDetalleResponse`, y el tipo inline de
`secciones`), sustituye `Decimal` por `number` en **todos** los campos de dinero,
porcentaje, cantidad y rendimiento, y **elimina** los dos campos que el backend
no envía:

- `ApuResponse.vinculado` → borrar
- `ApuResponse.cdAjustado` → borrar

Deja `porcentajeIndirecto?: number | null` (el backend lo envía nullable).

TypeScript señalará todos los consumidores rotos: esa lista **es** el alcance
real de los pasos 3 y 4. Anótala antes de seguir.

**Verify**: `pnpm run typecheck` → falla con errores **solo** en archivos de
`src/features/apu-editor/` y `src/test/fixtures/apu.ts`. Si aparece un error
fuera de ahí, para y reporta: significa que un módulo no previsto consume estos
DTOs.

### Step 3: `PieTotales` sin `cdAjustado`

`cdAjustado` era el costo directo tras aplicar el descuento del rubro. Sin
endpoint de descuento (`POST /apus/{id}/descuento` no existe) y sin el campo en
la respuesta, la fila "CD Ajustado" no tiene de dónde salir.

Elimina el bloque condicional que la renderiza y la variable `tieneDescuento`
que lo gobierna. **No** calcules el valor en el cliente: ADR 9 del proyecto
prohíbe explícitamente hacer aritmética de costes en el front
(`README.md`: "No calc engine in the client — all cost/pricing math is
server-side").

El test `PieTotales.test.tsx` tiene dos casos sobre "CD Ajustado"
(aparece / no aparece): bórralos, y anota en el commit que se eliminan porque el
campo no existe en el contrato real.

**Verify**: `pnpm test -- PieTotales` → pasa

### Step 4: Fixtures alineados

En `src/test/fixtures/apu.ts`, cambia los valores de dinero de string
(`"800.000000"`) a número (`800`), y quita `cdAjustado` y `vinculado` de los
fixtures de `ApuResponse`. Los `as never` que hoy silencian el tipo de marca
deberían poder desaparecer: si un `as never` sigue siendo necesario tras el
cambio, es señal de que el DTO aún no coincide → revísalo.

Este paso es el que convierte el bug en un test de regresión: con los fixtures
numéricos, el `esCero` viejo habría fallado.

**Verify**: `pnpm test` → todos pasan

### Step 5: Deshabilitar visiblemente lo que no tiene backend

Cuatro acciones de la interfaz llaman a endpoints inexistentes. **No las borres**:
deshabilita el control y explica por qué con un `Tooltip`, siguiendo el patrón
de `TooltipProvider` que ya usa `FilaDetalle.tsx`.

| Control | Archivo | Endpoint ausente |
|---|---|---|
| "Duplicar" en la lista de APUs | `ListaApusPage.tsx` | `POST /apus/{id}/duplicar` |
| "Descuento" | `PieTotales.tsx` | `POST /apus/{id}/descuento` |
| "Desglose" | `PieTotales.tsx` | `GET /apus/{id}/calculo` |
| "Guardar como plantilla" | `EditorApuPage.tsx` | `POST /apus/{id}/guardar-plantilla` |

Patrón para cada uno: `disabled` en el `Button`, envuelto en un `Tooltip` cuyo
`TooltipContent` diga **"Disponible cuando el backend implemente esta
operación."**. Un `Button` deshabilitado no dispara eventos de puntero, así que
el trigger del tooltip debe envolver un `<span>` que contenga el botón.

Define el texto una sola vez en una constante exportada del módulo
(`const MOTIVO_SIN_BACKEND = "Disponible cuando el backend implemente esta operación.";`)
para que el plan 027 pueda reutilizarla.

**Verify**: `pnpm run verify` → exit 0

### Step 6: `soloAuxiliares` deja de mentir

`PresupuestoApuResource.listar` no acepta ese parámetro. Dos opciones honestas;
elige la primera:

1. **Quitar el control** de `ListaApusPage` (el checkbox/switch "Solo
   auxiliares") y el parámetro de `filtros`. Es el filtro que no funciona; la
   columna "Auxiliar" de la tabla sigue mostrando la información.
2. Si prefieres conservarlo, deshabilítalo con el mismo tooltip del paso 5.

Sea cual sea, `filtros.soloAuxiliares` **no debe salir en la petición**: enviar
un parámetro que el servidor ignora es exactamente lo que hace que este bug sea
invisible.

**Verify**: `grep -rn "soloAuxiliares" src/ | grep -v test` → sin resultados (opción 1)

## Test plan

1. **`esCero` con números** (`src/lib/decimal.test.ts`): `0`, `0.0`, `1`,
   `null`, `"0.000000"`, `"1.5"`. Es el test de regresión del crash.
2. **El editor renderiza con fixtures numéricos** (`EditorApuPage.test.tsx`):
   los tests existentes deben seguir pasando tras el paso 4 — si pasan con
   fixtures numéricos, el módulo tolera la forma real del backend.
3. **`PieTotales` sin `cdAjustado`** (`PieTotales.test.tsx`): que "Costo Directo",
   "Costo Indirecto" y "Costo Total" sigan apareciendo, y que "CD Ajustado"
   **no** aparezca nunca.
4. **Los controles sin backend están deshabilitados** (`PieTotales.test.tsx`):
   `expect(screen.getByRole("button", { name: /descuento/i })).toBeDisabled()`.

**Verification**: `pnpm test -- apu-editor` → pasa · `pnpm run verify` → exit 0

## Done criteria

- [ ] `pnpm run verify` sale con exit 0
- [ ] `grep -n "cdAjustado\|vinculado" src/api/contract.ts` no devuelve nada en los DTOs de APU
- [ ] `grep -rn "soloAuxiliares" src/` no devuelve nada (o solo un control deshabilitado)
- [ ] `grep -n "Decimal" src/api/contract.ts` no aparece en `ApuResponse`, `ApuResumenResponse` ni `ApuDetalleResponse`
- [ ] `esCero` acepta `number` y tiene tests para `0` y `1`
- [ ] Los cuatro controles sin backend están `disabled` con tooltip explicativo
- [ ] `git status` no muestra archivos fuera de "In scope"
- [ ] Fila de estado actualizada en `plans/README.md`

## STOP conditions

Para y reporta si:

- El backend gana un `ObjectMapperCustomizer` que serialice `BigDecimal` como
  string (revisa `../thesis-back-quarkus/src/main/java/ec/uce/propuestas/common/JacksonConfig.java`).
  Entonces este plan sobra y hay que revertir 016–018 en su lugar.
- El typecheck del paso 2 rompe archivos **fuera** de `src/features/apu-editor/`
  y `src/test/fixtures/apu.ts`.
- Te ves calculando `cdAjustado` en el cliente: para. ADR 9 lo prohíbe y es la
  regresión bienintencionada más probable de todo este repositorio (así está
  registrado en `plans/README.md`, "Considered and rejected").
- Un endpoint de los cuatro "ausentes" sí existe: vuelve a comprobar con
  `grep -rn '@Path' ../thesis-back-quarkus/src/main/java` antes de deshabilitar
  su control.

## Maintenance notes

- La convención real del proyecto, ya sentada por los planes 016–018 y
  confirmada aquí: **el backend Quarkus manda `BigDecimal` como número JSON**.
  `AGENTS.md` todavía dice lo contrario ("Money: Decimal branded strings");
  conviene corregir esa línea, pero es un cambio de documentación que merece ir
  con los humanos, no colado en este plan.
- `src/lib/decimal.ts` ahora acepta ambas formas. Mientras queden contratos con
  strings (el tipo `Decimal` sigue existiendo), esa dualidad es correcta. El día
  que ningún endpoint envíe strings, `Decimal` puede desaparecer.
- Los cuatro controles deshabilitados son deuda **visible y deliberada**. Cuando
  el backend implemente cada endpoint, el trabajo es quitar el `disabled` y el
  tooltip: por eso no se borra el código que ya llama al endpoint.
