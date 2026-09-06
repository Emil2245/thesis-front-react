# Plan 059 — Corregir las formas de DTO que difieren de main

**Status:** TODO
**Escrito contra:** frontend `8cc08b5` · backend `origin/main` @ `c337950`
**Fuente de verdad:** los records de `origin/main`, leídos uno a uno
**Esfuerzo:** M (4–6 h) · **Riesgo:** MEDIO — toca `contract.ts` y varios componentes
**Depende de:** `061` → `053` → **`054`** (que le quita `porcentajeDescuento` al mismo `ApuResponse`)
**Cierra:** §5.4 y §5.6 del handoff

## Por qué

Diez tipos del frontend tienen una forma distinta de la que main sirve. No son ids: son campos que
faltan, campos que sobran y un DTO entero con otra estructura. Todos pasan el `typecheck` porque
nada valida en runtime.

Ordenados por daño real.

## 1 — `ApuCalculoResponse`: forma completamente distinta

Es el peor. El desglose de cálculo (S-26 / P-27 / US-23, «transparencia») lee un objeto que el
backend no produce.

```ts
// main
ApuCalculoResponse {
  apuId: string
  codigo: string
  parametros: { hm: number; ciDefault: number; ciAplicado: number }
  secciones: {
    tipo: SeccionTipo; subtotal: number; operacion: string; resultado: number
    lineas: {
      detalleId: string; orden: number; seccion: SeccionTipo
      esHerramientaMenor: boolean
      insumoId: string; descripcion: string
      cantidad: number; rendimiento: number
      precioEfectivo: number; costoHora: number
      operacion: string; resultado: number
    }[]
  }[]
  resumen: { cd: number; ci: number; ct: number }
}

// frontend hoy
{ formulas[], subtotales, cd, cdAjustado, ci, ct }
```

**`cdAjustado` no existe y está prohibido**: un contract test del backend lo custodia, y los docs
lo retiraron el 2026-08-31 (v1.3 §2.5.4 / N04 §A1). Tampoco existe `parametros.descuento` ni
`resumen.operacionCdAjustado`. La cadena activa es `CD → CI → CT`, sin paso intermedio.

El campo `operacion` es lo interesante para la UI: es la **fórmula en texto** que el backend ya
calcula (`"4.690900 × 0.180000"`), por línea y por sección. `PopoverDesglose` no tiene que
componer nada — solo mostrarlo. Hoy lo compone a mano.

Ojo con las escalas: **APU es dinero como `number`**, no `Decimal` string. Esa es la partición del
§2 del handoff, y aquí se nota de lleno.

## 2 — `ApuDetalleCrearRequest`: falta `seccionTipo`

```java
ApuDetalleCrearRequest(@NotNull SeccionTipo seccionTipo,
                       @NotNull UUID insumoId,
                       @NotNull @DecimalMin("0.000001") BigDecimal cantidad,
                       @DecimalMin("0.000001") BigDecimal rendimiento)
```

El frontend no manda `seccionTipo`, que es `@NotNull`. **Añadir una línea a un APU devuelve 400
hoy.** Es un fallo duro, no silencioso, en la pantalla núcleo (S-22).

`rendimiento` es opcional pero con mínimo `0.000001` si se manda: enviar `0` es 400. Y `cantidad`
tiene el mismo mínimo — no acepta cero.

## 3 — `InsumoUsoResponse`: otra forma y otra ruta

```ts
// main
InsumoUsoResponse { apuId: string; codigo: string; descripcion: string;
                    bloque: string; override: boolean }
// frontend
{ apuId, apuCodigo, apuDescripcion, detalleId, cantidad }
```

Y la ruta es `/usos` en plural; `DialogoUsoInsumo.tsx:40` pide `/uso`.

`override: boolean` es información que la UI no muestra y sí importa: dice si ese APU tiene un
precio manual para el insumo. Es justo lo que S-19 necesita para explicar el bloqueo de borrado.

> El handler del backend devuelve `List.of()` — es un stub. Corregir la forma y la ruta ahora
> (para que no haya que volver), pero **mantener la acción deshabilitada** hasta que el backend lo
> implemente de verdad. Un diálogo que siempre dice «no se usa en ningún sitio» es peor que uno
> apagado.

## 4 — `RubroRefResponse`: el campo es `id`

```java
RubroRefResponse(UUID id, String item, String codigo, String descripcion)
```

El frontend lee `rubroId`. `BannerIntegridad` (P-32 / US-27, alertas de integridad) lee
`undefined` en cada fila. La alerta se pinta pero no puede enlazar a nada.

## 5 — `RubroResponse.alertas` no existe

Borrar. Lo hace el plan 053; si ya se hizo, verificar.

## 6 — `ApuResponse`: dos campos que no están, uno que falta

