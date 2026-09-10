# Estado de ejecución — rama administrativa 077–081

> **Memoria del orquestador.** Si la sesión muere, se reanuda leyendo **este archivo y nada más**,
> y verificando después con `git log`, `git worktree list` y `git status`. No reiniciar desde cero,
> no re-despachar un plan ya aprobado, no duplicar worktrees.

**RAMA CERRADA el 2026-09-10.** Los cinco planes en DONE y mergeados. Este archivo queda como
registro; ya no hay nada en curso.

**Encargo:** [`PROMPT-ORQUESTADOR-077-081.md`](PROMPT-ORQUESTADOR-077-081.md)
**Rama destino:** `plans/077-081` · **Actualizado:** 2026-09-10

## Referencias fijas de esta rama

| Cosa | Valor |
| --- | --- |
| Backend contra el que se razona | `../thesis-back-quarkus` @ **`2803575`** (`main`, tras `fetch --all`) |
| Backend en ejecución | `http://localhost:8080`, prefijo `/api/v1`, con datos |
| Credenciales SUPER_ADMIN de prueba | `ana.armas@gmail.com` / `Clave1234` — se promovió a mano en la BD de desarrollo y **ya se revirtió** (2026-09-10): los tres usuarios son `USUARIO` y esa cuenta recibe 403 en `/admin/usuarios`, comprobado |
| Prefijo de worktrees | `wa-0XX` (los `w-077`/`w-078` que ya existían son de los capítulos del manual, **otra estirpe**, no tocar) |

## Tablero

| Plan | Estado | Worktree | Rama | Rondas | Nota |
| --- | --- | --- | --- | --- | --- |
| — reactivación | ✅ hecho | — | — | — | banner quitado, índice a TODO, bitácora escrita (`5a7e480`) |
| 077 usuarios | ✅ **DONE, mergeado** | (worktree retirado) | `wa-077` @ `ce226b4` | 1/2 | merge `d23c7e8`; índice a DONE |
| 078 plantillas | ✅ **DONE, mergeado** | (worktree retirado) | `wa-078` @ `67ccd60` | 0/2 | aprobado sin ronda de revisión |
| 079 valores | ✅ **DONE, mergeado** | (worktree retirado) | `wa-079` @ `c90d4ce` | 1/2 | ronda de formato únicamente |
| 080 logs | ✅ **DONE, mergeado** | (worktree retirado) | `wa-080` @ `dc9ae53` | 0/2 | aprobado sin ronda de revisión |
| 081 retirar gates | ✅ **DONE, mergeado** | (worktree retirado) | `wa-081` @ `fa20f5f` | 0/2 | aprobado sin ronda |

## Por qué en serie

077–080 tocan los mismos cuatro archivos compartidos: `src/api/contract.ts`, `src/api/schemas.ts`,
`src/api/queryKeys.ts`, `src/test/handlers.ts`. En paralelo se pisan.

## Deriva encontrada y corregida (aplica a los cinco planes)

1. **El «wrapper de disponibilidad» no existía.** Las cuatro páginas admin renderizaban
   `ModuloNoDisponible` incondicionalmente; `MODULOS_SIN_BACKEND` sólo alimentaba la insignia
   «pronto» de `src/shell/Sidebar.tsx`. Vaciar el `Set` en 081 no habría encendido nada. Cada plan
   de 077–080 crea ahora su wrapper (`<Nombre>Page` consulta el `Set` y delega en
   `<Nombre>PageActiva`), el gate sigue cerrado hasta 081, y
   `src/test/features/admin/pages/paginas-admin.test.tsx` —que afirma cero peticiones— **sigue
   pasando sin editarse** durante 077–080.
2. **`Page` ya se normaliza en el interceptor** de `src/api/client.ts`
   (`{items,total}` → `{contenido,totalElementos}`). Los ejecutores no deben repetirlo:
   `paginaDe()` es `.strict()` y una segunda normalización la rompe.

## Bitácora de transiciones

