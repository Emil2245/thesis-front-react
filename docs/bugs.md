# Defectos encontrados en el seam — catálogo y patrones

**Levantado:** 2026-09-06 · **Frontend:** `main` @ `32323b5` · **Backend:** `origin/main` @ `c337950`

Este documento existe porque el repositorio pasó meses con la suite en verde mientras seis
funcionalidades **no funcionaban en producción**. Ninguno de los defectos de aquí fue detectado por
`pnpm run verify`, y varios llevaban vivos desde julio.

Lo importante no es la lista. Son los **cuatro patrones** de §1: si los reconoces, no necesitas
esta lista. Si no, la vas a volver a escribir con nombres distintos dentro de dos meses.

---

## 0. La regla de los números, primero

> **Se visualiza en string. Se maneja en número.**
> — decisión del autor, 2026-09-06

Traducido a código, son **dos ejes que hay que mantener separados**. Confundirlos en uno solo es lo
que produjo los 11 `as never` que el repo arrastraba.

| Eje                                       | Quién lo decide            | Regla                                                                                    |
| ----------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------- |
| **Transporte** — qué viaja por el cable   | El backend. No se negocia. | `string` donde el backend serializa string · `number` donde serializa number             |
| **Manejo** — qué haces con el dato dentro | Esta decisión              | **Solo lectura → `string`** (se visualiza tal cual) · **Editable → `number`** cuantizado |

### El eje de transporte, medido

| Módulo                   | Campos                                                                                         | JSON                            |
| ------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------- |
| Presupuesto y cronograma | `totalGeneral`, `precioTotal`, `cantidad`, `pesoPonderado`, `avancePorPeriodo`                 | **string**                      |
| APU, insumo, parámetros  | `costoDirecto`, `costoIndirecto`, `costoTotal`, `precioUnitario`, `iva`, `porcentajeIndirecto` | **number**                      |
| Requests                 | todos                                                                                          | acepta número o string numérico |

**No lo adivines por el nombre del campo.** `precioTotal` es string y `precioUnitario` es number.
Lee el record de Java.

### Las tres reglas que se derivan

1. **El frontend no hace aritmética de dinero. Nunca.** Es la ADR 9: la variable de tesis
   `exactitud_calculo` depende de que no exista una segunda implementación del cálculo en
   TypeScript. Una diferencia entre dos totales **se le pide al backend** o se muestran las dos
   cifras. Hay guarda automática: `pnpm run guard:adr9`, encadenada dentro de `verify`.
2. **Se cuantiza una sola vez, en la frontera de entrada.** Cuando el usuario teclea, se convierte
   a número con la escala del campo y no se vuelve a tocar. El helper es
   `parsearEntradaNumerica(entrada, escala)` en `src/lib/decimal.ts`.
3. **Escalas fijas:** dinero **6** decimales (`ESCALA_DINERO`), porcentajes y avances **4**
   (`ESCALA_PORCENTAJE`). El backend cuantiza a esas escalas y rechaza más.

`toFixed` y `parseFloat` **solo** dentro de `src/lib/decimal.ts`. Cualquier otro sitio es un
segundo motor de cálculo naciendo.

### La doctrina anterior era falsa

Hasta el 2026-09-06 este repo afirmaba, en el README y en `AGENTS.md`:

> «Money travels as decimal strings … never parse to `number` and send it back»

**Es falsa desde que existe el backend real**, y fue exactamente la que produjo los `as never`: si
un DTO te obliga a castear para que compile, el que está mal es el DTO, no el dato. Si encuentras
esa frase en algún sitio, es documentación caducada — bórrala.

---

## 1. Los cuatro patrones

Todo lo de §2 cae en uno de estos. Son la parte reutilizable.

### Patrón A — el mock era la especificación

El caso más frecuente y el más caro. El handler MSW o el stub de Playwright inventa una forma que
el backend nunca ha mandado; el test valida el frontend contra un servidor imaginario que sí habla
el protocolo que el frontend espera. **Verde en el gate, roto en producción.**

Apareció **seis veces**, con seis caras distintas: formas de DTO, cuerpos de petición, la capa de
errores entera, la paginación de admin, los stubs de las capturas y el campo `alertas` que el
frontend se inventó.

