# Bitácora

> **Entrada principal:** [`00.INDEX.md`](00.INDEX.md). Auditoría vigente: [`auditoria/2026-09-09-validacion-planes.md`](auditoria/2026-09-09-validacion-planes.md). El Plan 083 está cerrado; el Plan 084 es la siguiente tarea pendiente y aún no se inicia.

**Encargo activo: siguiente tarea pendiente, Plan 084** · **Actualizada:** 2026-09-09
**Ronda de paridad 1** · **CERRADA** · **Backend alineado hasta:** **`5673615`**

> La lleva el orquestador ([`ORQUESTADOR-PARIDAD.md`](ORQUESTADOR-PARIDAD.md)). Se escribe **en el momento** en que
> algo cambia de estado, no al final de la sesión: si la sesión se corta, lo que no está escrito
> aquí no ocurrió.
>
> Estados: `⏳ pendiente` · `🔄 en curso` · `🟡 vuelto, sin revisar` · `❌ rechazado` · `✅ verde`

## Cierre del Plan 083 (2026-09-09)

- Plan 083 queda **✅ verde / IMPLEMENTADO**: el árbol compacto usa `?rubro`, conserva `v`, es recursivo, accesible y de solo lectura; muestra `Decimal` strings del servidor, sin CRUD ni API nueva.
- La selección del rubro queda como contrato para el panel derecho y la pestaña APU de 084. La verificación focalizada pasó con **10 tests en 4 archivos** (el test compacto cubre 6); Prettier, lint y `git diff --check` pasaron. El typecheck sigue bloqueado únicamente por el error conocido del Plan 076 en `src/test/features/proyectos/hooks/contrato.test.tsx:197`. No se ejecutó E2E.
- Plan 084 queda como siguiente plan pendiente, sin iniciarlo.

## Decisión de secuencia: Plan 082 (2026-09-09)

- Plan 076 queda cerrado en código y documentación.
- Plan 074 se difiere: el armado/creación de APUs se resolverá en una evolución futura del workspace, potencialmente como diálogo flotante junto a la pestaña APU de 084. No se trata como implementado.
- Planes 077–081 se difieren como rama administrativa completa. Se conservan sus gates, dependencias y documentación; no se activa ni se retira ningún gate parcialmente.
- Plan 082 pasa a ser el siguiente plan activo: introduce `/proyectos/:id/workspace`, la vista principal del proyecto y el split que después recibirán presupuesto, APU e insumos. No implementa todavía el árbol ni las pestañas de 083–086.

## Manuales de usuario — recon y arreglos previos (2026-09-07)

Encargo: [`PROMPT-ORQUESTADOR-MANUALES.md`](PROMPT-ORQUESTADOR-MANUALES.md). El recon obligatorio
contradijo la §3 del encargo en cuatro puntos, así que no se repartió ningún capítulo hasta
resolverlos.

**Lo que el recon encontró** (todo contra `origin/main @ 5673615`, no contra el working tree —
la copia local del backend estaba 16 commits por detrás):

- **Documentos (P-37) ya no es «solo ET en DOCX».** Hoy exporta ET en DOCX **y** el cronograma
  valorizado en XLSX/PDF/MSPDI con preflight (plan 066). Presupuesto y APUs siguen sin generador.
  El capítulo 07 documenta dos entregables y dice qué falta.
- **Del Manual del Administrador sobreviven dos procesos, no uno.** Además de P-39,
  `AdminParametrosPage` está viva contra `GET/PUT /proyectos/parametros-sistema`, que existe
  (`ProyectoResource.java:125,136`). Es P-41 **tab 1**; el tab 2 (valores de referencia) sigue
  apagado.
- **Tres defectos de interfaz** que habrían hecho mentir al manual → plan 067, cerrado abajo.
- **P-09 (duplicar proyecto) no se documenta**, pero no por un bug: los dos ítems «Duplicar» ya
  están `disabled` con tooltip `MOTIVO_SIN_BACKEND`, porque `POST /proyectos/{id}/duplicar` no
  existe en `origin/main`. Lo que queda es código muerto inalcanzable, anotado como deuda.