- **2026-09-10** — Estado inicial verificado: front `98fd848` limpio, backend `2803575` arriba. Los
  cuatro recursos admin responden 200 con datos reales; `USUARIO` → 403, sin token → 401.
- **2026-09-10** — Diferimiento levantado y comiteado en `5a7e480` (solo documentación).
- **2026-09-10** — Plan 077 corregido por deriva (§§1, 5, 8, 9, 14) y despachado a `wa-077`.

## Recon del backend para 078–080 (hecho el 2026-09-10 @ `2803575`, no repetir)

Los cuatro recursos son `@RolesAllowed("SUPER_ADMIN")` a nivel de clase y todos paginan con
`Page<T>` = `{items,total,page,size,totalPaginas}`, que el interceptor de `src/api/client.ts`
normaliza a `{contenido,totalElementos,…}`. `size` válido 1..200, `page` ≥ 0.

### 078 — `PlantillaApuAdminResource` → `/admin/plantillas-apu`

| Método | Ruta | Notas |
| --- | --- | --- |
| GET | `?q=&tipo=SISTEMA&page=0&size=25` | `tipo` **sólo** admite `SISTEMA`; cualquier otro valor → 400 `validacion` «tipo debe ser SISTEMA». Es el `@DefaultValue`. |
| POST | `/admin/plantillas-apu` | `{desdeApuId, nombre, descripcionRubro}` → **201**. Se crea **desde un APU existente**, no desde cero. |
| PUT | `/{id}` | DTO tipo *merge-patch*: `PlantillaApuAdminEditarRequest` distingue **campo ausente** de **campo nulo** (`nombrePresente()`/`nombreOrNull()`). Patrón C en estado puro: mandar `null` ≠ no mandar la clave. |
| DELETE | `/{id}` | 204 |

Respuesta real: `{"id","nombre","descripcionRubro","tipo":"SISTEMA","usuarioId":null,"fechaCreacion"}`.
Ojo: `usuarioId` llegó **`null` explícito**, no ausente.

### 079 — `ValorReferenciaAdminResource` → `/admin/valores-referencia`

| Método | Ruta | Notas |
| --- | --- | --- |
| GET | `?page=0&size=25` | paginado |
| PUT | `/{clave}` | **upsert**: devuelve **201 si la creó** y **200 si la actualizó**. Esa distinción es el contrato, no un detalle. |
| DELETE | `/{clave}` | 204 |

`clave` no vacía y ≤ 50 (400 `clave-requerida` / `clave-excedida`). Respuesta real:
`{"clave":"SBU","valor":"450.00","descripcion":"…","fuente":"…","actualizado":"…"}` — **`valor`
viaja como string**. No hagas aritmética con él (ADR 9); trátalo como decimal de sólo lectura.

### 080 — `LogActividadResource` → `/admin/logs`

Sólo **GET**, con `usuarioId` (UUIDv7), `evento`, `desde`, `hasta`, `page`, `size`. `evento` debe
casar `^[a-z0-9._-]+$` y ≤ 60 (400 `evento-formato-invalido` / `evento-largo`); `desde`/`hasta` son
`Instant` ISO-8601 (400 `parametro-invalido`) y `desde > hasta` → 400 `rango-fechas-invalido`.
Respuesta real:
`{"id","usuarioId","usuarioNombre","evento":"auth.login","entidad":"auth","entidadId":null,"detalle":{"resultado":"ok"},"fecha"}`.
`detalle` es un objeto JSON libre y `entidadId` puede ser `null`. **No hay PII más allá del nombre
del actor** — la prueba `TC-12-P42-02-filtro-evento-sin-pii.bru` lo afirma; consérvalo así.

### Colección Bruno del backend (evidencia adicional, sólo lectura)

`../thesis-back-quarkus/api/bruno/12-admin/` cubre los cuatro recursos: `TC-12-P38-*` usuarios,
`TC-12-P40-01` plantillas, `TC-12-P41-*` valores/parámetros, `TC-12-P42-*` logs. Es contrato
ejecutable escrito por el backend; úsalo antes de inventar una forma.