> **Contramedida, ya instalada:** handlers estrictos (`soloCampos` en `src/test/handlers.ts`
> devuelve 400 ante propiedad desconocida), Zod en el seam (`getValidado`, `src/api/schemas.ts`) y
> validación del cuerpo de error. Un handler permisivo es un test que no prueba nada.

### Patrón B — el centinela numérico contra un id UUID

`presupuestoId > 0`, `usarId > 0`, `Number(params.id) === 99`. Escritos cuando los ids eran `Long`.
Con UUID string, **la comparación es falsa o `NaN` siempre**, y la rama entera se vuelve
inalcanzable — sin error, sin warning, sin test rojo.

> **Contramedida:** `!!id`. Y cuando cambies un tipo de id, `grep` las comparaciones numéricas
> antes de dar por hecho que el typecheck te cubre: `NaN > 0` compila perfectamente.

### Patrón C — el campo ausente no es el campo nulo

El backend usa `@JsonInclude(NON_NULL)` en varios records. Un campo nulo en Java **no aparece** en
el JSON: llega `undefined`, no `null`. Un `!== null` es entonces siempre verdadero.

> **Contramedida:** `!= null` (desigualdad laxa) para cualquier campo que venga del backend. Y en
> las fixtures, **omitir la clave** en vez de ponerla a `null` — una fixture con `null` hace pasar
> en falso el test que debía cazar esto.

### Patrón D — el test que no mira

Un test que navega y captura sin assertar. Un test de página que comprueba que «cargó». Un test de
mutación que comprueba que «resolvió». Todos pasan sobre una pantalla completamente caída.

> **Contramedida:** todo plan que toque un hook deja un **test de contrato sobre la petición
> saliente**, no un test de página. Y `capturar()` en `e2e/screenshots.spec.ts` ahora falla si hay
> un error boundary en la página — una aserción protege las once capturas.

---

## 2. El catálogo

Estado: todos **corregidos** salvo los marcados 🔴, que son del backend.

### 2.1 Funcionalidades que no funcionaban en producción