```java
ApuResponse(UUID id, String codigo, String descripcion, String unidad,
            BigDecimal costoDirecto, BigDecimal costoIndirecto, BigDecimal costoTotal,
            BigDecimal porcentajeIndirecto, BigDecimal porcentajeIndirectoEfectivo,
            List<ApuSeccionResponse> secciones,
            List<AdvertenciaPlantillaResponse> advertencias)
```

- **No tiene `porcentajeDescuento`** — retirado 2026-08-31. Borrar del tipo.
- **No tiene `especificacionTecnica`** — la ET se lee con `GET /apus/{id}/especificacion-tecnica`,
  que devuelve `{apuId, contenido}` y **el frontend nunca llama** (solo hace `PUT`). Es uno de los
  22 endpoints sin explotar. `PanelEspecificacionTecnica` escribe a ciegas: no puede mostrar lo
  guardado sin recargar el APU entero.
- **`porcentajeIndirectoEfectivo`** existe en main y el frontend lo ignora. Es el %CI realmente
  aplicado tras la herencia — exactamente lo que S-22 necesita para distinguir heredado de
  override (P-23 / US-19). Añadirlo.
- Es `@JsonInclude(NON_NULL)`: los campos nulos **no vienen en el JSON**. Todo opcional debe ser
  `?` en el tipo, no `| null`.

## 7 — `InsumoResponse` vs `InsumoBusquedaResponse`

```ts
InsumoResponse        { id, codigo, tipo, descripcion, unidad, precioUnitario,
                        fechaActualizacion, desactualizado }
InsumoBusquedaResponse{ ...lo mismo... , fuente, baseNombre }
```

El frontend pone `fuente`/`baseNombre` en `InsumoResponse`, donde no van, y le faltan
`fechaActualizacion`/`desactualizado` a `InsumoBusquedaResponse`.

`desactualizado` es el badge «> 3 meses sin actualizar» de S-14 (P-13 / RNF-08): el backend ya lo
calcula y el frontend lo estaba derivando por su cuenta o no mostrándolo.

## 8 — `PlantillaProyectoResponse`: falta `snapshotEstructura`

```java
PlantillaProyectoResponse(UUID id, String nombre, String descripcion,
                          JsonNode snapshotEstructura, Instant fechaCreacion)
```

`snapshotEstructura` es JSON libre. En TypeScript: `unknown`, y que quien lo consuma lo estreche.
**No inventar una interfaz** para un `JsonNode` cuya forma el backend no fija — sería un contrato
imaginario, que es el error que este repo ya cometió tres veces.

Es lo que necesita el preview de S-36/S-40 («preview del snapshot»).

## 9 — parámetros de sistema

Lo cubre la rebanada 5 del plan 050 (11 campos `@NotNull`, `number` no `Decimal`, entidad cruda en
el `GET`, renombrado a `ParametrosSistemaEditarRequest`). No duplicarlo aquí; solo asegurar que
`contract.ts` queda coherente.

## 10 — `ProyectoCrearRequest` / `ProyectoEditarRequest`

Varios campos son `@NotNull`/`@NotBlank` en main y opcionales en el frontend. Y
`ProyectoCrearRequest.plazoUnidad` es `String` en el request pero enum `PlazoUnidad` en la
respuesta — asimetría real del backend, no error del frontend: tipar el request como `string` y la
respuesta como el enum, con un comentario que diga por qué difieren.

## 11 — tipos que faltan del todo (§5.6)

`ApuDuplicarRequest { copiarET?: boolean }` · `EspecificacionTecnicaResponse { apuId, contenido }` ·
`BasePersonalResponse` (plan 058) · `AdminBaseCentralResponse` (plan 050) ·
`ProyectoDesdePlantillaResponse { proyecto, advertencias? }` (plan 049).

## Método

Igual que 053: **fixture primero**. Cada tipo de esta lista tiene una fixture en
`src/test/fixtures/`. Corregir la fixture, ver el `typecheck` señalar los consumidores, arreglar.

Y para cada uno de los 4 defectos que hoy **fallan en silencio o en 400** (`ApuCalculoResponse`,
`ApuDetalleCrearRequest`, `InsumoUsoResponse`, `RubroRefResponse`), dejar un **test de hook** —no
de página— que falle con el código actual. Ver plan 057: los tests de página no ven estos bugs.

## Orden sugerido

`ApuDetalleCrearRequest` primero: es el único que rompe una operación del flujo núcleo hoy mismo.
Luego `RubroRefResponse` (una línea), `ApuResponse`, los dos de insumo,
`PlantillaProyectoResponse`, y `ApuCalculoResponse` al final porque es el que más UI arrastra.

## Definición de hecho

- `npm run verify` en verde.
- Cero `cdAjustado`, `porcentajeDescuento`, `alertas`, `rubroId`, `apuCodigo` en `contract.ts`.
- Añadir una línea de APU funciona contra un handler que valida `seccionTipo` como obligatorio.
- `PopoverDesglose` muestra el campo `operacion` del backend en vez de componer la fórmula.
- Un test de hook por cada uno de los 4 defectos duros.