## Revisión de 077 — ronda 1 (2026-09-10)

Ejecutor: STATUS COMPLETE, dos commits (`ca86859`, `4e10904`). **Verificado por mí, no por su
informe:**

- **Alcance limpio.** `git diff --stat 1aedeb0..HEAD` = exactamente los 10 archivos de §8. No toca
  `plans/`, ni `src/lib/disponibilidad.ts`, ni `Guards.tsx`, ni `Sidebar.tsx`, ni
  `paginas-admin.test.tsx`. El gate `admin-usuarios` sigue cerrado.
- **Tests:** 47 pasan en `src/test/features/admin` (+19 nuevos sobre los 28 de base).
- **Los 5 fallos y el error de typecheck son preexistentes**, comprobado corriendo la misma suite
  en el árbol principal @ `52ec950` (código idéntico a `1aedeb0`): fallan igual sin sus cambios, y
  los cinco son de `AdminParametrosPage`/`useParametrosSistema`, nada que ver con usuarios.
- **Los tests de contrato sí afirman** ruta, método, query params y cuerpo saliente exacto — no son
  Patrón D. El `.strict()` de `usuarioAdminSchema` es la garantía estructural de «no secretos»: si
  el backend añadiera `passwordHash`, `getValidado` reventaría.

**Desviación aceptada:** el handler de listado no lleva `*` final, contra lo que dicen `AGENTS.md`
y el encargo. Tenía razón: **0 de los 51 handlers MSW del archivo lo llevan**, MSW casa por
pathname ignorando el query string, y `${API}/admin/usuarios*` habría capturado también
`/admin/usuarios/:id` y las rutas de acción. La regla del `*` es de **Playwright** (`page.route`),
donde sí es real (`e2e/screenshots.spec.ts:486`).

**Tres arreglos pedidos (ronda 1/2):**

1. El test del 409 al eliminar **no prueba nada**. Lo demostré: cambié el `onClick` del botón
   «Eliminar» por `() => {}` y el test siguió verde. El `mutate` de
   `AdminUsuariosPageActiva.tsx:328` no lleva `onError`, así que el 409 sólo va a `toast.error`, y
   `sonner` está mockeado en ese archivo. Patrón D puro.
2. `useUsuarioAdmin` (GET por id) no lo llama nadie.
3. El formulario de invitar deja mandar campos vacíos → 400 con mensaje de Hibernate **en inglés**
   en una UI española.

## Defectos ajenos encontrados — anotados, NO arreglados

Los dos pertenecen a otra estirpe (el WIP `98fd848`, rama del workspace/082), no a 077–081:

1. **`pnpm run typecheck` ya estaba rojo antes de empezar esta rama**:
   `src/test/features/proyectos/hooks/contrato.test.tsx(197,47)`, `TS2353`
   `'mostrarSeccionesVacias' does not exist in type 'ParametrosProyectoEditarRequest'`. **Esto
   bloquea el punto 4 de la definición de terminado** (`pnpm run verify` verde): no se puede poner
   verde sin tocar un archivo fuera de 077–081. Decidir al cierre de la rama; no se disimula.
2. **Cinco tests rojos preexistentes** en `AdminParametrosPage`/`useParametrosSistema`, misma
   procedencia.
3. **`AGENTS.md` miente sobre el `*`**: dice «en MSW y en Playwright», pero en MSW no se usa nunca
   y añadirlo rompería el enrutado. Corregir al cierre, junto con el baseline de tests (§9.7 del
   encargo).

## 077 cerrado (2026-09-10)

Ronda 1 verificada por mí: el test del 409 al eliminar **ahora sí caza la rotura** —con el
`onClick` neutralizado pasa a fallar, antes pasaba—, `useUsuarioAdmin` y su handler `GET /:id`
borrados. Conservó `qk.adminUsuario(id)` con motivo declarado en NOTES (fábrica de clave inerte que
la §8 pide explícitamente): desviación documentada, aceptada.

