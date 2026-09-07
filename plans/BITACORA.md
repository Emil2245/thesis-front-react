# Bitácora

**Ronda de paridad 1** · ola 1 · **Actualizada:** 2026-09-07
**Backend alineado hasta:** `c337950` → **objetivo de esta ronda: `5673615`**

> La lleva el orquestador ([`ORQUESTADOR-PARIDAD.md`](ORQUESTADOR-PARIDAD.md)). Se escribe **en el momento** en que
> algo cambia de estado, no al final de la sesión: si la sesión se corta, lo que no está escrito
> aquí no ocurrió.
>
> Estados: `⏳ pendiente` · `🔄 en curso` · `🟡 vuelto, sin revisar` · `❌ rechazado` · `✅ verde`

## Ronda de paridad 1 — backend `c337950` → `5673615` (2026-09-07)

Delta del backend: **un commit**, `5673615` «admin panel plans», 63 archivos. Partido en dos
montones según la §1 del orquestador:

- **Código, hay contraparte que implementar:** exportación documental del cronograma (plan 031
  del backend). 21 archivos Java, `CronogramaDocumentoResource` con dos rutas, 6 DTO, perfil XSD
  de MSPDI y 7 casos Bruno ejecutables. → **plan 066**.
- **Solo planes, sin código:** el panel admin (`plans/panel-admin/032`–`040` del backend:
  contrato, log de actividad, usuarios e invitaciones, bases centrales, plantillas de sistema,
  parámetros, instrumentación D13, piloto SUS). **No hay ni un recurso JAX-RS**, así que las
  cuatro claves `admin-usuarios`, `admin-plantillas`, `admin-valores` y `admin-logs` de
  `src/lib/disponibilidad.ts` **siguen degradadas**. No se escribe plan de frontend contra esto.

| Ola | Plan | Estado | Worktree | Commit | Nota |
| --- | ---- | ------ | -------- | ------ | ---- |
| 1 | **066 exportar cronograma (xlsx/pdf/mspdi)** | ⏳ pendiente | — | — | incluye el arreglo del cuerpo de error en `Blob` |

### Notas de la ronda

- 2026-09-07 — **Delta reconfirmado antes de leer nada** (§0.1): `origin/main` del backend sigue
  en `5673615`; `git log c337950..origin/main` = 1 commit. La §5 del orquestador coincidía.
- 2026-09-07 — **El baseline de `AGENTS.md` mentía**: decía 456 tests en 72 archivos, y
  `verify` sobre `main` @ `1344113` da **461 en 74**, exit 0. No es una regresión: el propio
  commit del plan 065 (`f67356e`) dice «verify: 461 tests, exit 0» en su mensaje, y nadie
  actualizó la línea al fusionar. Corregido a 461/74. Es la segunda vez que un baseline caducado
  aparece en este repo (la primera, 197/43 cinco olas atrás).
- 2026-09-07 — **Bug vivo en `main`, entra como rebanada 1 del 066** (§8.2): con
  `responseType: "blob"` axios entrega el cuerpo de **error** como `Blob`, así que
  `errorPayloadSchema.safeParse` de `src/api/client.ts` falla siempre y **cualquier** fallo de
  descarga se degrada a `sin-respuesta`. Hoy solo afea el mensaje del DOCX del plan 051; con el
  cronograma se tragaría el cuerpo del `409 export-bloqueado`, que es el que lleva los
  `bloqueos[]`. Arreglo en el interceptor, que es por donde pasan todos los llamantes.
- 2026-09-07 — ⚠️ **`export-bloqueado` vuelve al catálogo.** `src/api/problem.ts` afirma —con
  razón, contra `c337950`— que el código tenía «cero apariciones en todo el backend» y lo dejó
  fuera de `PROBLEM_TYPES` (plan 063). En `5673615` lo emite
  `CronogramaDocumentoResource.descargar` con el cuerpo tipado `BloqueoExportDetalle`. El plan
  066 lo devuelve y corrige el comentario.
