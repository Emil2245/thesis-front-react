# Plan 063 — El manejo de errores del frontend no coincide con el backend en ningún módulo

**Status:** HECHO
**Escrito contra:** frontend `main` tras la ola 5 tanda 1 · backend `origin/main` @ `c337950`
**Fuente de verdad:** `GlobalExceptionMapper`, `ProblemaException` y `ErrorPayload` en `origin/main`
**Esfuerzo:** M (3–4 h) · **Riesgo:** MEDIO — toca las 4 pantallas de auth y 4 más
**Ola:** 6, **antes** del `060`
**Origen:** hallazgo del plan `055`, verificado por el orquestador

## El defecto

El frontend cree que el backend habla **RFC 7807 (`application/problem+json`)**. No lo hace.
Nunca lo ha hecho.

```java
// ec.uce.propuestas.common.ErrorPayload — el cuerpo de error, entero
public record ErrorPayload(String codigo, String mensaje) {}
```

`GlobalExceptionMapper` envuelve **todo** en `ErrorPayload`, y `ProblemaException` construye
`new ErrorPayload(codigo, mensaje)`. Dos campos: `codigo` y `mensaje`. No hay `type`, ni `title`,
ni `status`, ni `detail`, ni `errores[]`.

> **Cuidado con el grep.** Dos archivos del backend mencionan `problem+json` y `ProblemDetails`:
> `ProblemaException:10` y `DocumentoResource:32`. **Los dos son comentarios y los dos mienten.**
> La línea 22 de `ProblemaException` construye un `ErrorPayload`. No te fíes del javadoc; lee el
> `entity(...)`.

Enfrente, `src/api/problem.ts`:

```ts
export interface Problem {
  type: string; title: string; status: number;
  detail?: string; instance?: string;
  errores?: Array<{ campo: string; mensaje: string }>;
}

get slug(): string {
  return this.problem.type?.replace(/^\/problemas\//, "") ?? "";
}
is(t: ProblemType): boolean { return this.slug === t; }
```

Con un cuerpo `{codigo, mensaje}`, `problem.type` es `undefined`, `slug` es `""`, y
**`is()` devuelve `false` siempre.** Cada rama de error específica del frontend está muerta en
producción y cae al mensaje genérico.

### Por qué lleva tanto tiempo invisible

`src/test/handlers.ts` tiene **9 llamadas a `problema()`**, y `problema()` fabrica RFC 7807. Los
tests validan el frontend contra un servidor imaginario que sí habla el protocolo que el frontend
espera. Verde en el gate, muerto contra el backend real.

Es la misma clase de defecto que el plan `057` cerró para las formas de DTO y el `062` para
`FormData`, aplicada a la capa de errores: **el mock era la especificación.**

### Qué se degrada hoy en producción

17 usos en 8 archivos. Todos caen al genérico:

| Archivo | Qué deja de distinguirse |
|---|---|
| `features/auth/pages/LoginPage.tsx` | credenciales inválidas · email no verificado · cuenta desactivada |
| `features/auth/pages/RegistroPage.tsx` | email ya registrado · validación por campo |
| `features/auth/pages/VerificarEmailPage.tsx` | token inválido o expirado · cooldown activo |
| `features/auth/pages/RestablecerPage.tsx` | token inválido o expirado · cooldown activo |
| `features/insumos/components/TablaInsumos.tsx` | **insumo-en-uso** — el diálogo con la lista de usos |
| `features/insumos/components/AsistenteImportCsv.tsx` | csv-invalido · fila-protegida |
| `features/apu-editor/pages/ListaApusPage.tsx` | apu-referenciado |
| `features/apu-editor/components/DialogoNuevoApu.tsx` | codigo-duplicado |

El más visible es el de insumos: el usuario borra un insumo en uso y, en vez del diálogo que le
dice **dónde** se usa, recibe «Error». El backend le mandó la razón exacta y el frontend la tiró.

## El arreglo

**Adaptar el frontend al backend, no al revés.** El backend es la fuente de verdad del contrato
(regla del `ORQUESTADOR`), y `{codigo, mensaje}` está en producción y probado.

### Rebanada 1 — el tipo y el parseo

`src/api/problem.ts`:

- `Problem` pasa a ser la forma real: `{ codigo: string; mensaje: string }`. Sin campos opcionales
  inventados.
- `slug` lee `codigo`, no `type`. Es una lectura directa: el backend ya manda el slug pelado
  (`"insumo-en-uso"`), sin el prefijo `/problemas/` que el frontend quitaba.