**De mis tres puntos, el tercero era mío y estaba equivocado**: el `disabled` de «Invitar» ya
estaba desde el primer commit (`ca86859:115`); yo había grepeado `required`, no `disabled`. El
ejecutor lo demostró con el historial en vez de tragárselo.

Suite completa: **478 pasan / 20 fallan** contra **459/20** de la línea base. +19 tests, +1 archivo,
**cero regresiones**; los 20 fallos y los 11 archivos rojos son idénticos a los de base. Merge
`d23c7e8`. Worktree retirado; la rama `wa-078` sale ya con 077 dentro.

**El baseline de la rama está roja por tres vías, todas del WIP `98fd848`:** 20 tests,
`typecheck` (`contrato.test.tsx:197`) y `format:check` (`useApuEditor.ts`). `pnpm run verify` no
puede ir verde sin tocar archivos ajenos a 077–081 — decisión pendiente para el cierre, y va dicha
en el informe final pase lo que pase.

**Baseline real de `AGENTS.md` a corregir al cierre:** dice «475 tests en 73 archivos»; medido hoy,
la base eran **479 en 75** y tras 077 son **498 en 76**.

## 078 cerrado (2026-09-10)

Aprobado **sin ronda de revisión**. Alcance exacto de la §8; ninguno de los intocables tocado.
Suite completa **495 pasan / 20 fallan** contra 478/20 de partida: +17 tests, cero regresiones,
mismos 20 fallos y 11 archivos rojos preexistentes. `lint` 0 errores, `guard:adr9` limpio,
`typecheck` y `format:check` con los mismos fallos ajenos de siempre.

**Comprobación de la parte delicada:** rompí la semántica de presencia del PUT (que mandara siempre
las dos claves) y el test «edita sólo la descripción … sin mandar nombre» se puso rojo. Caza la
rotura. El handler del mock también imita `JsonNullable`: sólo esparce lo que llegó, en vez de
rellenar con el fixture entero.

Dos desviaciones documentadas, ambas aceptadas: corrigió `PlantillaSistemaCrearRequest`
(`descripcion` → `descripcionRubro`, no casaba con el DTO del backend y no lo usaba nadie —
verificado por grep), e hizo un solo commit en vez de uno por paso; el coste es de trazabilidad,
no de calidad.

Confirmado lo que anticipaba la §9bis: el alta **no se verificó contra el backend real** porque no
hay ningún APU alcanzable por la cuenta admin. Lo dijo así en su informe, sin adornarlo. Merge
`4489287`.

## 079 cerrado (2026-09-10)

Alcance exacto de la §8. `src/api/request.ts` **puramente aditivo**: 19 líneas, ningún helper
existente modificado. Suite completa **511 pasan / 20 fallan** contra 495/20: +16 tests, cero
regresiones. `lint` 0 errores, `guard:adr9` limpio, ninguna aritmética sobre `valor`, y la BD de
desarrollo quedó con sus cuatro claves sembradas (su `ZZZ_VERIF_079` no quedó colgando).

Repetí sus mutaciones sin fiarme del informe: `creado: false` tumba «crea (201, creado=true) …» y
quitar `encodeURIComponent` tumba «codifica la clave en la ruta». Cazan de verdad.

**Una ronda de revisión, y el fallo era mío:** la §13 que le pasé no incluía `format:check`, que sí
está encadenado en `verify`, así que dos de sus archivos quedaron mal formateados. Se lo dije
reconociendo la omisión; lo arregló con `prettier --write` y verifiqué que el diff es reflujo de
líneas puro, sin cambio semántico. **`format:check` añadido a la §13 de 080** para que no se
repita. Merge `f22b7c9`.

## 080 cerrado (2026-09-10)

Aprobado **sin ronda de revisión**. Alcance exacto de la §08. Suite completa **527 pasan / 20
fallan** contra 511/20: +16 tests, cero regresiones. `lint` 0 errores, `guard:adr9` limpio,
`format:check` sólo con el ajeno.