- 2026-09-07 — **§8.1, documentación del backend que miente** (avisado, gana el código): el
  javadoc de `BloqueoExportResponse` documenta como canónico un octavo código,
  `cronograma-avance-final`, que **ningún camino del backend emite** — cero apariciones fuera de
  ese javadoc en todo `origin/main`. El caso real (avance final ≠ 100) sale como
  `cronograma-borrador`. El plan 066 no lo transcribe, y la UI muestra el campo `detalle` en vez
  de una tabla de códigos, así que un código nuevo del backend no la rompe.
- 2026-09-07 — **MSPDI no está en la especificación.** `thesis-docs` no menciona MSPDI ni MS
  Project en ningún archivo; `07-api-contract.md:222` sí acuerda
  `GET /documentos/cronograma/{presupuestoId}?formato=` con 200/404/409 y el código
  `export-bloqueado`, pero no lista el `preflight` ni los formatos. La pantalla de documentos
  **sí** está especificada (P-37, `06-casos-de-uso.md` §G, con «Generar Cronograma» entre los
  cuatro entregables), así que no aplica el §8.3 —no es una pantalla nueva— y el front ofrece los
  tres formatos que el backend sirve. Queda avisado para que los docs se corrijan.

## Estado por plan — ruta cerrada 053–065

| Ola | Plan | Estado | Worktree | Commit | Nota |
| --- | ---- | ------ | -------- | ------ | ---- |
| 0 | 061 política de dinero | ✅ verde | — | 5b1e8fb | fusionado a main · 2º intento |
| 1 | 053 ids UUID | ✅ verde | — | 9564e39 | fusionado a main |
| 2 | 054 descuento global + bugs SILENT | ✅ verde | — | 82edeae | fusionado a main |
| 2 | 059 formas de DTO | ✅ verde | — | e182d2a | fusionado a main · ola 2 cerrada |
| 3 | 057 tests de hook | ✅ verde | — | ad4c0f3 | fusionado a main · ola 3 cerrada |
| 3-bis | **062 FormData rota + banner fantasma** | ✅ verde | — | 921acfd | fusionado a main |
| 4 | 028 Zod en el seam | ✅ verde | — | 7d153bc | fusionado a main · ola 4 cerrada |
| 5 | 055 cronograma (reb. 1–4) | ✅ verde | — | a126d80 | fusionado · cierra sin la reb. 5 |
| 5 | 048 plantillas APU | ✅ verde | — | 21275ad | fusionado |
| 5 | 049 plantillas de proyecto | ✅ verde | — | 0e6aa46 | fusionado · tanda 2 |
| 5 | 050 admin + S-39 | ✅ verde | — | cccb1b0 | fusionado · S-39 parcial, ver plan |
| 5 | 051 export ET DOCX | ✅ verde | — | 065c90a | fusionado · tanda 1 |
| 5 | 052 acciones deshabilitadas | ✅ verde | — | 21275ad | fusionado · **ola 5 cerrada** |
| 5 | 058 **reescrito**: procedencia del insumo | ✅ verde | — | cccb1b0 | fusionado · tanda 1 cerrada |
| 6 | **063 ErrorPayload ≠ RFC 7807** | ✅ verde | — | 6ab61c8 | fusionado |
| 6 | 060 limpieza | ✅ verde | — | a981dae | fusionado · **ola 6 cerrada** |
| 7 | **064 capturas que no miran** | ✅ verde | — | 6962329 | fusionado |
| 8 | **065 dos bugs de UI** | ✅ verde | — | 3db4036 | fusionado · **ruta cerrada** |

### Fuera de las olas

| Plan | Estado | Condición de arranque |
| ---- | ------ | --------------------- |
| 056 responsive | ⏸ en espera | El humano lo pide |
| 055 rebanada 5 (vistas del cronograma) | ⏸ diferida | Entrevista N05 respondida |

## Verificación al arrancar

Baseline **actualizado tras la ola 0**: 46 archivos, 220 tests, verde · `verify` ahora encadena `guard:adr9`.
Baseline original del handoff: **45 archivos, 207 tests, verde** · backend `origin/main` @ `c337950` ·
docs `411242f`. Si no coincide, averígualo antes de despachar.