- `is()` se queda igual por fuera; solo cambia de dónde lee.
- `problemDesconocido(status, detail)` construye `{codigo, mensaje}`.

**Antes de escribir los `PROBLEM_TYPES` definitivos**, saca la lista real:

```bash
cd ../thesis-back-quarkus
git grep -ohE 'ProblemaException\.[a-zA-Z]+\("[a-z-]+"|new ErrorPayload\("[a-z-]+"' origin/main -- '*.java' \
  | grep -oE '"[a-z-]+"' | sort -u
```

Los que hoy están en `PROBLEM_TYPES` y no salgan ahí, **bórralos**: son inventados, como lo era
`reduccion-periodos-requiere-confirmacion` (lo quitó el `055`). Los que salgan y falten, añádelos.

### Rebanada 2 — `errores[]` por campo

`Problem.errores` alimenta `camposConError`, que las pantallas de auth y `DialogoInsumo` usan para
marcar campos. **`ErrorPayload` no tiene ese array**: `GlobalExceptionMapper` reduce una
`ConstraintViolationException` al **primer** mensaje:

```java
String firstMsg = cve.getConstraintViolations().stream().findFirst()
        .map(v -> v.getMessage()).orElse("Datos de entrada inválidos");
return Response.status(400).entity(new ErrorPayload("validacion", firstMsg)).build();
```

Un solo mensaje, sin nombre de campo. Así que **`camposConError` no puede funcionar** y marcar el
campo concreto es imposible con este backend.

Quita `camposConError` y haz que quien lo usaba muestre `mensaje` como error de formulario general.
No lo dejes devolviendo `[]` en silencio: eso es la misma mentira en otra forma.

> **Anótalo como pregunta al backend**, igual que hizo el `058`: *¿debe `ErrorPayload` ganar un
> `errores[]` por campo, o la validación por campo se hace solo en el cliente con Zod?* Hoy hay
> pantallas construidas asumiendo lo primero.

### Rebanada 3 — `insumo-en-uso` y su carga útil

`InsumoEnUseProblem extends Problem { usos: InsumoUsoResponse[] }` asume que el error trae la lista
de usos incrustada. `ErrorPayload` no puede llevarla: son dos strings.

**Comprueba en el backend** cómo llega esa información —lo más probable es que sea el endpoint
`GET /insumos/{id}/usos` que el plan `059` ya corrigió (ruta `/usos`, no `/uso`)— y haz que
`TablaInsumos` reaccione al `codigo` `insumo-en-uso` **pidiendo** los usos, en vez de leerlos del
cuerpo del error. Borra `InsumoEnUsoProblem`.

### Rebanada 4 — los handlers dejan de mentir

`problema()` en `src/test/handlers.ts` fabrica RFC 7807. Reescríbelo para que devuelva
`{codigo, mensaje}` con el `Content-Type` que manda el backend.

**Este es el paso que convierte el plan en permanente.** Mientras `problema()` fabrique 7807, el
gate volverá a dar verde sobre un servidor imaginario.

Los 9 sitios que lo llaman se quedan igual si la firma no cambia.

### Rebanada 5 — Zod en la frontera de error

El plan `028` dejó `getValidado` para las respuestas correctas. Añade el esquema del error y valida
también el cuerpo de error: es la mitad del seam que el `028` no cubrió, y es exactamente donde se
escondió este defecto durante toda la vida del repo.

## Definición de hecho

- `pnpm run verify` en verde y `pnpm run e2e` en verde.
- `src/api/problem.ts` no menciona `type`, `title`, `instance` ni `errores`.
- `grep -rn 'problem+json' src/` → cero.
- `PROBLEM_TYPES` contiene **exactamente** los códigos que emite `origin/main`, sacados con el
  comando de la rebanada 1. Ni uno inventado.
- `problema()` en `src/test/handlers.ts` devuelve `{codigo, mensaje}`.
- Un test por cada rama que hoy está muerta: credenciales inválidas, email no verificado,
  código duplicado, insumo en uso, apu referenciado. Todos rojos si `slug` vuelve a leer `type`.
- La pregunta sobre `errores[]` anotada en este archivo con la respuesta, o marcada como abierta.

---

## Ejecución — resultado

**Status:** HECHO · `pnpm run verify` y `pnpm run e2e` en verde (448 unit, 20 e2e).

### Corrección al plan: el comando de la rebanada 1 se queda corto

El `git grep` que propone el plan devuelve **4** códigos (`base-no-archivada`, `servidor`,
`validacion`, `vigente-duplicado`). Si se borra todo lo que no salga ahí, se cargan códigos
reales. El patrón sólo ve `new ErrorPayload("lit"` y `ProblemaException.factoria("lit"`, y en este
backend los códigos viven en **cinco** sitios, tres de ellos invisibles a ese grep:

1. Hardcodeados dentro de las factorías de `ProblemaException` (`new ProblemaException(400,
   "validacion", …)`) — invisible.
2. El `switch` de `GlobalExceptionMapper.codePorEstatus(status)` — invisible; de aquí sale
   `acceso-denegado`, que el frontend no conocía pese a dispararse en **todo** fallo de rol.
3. El helper privado `AuthService.error(status, codigo, mensaje)` — invisible; de aquí salen
   `email-no-verificado` y `cuenta-desactivada`.
4. `SeguridadExceptionMapper` y `ValidacionExceptionMapper`.
5. `AvanceSegmentoException` y `CronogramaConflictoException`, con su propio `entity(...)`.

El catálogo verificado son **18** códigos, los que están hoy en `PROBLEM_TYPES`.

### Tres códigos del frontend no existen en el backend

Cero apariciones en todo `origin/main`:

| Código inventado | Lo que manda el backend de verdad |
|---|---|
| `insumo-en-uso` | `InsumoCrudService.eliminar` → `ProblemaException.validacion(…)`: **400 `validacion`**, con el conteo dentro de `mensaje`. Además `conteoUsosApu()` es un stub que devuelve `0`, así que el guard ni se dispara, y `GET /insumos/{id}/usos` devuelve `List.of()`. |
| `csv-invalido` | No hay error: los fallos de fila vuelven en un **200** con `ImportResultadoResponse.errores: List<ErrorFila>`. |
| `export-bloqueado` | `DocumentoResource:85` y `EspecificacionesTecnicasService:70` → `validacion`. |

Por eso la rebanada 3 acabó siendo **borrado**, no reconexión: no hay ningún `insumo-en-uso` al que
reaccionar. `usosPrecargados`/`precargados` fuera; `DialogoUsoInsumo` ya pedía los usos a
`GET /insumos/{id}/usos` él solo. El fallo de borrado ahora enseña el `mensaje` del backend.

### La pregunta de la rebanada 2 — `errores[]`

> ¿Debe `ErrorPayload` ganar un `errores[]` por campo, o la validación por campo se hace sólo en el
> cliente con Zod?

**ABIERTA.** Hace falta que la conteste el backend. Lo verificado mientras tanto:

- `ErrorPayload` es exactamente `(codigo, mensaje)`; ninguna respuesta de error lleva jamás un
  array por campo.
- `GlobalExceptionMapper:32-35` **y** `ValidacionExceptionMapper:24-27` colapsan la
  `ConstraintViolationException` con `findFirst()`: si fallan tres campos, el usuario ve un mensaje
  y pierde los otros dos, sin saber a qué campo pertenece el que ve.
- La única forma `{campo, mensaje}` del backend es `ErrorFila(int fila, String campo, String
  mensaje)`, y viaja en un **cuerpo de éxito** (200) del import CSV, no en un error.

Hasta que se decida, `camposConError` y `aplicarErroresDeApi` están **borrados** —no devolviendo
`[]` en silencio, que era la misma mentira en otra forma— y quien los usaba enseña `mensaje` como
error general del formulario. Si el backend añade `errores[]`, se revierte marcando campo a campo.

### Defectos vecinos que salieron del mismo hilo

- `notificarError` hacía `if (is("validacion")) return`: se **tragaba** todos los 400 suponiendo
  que el formulario los pintaría desde `errores[]`. Sin ese array, el usuario se quedaba sin
  ninguna señal. Quitado.
- `problemDesconocido` sintetizaba `no-encontrado`, así que un fallo de red se hacía pasar por un
  404 del servidor. Ahora usa `sin-respuesta`, fuera del catálogo a propósito.
- `useVersionMutaciones` tiraba el mensaje de `version-vigente-protegida` («marque otra como
  vigente primero») y pintaba un genérico. Ya llega al usuario.
- `errorCronograma` en `handlers.ts` era una copia de `problema()` que ya decía la verdad; ahora
  que `problema()` no miente, son la misma función.

### Nota para quien siga

`Problem` conserva el índice abierto **a propósito**: el 409 de configurar cronograma manda
`CronogramaConflictoPayload(codigo, mensaje, perdidas)`, un superconjunto de `ErrorPayload`. Por
eso `errorPayloadSchema` lleva `.passthrough()`: con el `strip` por defecto de Zod, `perdidas` se
perdería y el diálogo de confirmación se quedaría vacío.