**Inventario corregido: 38 procesos** (el encargo estimaba ≈39, con otra composición):
A 4 · B **5** (fuera P-07, P-09, P-12) · C 6 · D 7 · E 5 · F 4 · G 1 · H **2** · I 4.

**Decisiones del humano (2026-09-07):** arreglar los defectos antes de documentar · las cuatro
pantallas de admin sin backend **quedan fuera** del manual, sin anexo · el manual **no** se
integra en el documento Typst de la tesis por ahora.

**Plan 067 · ✅ verde · fusionado en `main`.** Tres arreglos: el botón **Editar** del proyecto
monta `DialogoEditarProyecto`, que existía completo y huérfano (`PUT /proyectos/{id}` sí existe,
así que guarda de verdad); `public/plantillas/insumos-template.csv` existe con la cabecera del
parser real; y la pantalla de importación nombra las cuatro columnas que el backend acepta
—`codigo, descripcion, unidad, precio`— en vez de las cinco inventadas que llevaban a
«Archivo ilegible o columnas incorrectas». Revisión del orquestador: `verify` verde con **480
tests en 74 archivos**, `e2e:screenshots` verde, alcance limpio, y la descarga del CSV
comprobada con `curl` contra `vite dev` (200, `text/csv`) — que el archivo exista en disco no
garantizaba que Vite lo sirviera antes que el fallback del SPA, que era la causa original.

**Deuda anotada, fuera del 067:** el código muerto de duplicar (`DialogoDuplicar`,
`useDuplicarProyecto`) · `useSubirLogo` y el campo **Logo** de P-06, que no tiene control en
ninguna pantalla · la importación CSV crea siempre materiales porque
`ImportacionInsumoService.java:32,44` fija `TipoInsumo.MATERIAL` — **eso es un plan del
repositorio del backend**, no de este.

**Ola 0 · ✅ verde · fusionada en `main`.** Esqueleto (`docs/manual/README.md`), script
`e2e:manual` y **capítulo piloto 02 (Proyectos)** — P-05, P-06, P-08, P-10, P-11 — con sus 9
capturas en `docs/manual/img/02-proyectos/`. Las tablas de campos salen del **Zod real**
(`src/features/proyectos/schemas.ts`), no de la especificación. `pnpm run e2e` sube de 20 a **29
tests** y sigue verde; `AGENTS.md` actualizado a 480 unitarios / 29 e2e.

**Tres divergencias entre la especificación y la pantalla**, documentadas como son y no como
deberían ser:

1. El asistente de creación tiene **dos pasos, no tres** (`PASOS = ["Datos generales",
   "Confirmar"]`): **no hay paso de elección de base de insumos**. La base se copia después,
   desde Insumos (P-17). El schema tiene `duplicarDesde` pero el asistente no lo expone.
2. El borrado de proyecto **no pide escribir el nombre**, como proponía P-10: es una
   confirmación normal.
3. **Parámetros edita once valores, no doce**: `mensajeFooter` se envía en el submit pero no
   tiene ningún control en pantalla (`ParametrosPage.tsx:83`).

`playwright.config.ts`: las capturas del manual se ignoran en firefox y mobile-chrome, igual que
`screenshots.spec.ts` — el asistente no es clicable en Pixel 7 y una captura de manual es de
escritorio por definición.

**Ola 1 · 🔄 en curso** — planes **068** (01 Cuenta), **069** (03 Insumos) y **070** (08
Navegación), despachados en paralelo.

**El protocolo de worktrees de §7 volvió a morder, y estaba escrito.** El primer despacho usó el
aislamiento automático del `Agent`, que creó los tres worktrees desde `eb004d1` — 15 commits por
detrás de `main`, sin el plan 067 ni la Ola 0. Los tres ejecutores pararon en seco al no encontrar
su plan, sin tocar un archivo, que es exactamente lo que se les pidió. Re-despachados con el
protocolo que esta misma bitácora ya prescribía: `git worktree add -b manual1-0NN
.claude/worktrees/manual1-0NN main` a mano, y `Agent` **sin** `isolation`, con la ruta absoluta.
Coste: cero daño, tres arranques perdidos. **Lección: leer la bitácora no es lo mismo que
aplicarla.**