## Decisiones tomadas en ruta

- 2026-09-06 — ✅ **RUTA CERRADA.** 16 planes verdes y fusionados a `main`. Estado final:
  **74 archivos / 461 tests**, `e2e` 20/20, `guard:adr9` OK, build limpio. Todo empujado a
  `origin/main`.
- 2026-09-06 — **065 aceptado, PNG comprobado por mí.** Los cuatro componentes del desglose tienen
  punto de color y sus cuatro segmentos de barra se pintan. El barrido de raíz que pedí encontró
  un solo `=== null` más sobre un campo de DTO (`FilaDetalle.tsx`, `detalle.insumoId`); el ejecutor
  lo reportó con precisión —`ApuDetalleResponse` **no** es `NON_NULL`, así que ese null sí viaja y
  el check no estaba roto— y lo pasó a `== null` igualmente, que es correcto bajo las dos lecturas.
  Los `--chart-2..5` se **borraron** en vez de mapearse: nadie los usaba.

- 2026-09-06 — **064 aceptado, y miré el PNG yo mismo**: `08-presupuesto.png` ya muestra el
  desglose por componente con cifras, no el boundary. `capturar()` ahora falla ante cualquier error
  boundary, así que las once capturas están protegidas por una sola aserción. Ninguna otra captura
  se cayó al poner la guarda: la 08 era la única pantalla tumbada.
- 2026-09-06 — El 064 además reconcilió **todos** los stubs de `e2e/screenshots.spec.ts` con el
  contrato. Varios estaban mal sin reventar, porque esos endpoints usan `get<T>`, que es un cast
  puro sin Zod. Rechazó bien una supuesta incidencia: `items`/`total` en los stubs de paginación
  **no** es un bug, `client.ts` los normaliza y es la forma real del cable.
- 2026-09-06 — ⚠️ **Plan 065 escrito** (§7 caso 2) con dos bugs de UI que el 064 destapó y no
  arregló, los dos verificados por mí:
  **(1)** `ApuResponse` lleva `@JsonInclude(NON_NULL)`, así que `porcentajeIndirecto` llega
  **ausente** —no `null`— cuando el APU hereda; `PieTotales.tsx:101,107` comparan con `!== null`, y
  `undefined !== null` es `true`, o sea que **todos** los APU muestran «Valor propio». La línea 35
  del mismo archivo usa `!= null`, que es lo correcto.
  **(2)** `--color-chart-1` no está mapeado en el `@theme inline` de `index.css`, así que
  `bg-chart-1` no da color: en la captura, «Equipo» es el único sin punto y su barra es invisible.

- 2026-09-06 — 🔴 **Plan 064 escrito** (§7 caso 2): **`screenshots/08-presupuesto.png` es una foto
  de una pantalla reventada, commiteada en el repo.** Lo miré yo: dice «Algo salió mal en esta
  sección». Causa: el stub de `e2e/screenshots.spec.ts` devuelve una forma plana sin la clave
  `porComponente`, así que `ResumenComponentes` hace `Object.entries(undefined)` y el boundary lo
  atrapa. Roto desde `e44c608` (2026-09-05). **Pero el defecto de verdad es que `capturar()` no
  asserta nada**: navega, fotografía y da verde sobre una pantalla caída. Una sola aserción en
  `capturar()` protege las once capturas. Contra el backend real la pantalla funciona.
- 2026-09-06 — **060 aceptado.** Los 3 `as never` que quedan son **comentarios** que explican su
  retirada, cero casts reales. Dependencias `cmdk` y `@base-ui/react` quitadas con cero referencias
  fuera del lockfile —y el ejecutor encontró que `vite.config.ts` aún las nombraba en
  `manualChunks`, cosa que ningún test habría cazado—. `AGENTS.md` actualizado. Lint 10→7.
- 2026-09-06 — El ejecutor del 060 se corrigió solo: borró `use-mobile.ts` por muerto, el typecheck
  lo cazó (`ui/sidebar.tsx` lo importa), y al restaurarlo encontró un bug real — escuchaba la media
  query `max-width: 767px` pero leía `window.innerWidth`, dos fuentes que discrepan en el umbral.