| #   | Qué estaba roto                                                                                                                     | Causa                                                                                                                                                                                                                    | Patrón | Plan  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ----- |
| 1   | **Seis hooks nunca disparaban**: `usePresupuesto`, `useResumen`, `useValidacion`, `useValidacionExport`, `useCronograma`, `useApus` | `enabled: presupuestoId > 0` con id UUID → siempre falso                                                                                                                                                                 | B      | `053` |
| 2   | **Import CSV de insumos y la antigua subida de logo mandaban JSON sin el fichero**                                                  | `src/api/client.ts` fijaba `Content-Type: application/json` en la instancia axios; axios 1.19 convierte todo `FormData` a JSON con esa cabecera                                                                          | A      | `062` |
| 3   | **Ninguna rama de error específica funcionaba, en ningún módulo** (17 usos en 8 archivos)                                           | El backend emite `ErrorPayload{codigo, mensaje}`; el frontend esperaba RFC 7807 y `ApiError.slug` leía `problem.type` → `is()` siempre `false`                                                                           | A      | `063` |
| 4   | **Añadir una línea de APU daba 400**                                                                                                | `ApuDetalleCrearRequest` no mandaba `seccionTipo`, que es `@NotNull`                                                                                                                                                     | A      | `059` |
| 5   | **Todo insumo de proyecto se pintaba como Central**                                                                                 | `SelectorInsumo` comparaba `fuente` con `"LOCAL"`; `InsumoCatalogoService` emite `esCentral ? "CENTRAL" : "PROYECTO"`                                                                                                    | A      | `059` |
| 6   | **Guardar plantilla de proyecto daba 404**                                                                                          | `POST /plantillas-proyecto` con el id en el cuerpo; el endpoint real es `POST /proyectos/{proyectoId}/guardar-plantilla`                                                                                                 | A      | `049` |
| 7   | **Crear desde plantilla navegaba a `/proyectos/undefined`**                                                                         | El hook tipaba el proyecto pelado; el backend devuelve el envoltorio `ProyectoDesdePlantillaResponse{proyecto, advertencias}`                                                                                            | A      | `049` |
| 8   | **El diálogo «crear desde plantilla» no abría nunca**                                                                               | Centinela `useState(0)` con `usarId > 0` contra ids string                                                                                                                                                               | B      | `049` |
| 9   | **La pantalla de bases centrales reventaba**                                                                                        | El mock devolvía una lista pelada, pero el backend devuelve `Page<T>`; el cliente no validaba la página normalizada                                                                                                      | A      | `050` |
| 10  | **Guardar parámetros de sistema daba 400**                                                                                          | Mandaba 4 campos de los 11, y 10 son `@NotNull`                                                                                                                                                                          | A      | `050` |
| 11  | **`AdminParametrosPage` pintaba valores por defecto sobre un 404**                                                                  | El handler de `/proyectos/:id` capturaba `/proyectos/parametros-sistema`; las rutas literales deben registrarse antes que las paramétricas                                                                               | A      | `057` |
| 12  | **`porcentajeIndirecto` se descartaba en silencio**                                                                                 | Iba dentro del cuerpo de `PATCH /apus/{id}`, que solo acepta `{codigo, descripcion, unidad}`; Jackson lo tiraba y la UI mostraba éxito. El endpoint real es `PATCH /apus/{id}/porcentaje-indirecto` con un escalar crudo | A      | `054` |
| 13  | **Editar %CI no invalidaba nada**                                                                                                   | Invalidaba solo `qk.apus`, y además pegaba al endpoint equivocado, así que nunca funcionó                                                                                                                                | —      | `054` |
| 14  | **El nombre de archivo de las descargas era inalcanzable**                                                                          | `descargar()` devolvía solo `.data`; ningún llamante podía leer `Content-Disposition`                                                                                                                                    | —      | `051` |
| 15  | **`DialogoAgregarItem` iteraba un objeto**                                                                                          | `get<ApuResumenResponse[]>` sobre un endpoint que devuelve `Page<ApuResumenResponse>` siempre                                                                                                                            | A      | `028` |
| 16  | **Guardar plantilla dejaba «Mis plantillas» rancia**                                                                                | `DialogoGuardarPlantilla` llamaba a `post` en paralelo al hook, sin invalidar                                                                                                                                            | —      | `052` |
| 17  | **Las cuatro pantallas de auth no distinguían ningún error**                                                                        | Consecuencia del #3: credenciales inválidas, email no verificado, cuenta desactivada, token expirado y cooldown caían todos al mensaje genérico                                                                          | A      | `063` |
| 18  | **`notificarError` se tragaba todos los 400**                                                                                       | Esperaba un `errores[]` que el backend nunca ha mandado                                                                                                                                                                  | A      | `063` |
| 19  | **Un fallo de red se hacía pasar por 404**                                                                                          | `problemDesconocido` sintetizaba `no-encontrado`                                                                                                                                                                         | —      | `063` |
| 20  | **`use-mobile` discrepaba consigo mismo en el umbral**                                                                              | Escuchaba la media query `max-width: 767px` pero leía `window.innerWidth`                                                                                                                                                | —      | `060` |

### 2.2 Cifras mal calculadas o mal mostradas

| #   | Qué se veía                                        | Causa                                                                                                                                                                             | Plan  |
| --- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 21  | `39511.53200000001` en la comparación de versiones | `Number(vB.totalGeneral) - Number(vA.totalGeneral)` — aritmética de dinero en el cliente. **El endpoint no devuelve diferencias**: `ComparacionVersionesResponse` son dos totales | `061` |
| 22  | `Porcentaje (0–28.999999999999996 %)`              | `Number(rangoDescuentoMax) * 100` sin cuantizar                                                                                                                                   | `061` |
| 23  | Colas de float dentro de inputs del formulario     | Siete `Number(params.x) * 100` en `ParametrosPage`                                                                                                                                | `061` |
| 24  | `7.567,57 %` como peso de una actividad            | El cronograma manda **puntos porcentuales** (`"75.6757"`); `formatearPorcentaje` esperaba fracción y multiplicaba por 100                                                         | `055` |
| 25  | **Todos** los APU decían «Valor propio»            | `apu.porcentajeIndirecto !== null` sobre un campo omitido por `@JsonInclude(NON_NULL)`. La línea 35 del mismo archivo ya usaba `!= null`                                          | `065` |
| 26  | «Equipo» sin color y con la barra invisible        | `--chart-1` definida en `index.css` pero **no mapeada** en `@theme inline`; Tailwind v4 genera `bg-*` desde `--color-*`                                                           | `065` |