**Aislamiento de puerto en `playwright.config.ts`** (`E2E_PORT`, por defecto 5173): tres capítulos
en paralelo levantaban Vite en el mismo 5173 y, con `reuseExistingServer`, cada Playwright
fotografiaba el árbol de otro y el gate salía verde igual. Cada ejecutor de la ola usa el suyo
(5211, 5212, 5213). Sirve para las olas 2 y 3, que también son paralelas.

**Ola 1 · ✅ verde · los tres fusionados en `main`.** Capítulos **01 Cuenta y acceso** (P-01…P-04,
8 capturas), **03 Insumos** (P-13…P-17, 8 capturas) y **08 Moverse por la aplicación** (P-43, P-44,
P-46, 9 capturas). `pnpm run e2e` sube de 29 a **54 tests**; `AGENTS.md` actualizado.

Revisión del orquestador, capítulo a capítulo: alcance del commit (ninguno tocó `src/` ni los
archivos compartidos), `verify` y `e2e` re-corridos en cada worktree, todos los enlaces de imagen
resueltos contra el disco, capturas abiertas al azar, y las afirmaciones delicadas contrastadas
contra el código — la política de contraseña contra `passwordSchema`, las entradas de
Administración contra `Sidebar.tsx` y `disponibilidad.ts`, los textos de 404/403 literales, y las
tres únicas rutas citadas contra `src/routes/index.tsx`.

**Desviación aprobada por mérito (069):** el plan pedía 9 capturas y trajo 8. La novena era el
diálogo **Ver uso** (P-18), y el ejecutor no lo fotografió porque **no se puede llegar a él**.
Documentar un flujo inalcanzable era justo lo prohibido.

**Cuatro bugs nuevos, verificados uno a uno en el código:**

1. **`TablaInsumos.tsx:165` — P-18 está apagado por error.** «Ver uso» es `disabled` fijo con el
   tooltip *"Disponible cuando el backend implemente esta operación."*, pero **no está en
   `MODULOS_SIN_BACKEND`** y el endpoint existe: `InsumoResource.java:156` sirve
   `/{insumoId}/usos` en `origin/main`. El hook y `DialogoUsoInsumo.tsx` están completos. Es una
   funcionalidad terminada y apagada; **desbloquearla añade P-18 al manual**.
2. **`PerfilPage.tsx:86` y `:90-91` — la pantalla miente.** Dice *"las demás sesiones se
   cerrarán"* pero `cerrar()` cierra también la del usuario. Mismo patrón que el texto del CSV
   del plan 067. El capítulo 01 documenta el comportamiento real, no el prometido.
3. **`LoginPage.tsx:55` + `VerificarEmailPage.tsx:40`** — «Reenviar verificación» navega sin el
   correo y allí `if (!email …) return;` deja el botón muerto. Por el camino del registro sí va.
4. **`PlantillasProyectoPage.tsx:43`** — crear desde plantilla con el nombre vacío hace `return`
   sin aviso ni botón deshabilitado.

Y tres etiquetas sin control asociado (`DialogoCopiarBase.tsx:76`, `DialogoInsumo.tsx:174` /
`ComboboxUnidad.tsx:44`, `sidebar.tsx:251`), que además de accesibilidad obligan a los specs a
localizar por rol sin nombre.

**Cuatro divergencias especificación/pantalla**, documentadas como son: el **Código** del insumo es
obligatorio y no se autogenera (`schemas.ts:10`); **Copiar base** solo admite bases centrales, no
proyectos propios (`DialogoCopiarBase.tsx:45`); no existe el resumen de insumos más usados de
P-13; y `PlantillasProyectoPage` no distingue plantillas de sistema.