- 2026-09-06 — **063 aceptado, y el ejecutor cazó un error mío.** El comando `git grep` que escribí
  en la rebanada 1 del plan era **incompleto**: devuelve 4 códigos, y mi instrucción de «borrar lo
  que no salga» habría eliminado `apu-referenciado`, `codigo-duplicado`, `fila-protegida`,
  `no-encontrado` y `credenciales-invalidas`, todos reales. El backend construye códigos en cinco
  sitios y tres no matchean ese patrón. Catálogo verificado: **18 códigos**. Plan corregido.
- 2026-09-06 — **Tres códigos que el frontend se creía no existen en el backend**, verificado:
  `insumo-en-uso` (cero ocurrencias — borrar un insumo en uso devuelve **400 `validacion`** con el
  conteo en el `mensaje`), `csv-invalido` (los errores de fila llegan en un **200** dentro de
  `ImportResultadoResponse.errores`) y `export-bloqueado` (es `validacion`).
- 2026-09-06 — 🔴 **Defecto del backend encontrado de paso, para la lista de preguntas:**
  `InsumoCrudService:83-85` es `private long conteoUsosApu(Long insumoId) { return 0L; }` — un
  stub. La guarda de las líneas 74-78 nunca dispara, así que **se puede borrar un insumo
  referenciado por APUs**. Y `GET /{insumoId}/usos` devuelve `List.of()`. No es del frontend.
- 2026-09-06 — Comprobé yo la regresión del 063: mutando `slug` para que vuelva a leer `type`,
  **21 tests en 9 archivos se ponen rojos**. La guarda es real.

- 2026-09-06 — ✅ **Ola 5 cerrada.** `main`: 70 archivos, **438 tests**, `e2e` 20/20. Capturas
  regeneradas y commiteadas (la deuda que dejó el ejecutor del 049 para evitar conflictos binarios).
- 2026-09-06 — **048 y 052 aceptados.** El 052 encendió el desglose y estuvo bien: su propio plan
  dice «después del `059` para el desglose», y el 059 cerró en la ola 2. Mi prompt fue ambiguo, el
  plan no.
- 2026-09-06 — ⚠️ **Corrección a un hallazgo del ejecutor del 052.** Afirmó que
  `DropdownMenuItem disabled` de Radix dispara `onClick` igual, y que por tanto el POST de duplicar
  salía en producción. **Es un artefacto de jsdom, no un bug.** La clase de shadcn lleva
  `data-disabled:pointer-events-none` (`components/ui/dropdown-menu.tsx:74`), así que en un
  navegador el clic no llega. Los otros tres `disabled` —duplicar proyecto, ver uso de insumo,
  ResumenProyectoPage— están bien deshabilitados. Anotado para que nadie añada guardas redundantes.
- 2026-09-06 — Choque de la tanda 2 resuelto: `disponibilidad.ts` y `Sidebar.test.tsx`. Cada rama
  quitaba una entrada distinta del `Set`; la resolución es quitar **las dos**, no elegir una.

- 2026-09-06 — **049 aceptado.** Verifiqué sus cuatro defectos contra el backend: el endpoint real
  es `POST /proyectos/{proyectoId}/guardar-plantilla` (`PlantillaProyectoGuardarResource:21`), y la
  respuesta es el envoltorio `ProyectoDesdePlantillaResponse(proyecto, advertencias)` — el hook
  tipaba el proyecto pelado, así que la página navegaba a `/proyectos/undefined`. **Corrección al
  plan:** decía `advertencias?: string[]`; el DTO real es
  `AdvertenciaPlantillaResponse{insumoCodigo, motivo, mensaje}`, que ya existía en `contract.ts`.
- 2026-09-06 — El ejecutor del 049 **revirtió a propósito las 10 capturas** que el e2e regeneró
  (solo cambiaba la insignia «pronto» del sidebar): habrían dado 10 conflictos binarios contra la
  rama del 048, que también toca el sidebar. **Pendiente: `pnpm run e2e:screenshots` tras cerrar
  la ola 5.**

