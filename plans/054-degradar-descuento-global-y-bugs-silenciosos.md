# Plan 054 — Degradar descuento global y cerrar los bugs silenciosos

**Status:** TODO
**Escrito contra:** frontend `8cc08b5` · backend `origin/main` @ `c337950` · docs `411242f`
**Esfuerzo:** S (2 h) · **Riesgo:** BAJO — rebanadas independientes y revertibles
**Depende de:** `061` → `053` · **va antes del `059`**: los dos editan `ApuResponse`

> **Cambio respecto al roadmap V2.** El 054 original decía «re-degradar cronograma **y** descuento
> global». **Cronograma ya no se degrada: existe en `origin/main` desde el 2026-09-05** (planes
> backend 026–030). Ese módulo pasa al plan 055, que lo alinea y lo enciende. Aquí queda solo el
> descuento global, más los tres bugs silenciosos del §5.2 del handoff.

## Por qué

Dos clases de defecto, ambos invisibles para el gate actual.

**Descuento global: la especificación se cerró, y el frontend implementa la versión retirada.**
Cero archivos en `origin/main` (`grep -ic descuento-global` → 0; `DescuentoGlobalService` solo
existe en `test/stuff`, sin mergear), así que `useDescuentoGlobal.ts:8,21` y
`DialogoDescuentoGlobal` dan 404 hoy.

Pero el problema no es solo que falte el backend. El 2026-08-31 (`thesis-docs` v1.3 §2.5.4 /
N04 §A1) **se cerró la semántica y no es la que el frontend implementa** — ver §10.2 del handoff.
Degradar el módulo sin corregir los tipos deja el error dormido para quien lo encienda.

**Los bugs silenciosos son peores que los 404.** La petición sale 200, el campo se descarta y
cualquier test que solo compruebe «la mutación resolvió» está verde contra el bug. Ningún test de
este repo los detecta hoy.

## Rebanadas

### Rebanada 1 — degradar descuento global **y corregir su contrato**

`src/lib/disponibilidad.ts`: añadir `"descuento-global"` a `MODULOS_SIN_BACKEND`.

El comentario de cabecera de ese archivo está obsoleto en cada frase («nueve recursos JAX-RS, sin
paquetes presupuesto/cronograma/export/plantilla/admin»). Reescribirlo contra el inventario real:
30 recursos, con presupuesto, cronograma, plantillas y admin-de-bases presentes.

Estado correcto del set después de este plan y del 055:

| Módulo | Backend en `origin/main` | Set |
|---|---|---|
| `descuento-global` | no existe (spec cerrada, implementación pendiente) | **degradado** |
| `cronograma` | existe (4 recursos) | encendido → plan 055 |
| `plantillas` | existe | encender → plan 048 |
| `plantillas-proyecto` | existe | encender → plan 049 |
| `documentos` | solo ET DOCX | parcial → plan 051 |
| `admin` | solo bases centrales | parcial → plan 050 |

**Corregir los tipos aunque el módulo quede apagado.** La forma canónica (`07-api-contract.md` §5,
rollout 2026-08-31) usa `cdAntes` y **no tiene `cdAjustado`**:

```jsonc
DescuentoGlobalRequest { "porcentaje": "0.0300" }

DescuentoGlobalPreviewResponse {
  "porcentaje": "0.0300",
  "porApu": [ { "apuId": "<UUIDv7>", "codigo": "…",
                "cdAntes": "10.200000",   // ← el front no lo tiene
                "cd":      "10.020000",
                "ci":      "1.803600",
                "ct":      "11.823600" } ],
  "totalGeneralActual": "…", "totalGeneralProyectado": "…" }
```

`DescuentoGlobalPreviewResponse` en `contract.ts:194` declara `{cd, cdAjustado, ci, ct}`.
`cdAjustado` está **WITHDRAWN**: el descuento dejó de ser un paso intermedio del cálculo del pie
(la cadena activa es `CD → CI → CT`). Renombrar a `cdAntes` y corregir el diálogo, que hoy rotula
una columna «CD ajustado» que ya no existe en el modelo.

Semántica que el diálogo debe reflejar cuando se encienda, porque cambia lo que se le muestra al
usuario:

- reduce **columnas de la base PROYECTO**, no un porcentaje del APU: `tarifa` en EQUIPO y
  TRANSPORTE, `precio_unitario` en MATERIAL
- **MANO_OBRA exenta por ley**; Herramienta Menor tampoco se descuenta (es derivada de N)
- las filas con override `NULL` heredan el cambio solas (null-means-inherit, DM §8)
- el rango sale de `ParametrosSistema.rango_descuento_min` / `rango_descuento_max`, **no** está
  fijo en 0–50 — el `0–50` cableado en la UI es un valor por defecto disfrazado de regla
- reversible poniendo 0 % (restauración de snapshot)

Test: el diálogo renderiza el estado degradado y **no** dispara ninguna petición.