**Dos incidentes de proceso, ambos míos.** `EMFILE: too many open files` con tres Playwright en
paralelo — la Ola 2 va con dos ejecutores. Y un `cd` a un worktree cuyo directorio **persistió
entre comandos**, así que un `git merge` se ejecutó dentro del propio worktree y dijo "Already up
to date": sin daño, `main` intacto, pero desde ahora `git -C <ruta>` o `cd` explícito en cada
comando.

**Pasada de coherencia, adelantada:** el capítulo piloto 02 remitía a §3.4 para «Copiar base al
proyecto», que en el capítulo 03 real es **§3.5**. Corregido.

**Plan 071 · ✅ verde · fusionado.** Los cuatro defectos que destaparon los capítulos de la Ola 1.

- **P-18 vuelve al manual.** «Ver uso» estaba `disabled` con el tooltip de «falta backend», pero
  `InsumoResource.java:156` sirve `/{insumoId}/usos` en `origin/main` y el hook y el diálogo
  estaban completos. Quitar el `disabled` bastó. El capítulo 03 gana su sección 3.6 con captura,
  y el índice sube de 37 a **38 procesos documentables**.
- **El aviso del perfil dice la verdad.** El recon cambió la solución: `AuthService.java:277`
  revoca *todos* los refresh tokens (D-03), así que `cerrar()` era correcto y **el texto era lo
  que mentía**. Se arregló el texto, no la lógica.
- «Reenviar verificación» ya lleva el correo; **Crear proyecto** se deshabilita con el nombre
  vacío; y tres etiquetas quedaron conectadas a su control.

Baseline a **484 tests** unitarios y **55** e2e.

**Una premisa del plan era falsa, y el ejecutor hizo bien en no seguirla.** El plan pedía dar
texto accesible a `SidebarTrigger`; el componente ya tenía su `<span className="sr-only">`. Lo
tomé del informe del capítulo 08 sin verificarlo yo. Recordatorio de que un hallazgo reportado no
es un hallazgo comprobado — la misma regla que aplico a los informes, me aplica al escribir planes.

**Y un efecto colateral que el alcance no previó.** Cambiar el texto del perfil dejó dos capturas
del capítulo 01 (`07-perfil.png`, `08-cambiar-password.png`) mostrando el texto viejo. El ejecutor
las revirtió porque estaban fuera de su alcance —correcto— y lo reportó. Las regeneró el
orquestador: **una captura que contradice la pantalla es justo el fallo que este manual persigue**.
Lección para los planes siguientes: si un plan cambia un texto de pantalla, su alcance tiene que
incluir las capturas que lo fotografían, estén en el capítulo que estén.

Distinguir cambio real de ruido de renderizado es fácil por tamaño: las dos reales crecieron 1.5 y
2.9 KB; las otras cuatro variaron entre −58 y +0 bytes.

**Dos correcciones más del orquestador en el capítulo 03**: la referencia cruzada del borrado
bloqueado apuntaba a un punto que el 071 eliminó, y la columna **Bloque** del diálogo muestra una
letra (M/N/O/P) que el manual no traducía. Ahora lleva su tabla.

**Siguiente:** Ola 2 — 04 APU · 05 Presupuesto (planes 072 y 073), con dos ejecutores, no tres.

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
| 1 | **066 exportar cronograma (xlsx/pdf/mspdi)** | ✅ verde | — | 1fed42d | fusionado a main · **ola 1 cerrada** · 477 tests |

### Notas de la ronda

- 2026-09-07 — **066 aceptado y fusionado** (`1fed42d`). Comprobado por mí en su worktree, no por
  el informe: `verify` exit 0 con **477 tests en 74 archivos** (461 antes), `e2e` 20 passed, los
  nueve greps de la definición de hecho uno a uno, y la captura `11-documentos` **mirada** — la
  tarjeta sale entera, con su etiqueta «Formato», el selector en «Excel (.xlsx)» y el botón
  habilitado. `verify` sobre `main` después de fusionar, también verde.