- 2026-09-06 — 🔴 **Hallazgo grave, plan 063 escrito** (§7 caso 2): **el backend no habla RFC 7807
  en ningún sitio.** `GlobalExceptionMapper` envuelve todo en
  `ErrorPayload(String codigo, String mensaje)` — dos campos, sin `type`. El frontend espera
  `Problem{type,title,status}` y `ApiError.slug` lee `problem.type`, así que **`is()` devuelve
  `false` siempre** y las 17 ramas de error específicas de 8 archivos están muertas en producción:
  las 4 pantallas de auth, `insumo-en-uso`, `apu-referenciado`, `codigo-duplicado`, CSV. Sigue
  invisible porque los 9 `problema()` de `handlers.ts` fabrican RFC 7807 — **el mock era la
  especificación**, otra vez. Ojo: `ProblemaException:10` y `DocumentoResource:32` dicen
  «problem+json» en **comentarios que mienten**; la línea 22 construye un `ErrorPayload`.
- 2026-09-06 — ⚠️ **Plan 050 corregido: la premisa de S-39 era falsa** (§7 caso 1). Sus «4
  endpoints» son los cuatro de **escritura**; el único `@GET` de `AdminBaseCentralResource` lista
  bases, no insumos. **Los insumos de una base central no se pueden listar**, así que no hay tabla
  y sin tabla no hay editar ni borrar. Construido hasta donde el backend permite (crear + import
  CSV), con la pantalla diciéndolo. Pregunta para el backend anotada en el plan.
- 2026-09-06 — **Choque de la tanda 1 resuelto por el orquestador**, como estaba previsto: tres
  conflictos (`disponibilidad.ts`, `handlers.ts`, `Sidebar.test.tsx`), todos de combinar y no de
  elegir. `verify` tras resolver: 70 archivos / 431 tests, y `e2e` 20/20.

- 2026-09-06 — **055 aceptado, incluidos sus dos archivos compartidos.** Verifiqué la
  justificación de tocar `decimal.ts`: `PesoPonderadoCalculador:31` hace
  `precio.multiply(100).divide(totalGeneral, 4)`, o sea **puntos porcentuales**, no fracción — el
  `formatearPorcentaje` existente habría pintado `7.567,57 %`. `formatearPuntosPorcentaje` va en
  `decimal.ts` y no en `features/cronograma/` porque `guard:adr9` solo permite formateo numérico
  ahí. La entrada quitada de `PROBLEM_TYPES` era cronograma y no existe en el backend.
- 2026-09-06 — **Deuda de documentación abierta:** `thesis-docs/07-api-contract.md` §7 describe el
  cronograma con el contrato viejo. Regla del ORQUESTADOR: gana el código, los docs se corrigen.
  Es otro repo, así que ningún ejecutor lo hace; queda para quien pueda escribir en `thesis-docs`.

- 2026-09-06 — **051 aceptado.** Endpoint verificado en `DocumentoResource:78`
  (`GET /documentos/especificaciones-tecnicas/{presupuestoId}`), las 4 URLs inventadas a cero,
  `documentos` fuera de `MODULOS_SIN_BACKEND`. `descargar()` devuelve `{blob, nombreArchivo}` y
  saca el nombre de `Content-Disposition` en forma normal y RFC 5987, quedándose con el basename
  porque la cabecera viene de la red. `titulo1`/`titulo2` no se exponen: el plan dice «puede», no
  «debe» (su línea 72). Un 400 del endpoint sale como toast genérico porque con `responseType:
  "blob"` axios entrega un Blob al interceptor; declarado por el ejecutor, no bloquea.