Mis tres mutaciones, todas cazadas: mandar los filtros vacíos en vez de omitirlos (caen 3 tests con
nombre), quitar `.nullable()` de `entidadId` (caen 15) y **forzar el gate abierto**, que tumba
`AdminLogsPage (degradada)` en `paginas-admin.test.tsx`. Esa última importa más que las otras dos:
demuestra que el test intocable es una red de seguridad real para 081.

Decisión de criterio suya, aceptada: `<input type="date">` nativo para el rango de fechas en vez
del `DatePicker` custom, por ser un filtro secundario. Menos código y sin dependencia extra.

Hallazgo de contrato que anotó y merece quedar: los 400 del backend llevan **`codigo:"validacion"`
fijo** y el slug específico (`evento-largo`, `rango-fechas-invalido`, `parametro-invalido`) va en
`mensaje`, no en `codigo`. Coincide con lo que vi en 077 (`{"codigo":"validacion","mensaje":"must
be a well-formed email address"}`).

## Progreso de la suite (siempre con los mismos 20 fallos preexistentes)

| Momento | Tests | Archivos |
| --- | --- | --- |
| línea base (antes de la rama) | 459 ✅ / 20 ❌ | 75 |
| tras 077 | 478 / 20 | 76 |
| tras 078 | 495 / 20 | 77 |
| tras 079 | 511 / 20 | 78 |
| tras 080 | 527 / 20 | 79 |

**+68 tests, cero regresiones.** El baseline de `AGENTS.md` («475 en 73») está caducado y hay que
actualizarlo al cierre.

## Cierre de la rama (2026-09-10)

Los cinco planes DONE y mergeados en `plans/077-081`; ningún worktree pendiente; sin `git push`.
Relato completo en `plans/BITACORA.md`.

**Definición de terminado del encargo, punto por punto:**

| # | Requisito | Estado |
| --- | --- | --- |
| 1 | Los cinco planes DONE con evidencia concreta | ✅ |
| 2 | Las cuatro páginas admin renderizan su página real con datos, sin `ModuloNoDisponible` ni «pronto» | ✅ ninguna página admin importa ya `ModuloNoDisponible`; 0 entradas con `modulo` en el `Sidebar` |
| 3 | `MODULOS_SIN_BACKEND` vacío, `RUTAS_ADMIN` sin `modulo`, `RutaAdmin` sin relajar | ✅ `Guards.tsx` con 0 líneas de diff contra `main` |
| 4 | `pnpm run verify` verde | ✅ **sí**, tras arreglar los tres bloqueos ajenos por petición explícita del usuario (2026-09-10) |
| 5 | Banner DIFERIDO fuera de los cinco planes | ✅ |
| 6 | `plans/BITACORA.md` con el relato en orden | ✅ |
| 7 | `AGENTS.md` actualizado | ✅ baseline, inventario de gates y la regla del `*` |
| 8 | Ningún worktree sin mergear, ningún `git push` | ✅ |

**El punto 4 se cumple, con una nota de trazabilidad.** Al cerrar la rama **no** se cumplía: los
tres bloqueos eran ajenos y preexistentes, y el encargo prohibía arreglar lo de otros planes, así
que se anotaron sin tocarlos. **El usuario pidió después arreglarlos** («si puedes arreglarlo ahora
mejor»), y se hizo en el commit `fix(seam): poner verde la suite y desbloquear el build`, aparte de
los cinco merges de los planes. El detalle está en [`../docs/bugs.md`](../docs/bugs.md) §6.

Puertas de `verify` tras ese arreglo:

| Puerta | Resultado |
| --- | --- |
| `typecheck` | ✅ verde |
| `lint` | ✅ verde |
| `guard:adr9` | ✅ verde |
| `format:check` | ✅ verde |
| `test` | ✅ **551 / 551** en 79 archivos |
| `build` | ✅ `vite build` produce el bundle |