### 2.3 Contratos que el frontend se inventó

| #   | Qué declaraba el frontend                                                                                           | Qué manda el backend                                                                                                                                                  | Plan         |
| --- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 27  | `RubroResponse.alertas`                                                                                             | No existe                                                                                                                                                             | `053`        |
| 28  | `ProyectoDetalleResponse.alertas` con el banner `CI_NO_CONFIGURADO`                                                 | `ProyectoResponse` no tiene `alertas`, y `CI_NO_CONFIGURADO` no aparece en ningún archivo del backend. El banner **no podía salir nunca**; el fixture se lo inventaba | `062`        |
| 29  | `ApuResponse.porcentajeDescuento`, `ApuCalculoResponse.cdAjustado`                                                  | Retirados por diseño; hay contract tests del backend que **afirman que el endpoint no existe**                                                                        | `054`        |
| 30  | `PROBLEM_TYPES` con `reduccion-periodos-requiere-confirmacion`, `insumo-en-uso`, `csv-invalido`, `export-bloqueado` | Ninguno existe. Borrar un insumo en uso devuelve **400 `validacion`**; los errores de CSV llegan en un **200**                                                        | `055`, `063` |
| 31  | `InsumoUsoResponse` y la ruta `/uso`                                                                                | Forma distinta y la ruta es `/usos`                                                                                                                                   | `059`        |
| 32  | `RubroRefResponse.rubroId`                                                                                          | El campo es `id`                                                                                                                                                      | `059`        |
| 33  | `PlantillaApuEditarRequest.descripcion`                                                                             | `descripcionRubro`                                                                                                                                                    | `054`        |
| 34  | `advertencias?: string[]`                                                                                           | `List<AdvertenciaPlantillaResponse>` — objetos `{insumoCodigo, motivo, mensaje}`                                                                                      | `049`        |
| 35  | Handlers de admin con `{contenido, total, pagina, tamano}`                                                          | `Page<T>` = `{items, total, page, size, totalPaginas}`                                                                                                                | `050`        |

### 2.4 Tests y capturas que mentían

| #   | Qué                                                                                                                                                                                                                                                                                                                      | Plan  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| 36  | **`screenshots/08-presupuesto.png`, commiteada en el repo, era la foto de una pantalla reventada.** El stub devolvía una forma sin `porComponente`, `Object.entries(undefined)` lanzaba, y el error boundary lo atrapaba. `e2e` daba 20/20 porque el test navegaba y fotografiaba sin assertar. Roto desde el 2026-09-05 | `064` |
| 37  | Las ramas 409 de `insumo-en-uso` y `apu-referenciado` comparaban `Number(params.id)` con `99`/`2` — `NaN` contra un UUID, código muerto inalcanzable                                                                                                                                                                     | `057` |
| 38  | Las capturas con versión (`03`, `06`, `08`, `09`, `10`) fotografiaban un estado vacío: la fixture usaba `{id, numero, vigente}` en vez de `{presupuestoId, version, esVigente}`                                                                                                                                          | `055` |
| 39  | **26 de 27 hooks sin test.** La suite cubría páginas y componentes — la capa que consume el hook ya mockeado — nunca la que habla con la red. Y en los hooks vivía cada uno de estos defectos                                                                                                                            | `057` |
| 40  | `vite.config.ts` nombraba en `manualChunks` dos dependencias borradas. Ningún test podía cazarlo                                                                                                                                                                                                                         | `060` |

---

## 3. 🔴 Defectos del backend (no son nuestros)

Verificados leyendo `origin/main @ c337950`. **Aquí no se arreglan**; están anotados para quien
lleve el backend.