- 2026-09-06 — ⚠️ **Plan 058 reescrito** (§7 caso 1): las bases personales **no son construibles**.
  Verificado en `origin/main @ c337950`: (1) `BasesPersonalesResource` son `GET`/`POST`/`DELETE` y
  ninguno mete insumos; (2) `CopiaBaseService` lanza *«fuenteTipo debe ser CENTRAL o PROYECTO»*, así
  que no vale como origen de copia; (3) `InsumoCatalogoService` emite `esCentral ? "CENTRAL" :
  "PROYECTO"` — nunca `PERSONAL`, o sea que una base personal no sale de ninguna búsqueda. Es un
  contenedor con nombre, vacío e invisible. Retiradas sus rebanadas 1 y 2; **queda la 3**, que
  nunca dependió de ellas: mostrar `fuente`/`baseNombre` en `SelectorInsumo`. **Pregunta para el
  backend anotada en el plan.**
- 2026-09-06 — ⚠️ **El handoff se equivoca al llamar la ola 5 «archivos distintos».** Grep de rutas
  por plan: `048`∩`052` comparten `EditorApuPage.tsx`; `051`∩`052` comparten `request.ts`;
  `handlers.ts`, `disponibilidad.ts` y `contract.ts` los tocan tres o más. La ola 5 va en **dos
  tandas secuenciales**, no en un solo disparo de siete.

- 2026-09-06 — **028 aceptado con brecha de alcance declarada.** El plan tiene una condición de
  STOP en «tocar un componente» y el ejecutor la cruzó en `DialogoAgregarItem.tsx`; también deja
  `grep -c getValidado src/features/` en **5**, no en el 4 que pide su DoD. Lo acepto: el bug es
  real —verifiqué que `PresupuestoApuResource.listar` devuelve `Page<ApuResumenResponse>` siempre,
  y el componente hacía `get<ApuResumenResponse[]>` e iteraba un objeto—, el diff son 13 líneas,
  ningún plan de la ola 5 toca ese archivo, y la alternativa era conservar el mock inventado que
  hacía parecer correcto un llamante roto. **Los otros dos puntos del DoD que no cuadran son del
  plan, no del trabajo:** decía 16 entradas de `PROBLEM_TYPES` (hay 15) y ≥201 tests (hay 393).
- 2026-09-06 — `pnpm run e2e` corrido por mí en el worktree: **20 passed, exit 0**. Los fixtures de
  las capturas estaban rancios (ids numéricos pre-053, `precio` en vez de `precioUnitario`); las
  capturas nuevas van en el commit.
- 2026-09-06 — Anotado en el **plan 050**: los handlers de `/admin/usuarios`, `/admin/bases` y
  `/admin/logs` siguen devolviendo `{contenido,total,pagina,tamano}`, forma que no existe. Al
  encender admin hay que migrarlos o se enciende contra un mock inventado.

- 2026-09-06 — **062 aceptado con una desviación de método, comprobada.** El plan pedía leer el
  cuerpo con `request.formData()`; bajo jsdom eso es imposible (el `File` es de jsdom y el
  `Request` de undici, que descarta los bytes del `File` ajeno). Los tests asertan el
  `Content-Type: multipart/form-data; boundary=…` y el marco de las partes. **Verifiqué yo la
  guarda**: reintroduje la cabecera en `client.ts` y los dos tests de subida se pusieron rojos.
- 2026-09-06 — **Efecto colateral real del 062, cazado por el ejecutor.** Quitar el `Content-Type`
  global rompía `PATCH /apus/{id}/porcentaje-indirecto`, que manda un escalar JSON crudo: axios
  solo pone la cabecera sola para objetos planos, y sin ella no serializaba el `null` de «volver a
  heredar». Arreglado en ese único sitio con `patch(url, body, config)`. Es el único cuerpo
  escalar del repo.

- 2026-09-06 — **`main` empujado a `origin`** con permiso del humano: `f823fc6..ad4c0f3`, 28
  commits. El remoto llevaba parado desde el 29 de agosto. El `isolation: "worktree"` del `Agent`
  tool volvería a funcionar, pero sigo con el worktree manual: está probado y controlo la base.
- 2026-09-06 — **Banner `CI_NO_CONFIGURADO`: decidido por el humano, se calcula en el cliente**
  desde `ParametrosProyectoResponse.porcentajeIndirecto == null`. Verificado en `Motor.java:110-112`
  que `null` es «no configurado» y `0` es una elección válida del usuario. Ejecuta el plan 062.