> ~~**Preguntar antes de ejecutar esta rebanada.**~~ **RESUELTO 2026-09-06 por el orquestador —
> ejecuta la rebanada 1 tal cual, degradando.**
>
> Verificado contra `origin/main @ c337950`: cero endpoints `descuento-global`
> (`git grep -i 'descuento-global\|descuentoGlobal' origin/main -- '*.java'` → sin resultados).
> Los únicos 4 archivos que mencionan «descuento» son el **retiro** del descuento de APU —
> `plans/015-retirar-descuento-apu.md` y tres tests que **afirman que el endpoint ya no existe**
> (`DescuentoEndpointRetiradoTest`, `DescuentoRetiradoContratoTest`, `DescuentoRetiradoMotorTest`).
>
> La única implementación (`DescuentoGlobalService`, `e3fb8ba`) vive en `test/stuff`, sin tocar
> desde el 2026-08-30, rama que el proyecto ya decidió **no mergear**. No está «a días»: está
> ausente a propósito, y volver a añadirlo sería un cambio de especificación, no una entrega
> pendiente. Degradar es lo correcto.

### Rebanada 2 — `porcentajeIndirecto` se descarta en silencio

`useApuEditor.ts:146` mete `porcentajeIndirecto` dentro del body de `PATCH /apus/{id}`. El record
del backend es `ApuPatchRequest(codigo, descripcion, unidad)` — nada más. Jackson lo tira sin
avisar y la UI muestra éxito.

El endpoint real es `PATCH /apus/{apuId}/porcentaje-indirecto`, y el body es un **`BigDecimal`
crudo**, no un objeto:

```
PATCH /api/v1/apus/{apuId}/porcentaje-indirecto
Content-Type: application/json

12.5
```

Además hay que borrar `ApuPatchRequest.porcentajeIndirecto` de `contract.ts`: declara un campo
que el backend nunca aceptó.

**Test rojo primero.** El handler MSW de `PATCH /apus/:id` debe **rechazar con 400 cualquier
propiedad fuera de `{codigo,descripcion,unidad}`** — es lo que hace el backend de facto al
ignorarla, y un handler permisivo es exactamente lo que dejó pasar este bug. Con esa regla, el
test de «editar %CI» falla hoy.

### Rebanada 3 — `descripcion` vs `descripcionRubro`

`usePlantillas.ts:33` manda `descripcion`; el backend declara `descripcionRubro`. Mismo patrón:
200 con el campo en el suelo.

Mismo método: endurecer el handler de plantillas para rechazar propiedades desconocidas, ver el
test caer, renombrar el campo.

### Rebanada 4 — el descuento de APU está retirado a propósito

`useApuEditor.ts:157` hace `POST /apus/{id}/descuento`. Ese endpoint **no fue olvidado, fue
retirado**, y ahora hay respaldo en las dos puntas:

- **Backend:** `DescuentoEndpointRetiradoTest` y `DescuentoRetiradoContratoTest` afirman que
  `ApuResource` no debe exponer `@PATCH /porcentaje-descuento` (citan el Plan 015). Re-añadirlo
  rompe la suite.
- **Docs:** rollout 2026-08-31 (v1.3 §2.5.4 / N04 §A1) marca **WITHDRAWN** el proceso P-24, la
  pantalla S-24, el endpoint, `DescuentoRubroRequest`, el campo `porcentajeDescuento` en
  `ApuPatchRequest`/`ApuResponse`/`ApuCalculoResponse`, el paso `CD_ajustado`, la operación
  `operacionCdAjustado` y los tests TC-P24-01/02. La columna `apu.porcentaje_descuento` queda en
  el DDL V001 como **seam inerte** (default `0.0000`, nunca leída ni escrita).

Ya no es una pregunta abierta de producto: es una decisión tomada y documentada en cascada.

Acción en el frontend: **borrar** `aplicarDescuento` y `DescuentoRubroRequest`, y quitar el control
de la UI del editor de APU. No dejarlo deshabilitado con tooltip «próximamente» — eso promete algo
que el backend decidió no tener.

Borrar también `porcentajeDescuento` de `ApuResponse` y `cdAjustado` de `ApuCalculoResponse` en
`contract.ts` — el mismo rollout los retiró, y el plan que corrija `ApuCalculoResponse` (§5.4 del
handoff) se encontrará con ellos.

## Nota de método

Las rebanadas 2 y 3 comparten causa raíz: **los handlers MSW aceptan cualquier body**. Mientras
sea así, el seam no puede detectar un campo de más ni uno mal nombrado, y este plan se volverá a
abrir con otro campo distinto dentro de dos meses.

El arreglo real es el **plan 028 (validación Zod en el seam)**, que valida en runtime en ambas
direcciones. Este plan tapa tres agujeros conocidos; el 028 cierra la clase entera. No dejar el
028 para después de encender módulos nuevos: cada módulo encendido sin él es otra superficie
donde una deriva de contrato pasa el gate.

## Definición de hecho

- `npm run verify` en verde.
- `descuento-global` en `MODULOS_SIN_BACKEND`; el diálogo no emite peticiones.
- Cero referencias a `POST /apus/{id}/descuento`, `porcentajeIndirecto` en `ApuPatchRequest`,
  y `descripcion` en el request de plantilla.
- Los handlers MSW de APU y plantillas rechazan propiedades desconocidas con 400.