1. **Se puede borrar un insumo referenciado por APUs.**

   ```java
   // InsumoCrudService:83-85
   private long conteoUsosApu(Long insumoId) {
       return 0L;
   }
   ```

   La guarda de las líneas 74-78 —«No se puede eliminar el insumo: está referenciado en N partes de
   APU»— nunca dispara. Y `GET /{insumoId}/usos` devuelve `List.of()`.

2. **Las bases personales no son utilizables.** `BasesPersonalesResource` tiene `GET`, `POST` y
   `DELETE`, pero **ningún endpoint mete insumos dentro**; `CopiaBaseService` rechaza cualquier
   `fuenteTipo` que no sea `CENTRAL` o `PROYECTO`; e `InsumoCatalogoService` nunca emite
   `PERSONAL`, así que no salen en ninguna búsqueda. Un contenedor con nombre, vacío e invisible.
   ¿Se completan o se retiran?

3. **`ErrorPayload` no lleva `errores[]` por campo.** Los dos mappers colapsan el conjunto de
   violaciones con `findFirst()`, así que marcar el campo concreto en un formulario es imposible
   con este contrato. ¿Se añade, o la validación por campo se hace solo en el cliente con Zod?

4. **No hay lectura de los insumos de una base central.** Los cuatro endpoints de
   `/admin/bases-centrales/{id}/insumos` son de escritura; el único `@GET` del recurso lista bases.
   Sin lectura no hay tabla, y sin tabla no hay editar ni borrar por fila (S-39 quedó a medias a
   propósito).

5. **Dos javadoc mienten.** `ProblemaException:10` dice «lo convierte en la respuesta problem+json»
   y `DocumentoResource:32` habla de «ProblemDetails». Los dos construyen `ErrorPayload`. **Lee el
   `entity(...)`, no el comentario.**

---

## 4. Trampas del entorno

Cosas que no dan error y te hacen perder una tarde.

- **`npx tsc --noEmit` no comprueba nada en este repo.** `tsconfig.json` es `"files": []` con
  project references, así que siempre sale 0. El real es **`pnpm run typecheck`** (`tsc -b
--noEmit`). Un commit se dio por limpio con el comando falso llevando 8 errores dentro.
- **pnpm, no npm.** Los scripts de `verify` encadenan `pnpm run`.
- **No hay CI.** `.github/` está en `.gitignore` (commit `7635176`, «bypass workflow token
  requirement») y el directorio no existe. Cualquier guarda que quieras hacer cumplir tiene que ir
  dentro de `pnpm run verify`, no en un workflow: allí sería letra muerta.
- **Playwright reutiliza el dev server.** `playwright.config.ts` usa `reuseExistingServer`; si
  tocas un componente y las capturas siguen viendo lo viejo, reinicia `vite`.
- **jsdom no aplica `pointer-events`.** Un `DropdownMenuItem disabled` de Radix **sí** dispara
  `onClick` en un test, y **no** en un navegador — shadcn le pone `data-disabled:pointer-events-none`.
  No confundas ese artefacto con un bug de producción.
- **jsdom no puede leer un `FormData` multipart.** El `File` global es de jsdom y el `Request` de
  undici, que descarta los bytes de un `File` ajeno. Para probar una subida, asserta el
  `Content-Type: multipart/form-data; boundary=…` y el marco de las partes, no
  `request.formData()`.

---

## 5. Cómo no volver aquí

1. **Un handler permisivo es un test que no prueba nada.** Si el mock acepta cualquier cuerpo, el
   seam es estructuralmente ciego a un campo de más o mal nombrado.
2. **Todo plan que toque un hook deja un test de hook** — sobre la petición saliente. Un test que
   monta la página y comprueba que «cargó» sigue verde contra todos los defectos de §2.
3. **Lee el record de Java antes de tipar un DTO.** Ocho de los planes de esta ruta tenían premisas
   falsas sobre el backend, y todas cayeron con cinco minutos de `git show origin/main:<path>`. El
   backend es la fuente de verdad del contrato; los docs se corrigen cuando discrepan.
4. **Mira las capturas.** Que el test pase no es prueba de que la pantalla se vea. Ese fue el
   defecto #36 y estuvo commiteado en el repo, en un PNG, a la vista de todos, durante semanas.