- 2026-09-06 — ⚠️ **Plan 062 escrito** (§7 caso 2): el `057` destapó que `src/api/client.ts` fija
  `Content-Type: application/json` en la instancia axios, y axios 1.19 convierte **todo `FormData`
  a JSON**. Import CSV de insumos y subida de logo llevan rotos desde siempre, con los tests en
  verde porque los handlers no miraban el cuerpo. Va en una ola 3-bis, antes del 028.
- 2026-09-06 — Anotado en el **plan 051**: `descargar()` en `request.ts` devuelve solo `.data`, así
  que la premisa del 051 de leer el nombre de `Content-Disposition` es hoy inalcanzable. El arreglo
  va en `request.ts` y es su primera rebanada.
- 2026-09-06 — **057 aceptado**: cero archivos de producción tocados (comprobado con
  `git diff --name-only`), 66 archivos / 387 tests. Los 4 hooks sin test son los que el propio plan
  exime en su línea 111 porque el `050` los borra.

- 2026-09-06 — **059 aceptado.** Verifiqué dos hallazgos suyos contra el backend y los dos son
  ciertos: `ApuDetalleCrearRequest` exige `seccionTipo` `@NotNull` (añadir línea de APU era un 400
  duro), e `InsumoCatalogoService:67` emite `esCentral ? "CENTRAL" : "PROYECTO"` — el frontend
  comparaba con `"LOCAL"`, así que **todo insumo de proyecto se pintaba como Central**.
- 2026-09-06 — Los dos restos del grep del DoD del 059 tienen dueño: `ActividadResponse.rubroId` es
  del `055` (lo nombra en sus líneas 115 y 241), y los `cdAjustado`/`porcentajeDescuento` que
  quedan son comentarios que explican el retiro, no campos.
- 2026-09-06 — ⚠️ **Trabajo huérfano encontrado, plan escrito** (§7 caso 2): el banner
  `CI_NO_CONFIGURADO` de `ResumenProyectoPage` lee `proyecto.alertas`, campo que **no existe en
  `ProyectoResponse`** y cuya constante no aparece en ningún sitio del backend. El fixture se lo
  inventa y el test pasa por encima: el banner no sale nunca en producción. Añadido como sección al
  plan **057**, que es donde toca. **Tiene una decisión de producto pendiente del humano.**

- 2026-09-06 — **054 aceptado, y el plan estaba mal en un detalle peligroso.** Su ejemplo de body
  para `PATCH /apus/{id}/porcentaje-indirecto` decía `12.5`, sugiriendo porcentaje. Es **fracción**:
  `ApuResourceIT` manda `"0.2200"` y espera `0.22`. El ejecutor lo dedujo bien por su cuenta y lo
  verifiqué contra el backend; el plan queda corregido para quien lo lea después.
- 2026-09-06 — Causa raíz cerrada de paso: los handlers MSW aceptaban cualquier body, que es lo que
  dejó pasar los tres bugs SILENT. Ahora hay una lista blanca `soloCampos` que devuelve 400 ante
  propiedad desconocida, marcada con `ponytail:` porque el arreglo de fondo es el plan 028.

- 2026-09-06 — **Decisión #6 del handoff resuelta por el orquestador: se degrada `descuento-global`.**
  El plan 054 rebanada 1 pedía preguntar por si el backend estuviera «a días». No lo está:
  `origin/main @ c337950` tiene **cero** endpoints `descuento-global`, y los únicos 4 archivos que
  dicen «descuento» son el retiro del descuento de APU más tres tests que afirman que el endpoint
  no existe. La implementación solo vive en `test/stuff` (2026-08-30), rama descartada. Anotado en
  el plan para que el ejecutor no se pare.
- 2026-09-06 — El 1er ejecutor del 054 murió por límite de sesión antes de escribir nada; worktree
  limpio, redespachado sin pérdida.