- 2026-09-07 — **Sensibilidad de la rebanada 1, comprobada revirtiéndola.** Devolví
  `safeParse(error.response?.data)` en `src/api/client.ts` y el test se puso rojo con «expected
  'sin-respuesta' to be 'export-bloqueado'». El arreglo sostiene peso; el test no pasa por
  casualidad. Es la misma comprobación que en el plan 053 destapó que seis hooks nunca disparaban.
- 2026-09-07 — Los tests nuevos afirman cosas, no que «cargó»: el 409 asierta el **mensaje exacto**
  del backend, el fallback de MSPDI asierta `.xml` y no `.mspdi`, el preflight con forma mala
  asierta `respuesta-invalida` (o sea que Zod está enganchado de verdad), y el warning asierta que
  **avisa sin deshabilitar**. Los handlers MSW rechazan `formato` desconocido con 400 y presupuesto
  ajeno con 404, como el backend: no son permisivos.
- 2026-09-07 — **Desviación aceptada:** el ejecutor tuvo que tocar `src/test/api/problem.test.ts`,
  fuera del alcance escrito. Dos de sus aserciones estaban clavadas a `c337950` y se ponen rojas
  por construcción en cuanto entra la rebanada 2, así que la definición de hecho y el alcance eran
  incompatibles. Es la misma categoría que las dos aserciones caducadas que el plan sí manda
  actualizar. **El fallo era del plan**: corregido su alcance para que una re-ejecución no vuelva a
  chocar.
- 2026-09-07 — **Dos nits que el gate no caza**, arreglados por mí al fusionar (`be0e357`): el
  comentario de `PROBLEM_TYPES` se contradecía consigo mismo (arriba seguía diciendo que
  `export-bloqueado` tiene «cero apariciones en todo el backend», abajo que volvió), y
  `handlers.ts` validaba el formato con `in`, que casa también las heredadas —
  `?formato=constructor` pasaba la guarda. `Object.hasOwn`, mismo tamaño, correcto en el borde.
- 2026-09-07 — El ejecutor encontró algo que el plan no vio: la captura `11-documentos` entraba en
  `/documentos` **sin `?v=`**, así que las dos queries de la página quedaban desactivadas por su
  guarda de id y la petición de validación que el plan mandaba mockear no salía nunca. Añadido el
  `?v=`, que es lo que hace alcanzables los dos mocks.

- 2026-09-07 — **066 despachado** a un subagente Claude en `.claude/worktrees/ola1-066` (rama del
  mismo nombre, creada a mano desde `main` @ `7e3db8a`, con `pnpm install` hecho y `typecheck`
  exit 0 comprobado antes de despachar). Se sigue el protocolo de la ronda anterior: **nada de
  `isolation: "worktree"`** en el `Agent` tool, que ramifica desde `origin/main` @ `f823fc6` —
  once commits atrás y sin empujar— y produce un `verify` verde contra el contrato viejo.
- 2026-09-07 — El plan 066 salió estampado contra `1344113`, pero el commit que lo introduce movió
  `HEAD`: su propio drift check y su condición de parada apuntaban a un SHA anterior al suyo y
  habrían parado al ejecutor en el primer comando. Restampado a `eb004d1` en `7e3db8a` antes de
  despachar. Vale para la ronda siguiente: **estampa el plan con el SHA que tendrá `main` después
  de commitearlo**, no con el de antes.
- 2026-09-07 — **Un solo plan y un solo ejecutor para toda la ronda.** El trabajo toca
  `src/api/contract.ts`, `src/api/client.ts`, `src/test/handlers.ts`, `useExportar.ts` y
  `ExportPage.tsx`, y las rebanadas dependen unas de otras (el 409 no conserva su cuerpo hasta que
  entra la rebanada 1). Partirlo en dos habría puesto a los dos ejecutores en los mismos cinco
  archivos: la matriz de solapes de la §4 dice serie, no paralelo.

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

- Entrevista **N05** (cronograma): **6** preguntas sin responder — la 7ª («¿estructura del
  documento exportado?») la respondió el backend implementándola en `5673615`. Bloquea **solo** la
  rebanada 5 del plan 055, que va de vistas del cronograma, no de export. Ninguna ola la espera.