- 2026-09-06 — **053 aceptado.** Verifiqué la sensibilidad de los tests de guard yo mismo: revertí
  `enabled: !!presupuestoId` a `Number(presupuestoId) > 0` en `usePresupuesto.ts:16` y el test
  correspondiente se puso rojo. El bug era real y grave: con ids UUID, `presupuestoId > 0` era
  falso siempre, o sea que `usePresupuesto`, `useResumen`, `useValidacion`, `useValidacionExport`,
  `useCronograma` y `useApus` **nunca disparaban en producción**.
- 2026-09-06 — Diferidos del 053, todos con dueño: `RubroRefResponse.rubroId` → `059` §4 · ids
  numéricos de los E2E → `021` · **`useVersiones` duplicado en `shell/contexto.ts` → añadido al
  `060`** (unificarlo exige que `shell/` importe de `features/`, decisión de arquitectura).

- 2026-09-06 — **061 aceptado con una desviación**: la guarda ADR 9 vive en `package.json` como
  `pnpm run guard:adr9` dentro de `verify`, no como paso de CI. Verificado: `.gitignore:32` ignora
  `.github/` (commit `7635176`, «bypass workflow token requirement») y el directorio no existe, así
  que un workflow sería letra muerta. Si algún día se despliega CI de verdad, mover la guarda allí.
- 2026-09-06 — Queda **una división en `src/features/**`**: `ResumenProyectoPage.tsx:301`,
  `Number(valor) / totalNum`. Es una proporción de gráfico, no una cifra de dinero — fuera de la
  DoD del 061 a propósito.

- 2026-09-06 — ⚠️ **`isolation: "worktree"` del `Agent` tool NO sirve en este repo.** Ramifica desde
  `origin/HEAD`/`origin/main`, que está en `f823fc6` (2026-08-29); el `main` local va **9 commits
  por delante y nunca se ha empujado**. El primer intento del 061 salió sobre una base sin
  `2ebf40d` (UUIDv7→string), sin el arreglo de formato y **sin el propio archivo del plan**. Su
  `verify` salió verde contra el contrato viejo, o sea que no probaba nada. Rebase sobre `main`:
  5 conflictos en los archivos centrales → descartado, no reconciliado.
  **Protocolo desde ahora:** el orquestador crea el worktree a mano
  (`git worktree add -b <rama> .claude/worktrees/<n> main`) y despacha un `Agent` **sin**
  `isolation`, diciéndole la ruta absoluta. Alternativa que necesita al humano: empujar `main` a
  `origin`.
- 2026-09-06 — **Plan 061 corregido contra `origin/main @ c337950`** (§7 caso 1): la rebanada 2
  afirmaba que `GET /presupuestos/{id}/comparar` devuelve la comparación calculada. Falso —
  `ComparacionVersionesResponse(List<ComparacionItem>)` devuelve dos totales string y **ninguna
  diferencia**. Se aplica el fallback. De paso: el DTO del frontend (`versionA`/`versionB`/
  `capitulos[].diferencia`) es deriva; le toca a `053`/`059`.

- 2026-09-06 — **Baseline no estaba verde**: `format:check` rojo en 16 archivos ya commiteados
  (`e44c608`/`2ebf40d` escribieron a 80 columnas con `printWidth: 100`). Arreglado en `eef0b7d`,
  solo espacios. Typecheck, lint y 45/207 tests sí coincidían. Segunda puerta que se dio por verde
  sin correrla, después del `npx tsc --noEmit`.
- 2026-09-06 — Los planes 053–061 estaban **sin trackear**: un worktree de ejecutor no los habría
  visto. Commiteados en `68088a6` antes de despachar nada.
- 2026-09-06 — 9 worktrees huérfanos de la sesión anterior, todos vacíos y sin commits. El borrado
  lo bloqueó el clasificador de permisos; se dejan, no estorban.
- 2026-09-06 — Dinero: editable `number` cuantizado, solo lectura `string`. Plan 061.
- 2026-09-06 — Responsive: escritorio y móvil, tres fases, prioridad baja, arranque a petición.
- 2026-09-06 — `test/stuff` no se mergea: esperar a main.

## Bloqueado esperando al humano

- Entrevista **N05** (cronograma): 7 preguntas sin responder. Bloquea **solo** la rebanada 5 del
  plan 055. Ninguna ola la espera.
