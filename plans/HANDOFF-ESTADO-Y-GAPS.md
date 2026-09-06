# Handoff — estado real del frontend frente al backend `origin/main`

**Fecha:** 2026-09-06 · **revisado el mismo día** tras un `git fetch` que movió el backend
**Frontend HEAD:** `8cc08b5` (rama `main`)
**Backend de referencia:** `origin/main` @ **`c337950`** en `../thesis-back-quarkus`
**Docs de referencia:** `../thesis-docs` @ **`411242f`** (2026-09-01)

Documento autocontenido. Escrito para retomar la planificación en una sesión nueva sin
contexto previo. Todo lo de aquí está **verificado leyendo código**, no inferido.

**Documento hermano:** [`INVENTARIO-COBERTURA.md`](INVENTARIO-COBERTURA.md) — el barrido medido
(roadmap completo, 44 pantallas, 92 endpoints reconciliados, tests, shadcn, responsive, lint).
Este handoff dice *qué está roto y en qué orden*; el inventario dice *qué hay*.

> ## Aviso de revisión (2026-09-06, segunda pasada)
>
> Entre la primera y la segunda redacción de este documento, `origin/main` avanzó de `f707863`
> a `c337950`: **6 commits, 72 archivos, +13 897 líneas — el módulo cronograma completo**
> (planes backend 026–030, del 4 y 5 de septiembre).
>
> Es un cronograma **nuevo, sobre el contrato UUID + dinero-string de main** — no es el de
> `test/stuff`. Eso invierte la sección 4, cambia la 5.1 y la 5.5, y **resuelve por sí solo la
> pregunta abierta #4** y buena parte de la #1.
>
> Todo lo que dice «cronograma no existe» en versiones anteriores de este handoff, del roadmap V2
> o de los planes 040/054 **está caducado**. Ver §4-bis.

---

## 0. Lee esto antes que nada: tres trampas que ya costaron trabajo

### Trampa 1 — el gate de verificación es un no-op

`tsconfig.json` es `"files": []` con project references. Por eso:

```
npx tsc --noEmit     # NO COMPRUEBA NADA. Siempre sale 0.
npm run typecheck    # tsc -b --noEmit  ← el real
npm run verify       # typecheck · lint · format:check · test · build
```

El commit `e44c608` se dio por limpio con el comando falso y llevaba 8 errores de tipo
(reparados en `4b15612`). **Nunca uses `npx tsc --noEmit` en este repo ni lo escribas en un plan.**

### Trampa 2 — la rama del backend

El `main` **local** del backend estaba 42 commits por detrás de `origin/main`. Un análisis
hecho contra ese checkout viejo concluyó que `test/stuff` iba ~29k LOC por delante. **Es falso.**

Haz `git fetch --all` en el backend antes de mirar nada, y razona siempre contra
`origin/main`. No hagas checkout: el working tree está en `test/stuff`. Lee con
`git show origin/main:<path>` y `git ls-tree -r --name-only origin/main`.

### Trampa 3 — los handoffs caducan en días, no en semanas

Este mismo documento nació el 2026-09-06 y ya estaba equivocado sobre cronograma **el día que se
escribió**, porque el backend había mergeado el módulo el día anterior y el `fetch` era viejo.

Regla operativa: **el primer comando de cualquier sesión es `git fetch --all` en el backend, y el
segundo es comparar su HEAD con el que dice este encabezado.** Si no coincide, `git log <viejo>..origin/main`
antes de leer nada más. Cuesta treinta segundos; no hacerlo ya costó dos análisis completos.

---

## 1. Topología de ramas del backend

```
                    3703979 feat(Uuidv7)   ← ancestro común
                   /                     \
     origin/main +9                       test/stuff +5
     f707863 "planificando cronograma"    eb9a1da "merge(bruno)"
```

- **`origin/main` es la rama autoritativa.** Es la más avanzada.
- **`test/stuff` NO está mergeada.** Solo tiene 3 commits de feature reales
  (`e3fb8ba` DescuentoGlobalService, `d860a58` columnas de BD, `a5f34db` quita el DELETE de
  bases centrales).
- **`test/stuff-2`** es un worktree viejo, 42 commits por detrás de main; sus 2 commits ya
  están en `test/stuff`. **Ignorar.**

Contexto humano: el usuario avanzaba en `test/stuff` mientras un compañero avanzaba en `main`;
paró para no pisarse. Por eso `test/stuff` quedó incompleta.

---

## 2. Convenciones globales de `origin/main`

### IDs — uniformemente UUIDv7 string

Todos los path params se declaran `String` y se parsean con `UuidV7.parse(...)`. Todos los
campos id de los DTO son `UUID`.

> **Únicas excepciones:** `UsuarioResponse.id` y `PerfilResponse.id` son `Long`.

No hay ningún id `Long` en ninguna frontera REST. **Las "inconsistencias de IDs" que se
documentaron en el plan 047 eran artefactos de `test/stuff` y no existen en main. El plan 047
es nulo.**

### Dinero — se parte por módulo, y esto importa

| Módulo | Tipo Java | JSON |
|---|---|---|
| Respuestas de **presupuesto** (`totalGeneral`, `total`, `cantidad`, `precioUnitario`, `precioTotal`, valores de `porComponente`) | `String` | **string** |
| Respuestas de **APU / insumo / parámetros** (`costoDirecto`, `precioUnitario`, `subtotal`, `iva`…) | `BigDecimal` | **number** |
| Todos los **requests** | `BigDecimal` | acepta número o string numérico |

`JacksonConfig` solo registra `JsonNullableModule`; no hay `WRITE_BIGDECIMAL_AS_PLAIN` ni
serialización de números como string.

**Consecuencia:** el tipo branded `Decimal = string` del frontend **no puede cubrir ambos
casos**. Hoy se aplica indiscriminadamente, y de ahí salen los 9 `as never` del repo.

> **RESUELTO (2026-09-06, decisión del humano).** Dos ejes, no uno:
>
> - **Transporte:** lo fija el backend, tabla de arriba. `Decimal` (string) donde manda string,
>   `number` donde manda number.
> - **Edición:** campo **editable → `number`** cuantizado a su escala; campo de **solo lectura →
>   `string`**.
>
> Escalas: dinero **6**, porcentajes y avances **4**. Y el frontend **no hace aritmética de
> dinero** (ADR 9) — hay dos violaciones vivas, una de ellas muestra `39511.53200000001` al
> usuario. Plan [`061`](061-politica-de-dinero.md).

### Paginación

`Page<T>(List<T> items, long total, int page, int size, int totalPaginas)` — los campos son
`items`/`total`. El interceptor de axios los renombra a `contenido`/`totalElementos`, así que
el tipo `Page` del frontend es correcto tal cual.

**Pero varios endpoints devuelven `List<T>` pelada, no `Page`:** `bases-centrales`,
`bases-personales`, `admin/bases-centrales`, `plantillas-apu`, `plantillas-proyecto`,
`firmantes`, `/proyectos/{id}/presupuestos`, `insumos/{id}/usos`.

### Auth

La mayoría de recursos son `@RolesAllowed({"USUARIO","SUPER_ADMIN"})`. `/admin/**` es
SUPER_ADMIN. `/auth/*` y `/config/display` son `@PermitAll`.

---

## 3. Qué existe en `origin/main` (30 recursos JAX-RS)

Resumen por módulo. El catálogo con firmas completas de DTO está en la sección 7.

| Módulo | Endpoints |
|---|---|
| **auth** | registro · verificar-email · reenviar-verificacion · login · refresh · logout · recuperar · restablecer · aceptar-invitacion |
| **perfil** | GET · PUT · PUT /password |
| **proyectos** | CRUD · `GET /{id}/presupuestos` · `GET/PUT /parametros-sistema` |
| **firmantes** | GET · POST · PUT · DELETE bajo `/proyectos/{id}/firmantes` |
| **parámetros de proyecto** | GET · PUT bajo `/proyectos/{id}/parametros` |
| **insumos** | CRUD · `/selector` · `/importar` · `/copiar` · `/{id}/usos` *(stub)* |
| **bases** | `/bases-centrales` (GET) · `/bases-personales` (GET/POST/DELETE) |
| **admin** | **solo** `/admin/bases-centrales` — CRUD, archivar, DELETE, e insumos + import |
| **APU** | `/presupuestos/{id}/apus` (GET/POST) · `/apus/{id}` GET/PATCH/DELETE · `/porcentaje-indirecto` · `/especificacion-tecnica` GET/PUT · `/detalles` · `/duplicar` · `/calculo` |
| **presupuesto** | versiones · `{id}` · `/vigente` · `/resumen` · `/validacion` · `/comparar?con=` · capítulos · rubros |
| **plantillas APU** | `/plantillas-apu` GET/PUT/DELETE · `/apus/{id}/guardar-plantilla` |
| **plantillas proyecto** | `/plantillas-proyecto` GET/DELETE · `/proyectos/{id}/guardar-plantilla` · `/proyectos/desde-plantilla/{id}` |
| **cronograma** | `GET/POST /presupuestos/{id}/cronograma` · `PUT /cronogramas/{id}/configuracion` · `PATCH /cronogramas/{id}/actividades/{aid}` · `GET /cronogramas/{id}/vistas` · `POST /cronogramas/{id}/revisado` |
| **documentos** | **un solo endpoint:** `GET /documentos/especificaciones-tecnicas/{presupuestoId}?formato=docx` |
| **config** | `GET /config/display` |

---

## 4. Qué NO existe en `origin/main`

Verificado con conteo de archivos: **0 coincidencias** en cada caso.

| Ausente | Detalle |
|---|---|
| **Admin usuarios / logs / parámetros-sistema** | Solo existe admin de bases centrales. Los parámetros de sistema viven en `/proyectos/parametros-sistema`, no en `/admin/`. |
| **Descuento global** | Cero archivos. |
| **Descuento a nivel APU** | **Retirado a propósito.** `DescuentoEndpointRetiradoTest` asserta que `ApuResource` NO debe exponer `@PATCH /porcentaje-descuento` (cita el Plan 015). Hay además un `DescuentoRetiradoContratoTest`. **Re-añadirlo rompe tests.** |
| **Exports XLSX** | Solo existe el constante de media-type y la rama de rechazo en `DocumentoResource`. No hay exportador. El endpoint de ET rechaza cualquier `formato` que no sea `docx`. |
| **Endpoints de logo** | Ninguno. Aun así `ProyectoResponse.tieneLogo` se devuelve — **campo muerto**. |
| **Duplicar proyecto** | No existe. |

Re-verificado contra `c337950`: `descuento-global` 0 archivos · `AdminUsuario`/`AdminLog`/
`AdminParametros` 0 · exportadores XLSX 0 (los dos `.xlsx` del repo son plantillas de contenido,
no código) · `/exportar` 0 · logo 0 · duplicar proyecto 0.

---

## 4-bis. Cronograma — **sí existe** desde `c337950`

Cuatro recursos JAX-RS, 18 DTOs, migración `V009__cronograma_persistencia.sql`, 11 clases de test.
Contrato completo, con las trampas de forma y los dos payloads de 409, en
[`055-cronograma-alinear-y-encender.md`](055-cronograma-alinear-y-encender.md).

Lo que hay que saber aquí:

- Ids UUIDv7 string; dinero string escala 6; porcentajes y avances string escala 4.
- `PUT /cronogramas/{id}/configuracion` — el frontend hace `PUT /cronogramas/{id}`: **404 hoy**.
- La programación de actividad es una **unión discriminada de 4 operaciones**
  (`REEMPLAZAR_AVANCES`, `DISTRIBUIR_UNIFORME`, `MOVER_SEGMENTO`, `REDIMENSIONAR_SEGMENTO`);
  el frontend manda `{avancePorPeriodo}` pelado, que el parser rechaza.
- `CronogramaResponse.avancePorPeriodo` es un **array denso**; el del *actividad* es un **mapa
  disperso**. Mismo nombre, forma distinta. El frontend usa mapa en los dos.
- Los dos 409 **no son Problem+JSON**: `{codigo, mensaje, perdidas[]}` y `{codigo, mensaje}`.
  El hook lee `problem.periodosAfectados`, un campo inexistente, y abre el diálogo de
  confirmación de pérdida **vacío**.
- Falta entera la vista `GET /cronogramas/{id}/vistas` (Gantt jerárquico + valorizado + curva S).
- La fixture `src/test/fixtures/cronograma.ts` pone **dinero donde van porcentajes**.

---

## 5. Estado del frontend: qué está roto contra main

### 5.1 BROKEN — path o verbo no existe → 404/405 garantizado

| Call site | Llama a | En main |
|---|---|---|
| `useCronograma.ts:42` | `PUT /cronogramas/{id}` | el path es `/cronogramas/{id}/configuracion` — el resto de rutas de cronograma **sí aciertan**, ver §4-bis |
| `useDescuentoGlobal.ts:8,21` | `/presupuestos/{id}/descuento-global` | no existe |
| `useApuEditor.ts:157` | `POST /apus/{id}/descuento` | retirado a propósito |
| `useProyectos.ts:65` | `POST /proyectos/{id}/duplicar` | no existe |
| `useProyecto.ts:13` | `PUT /proyectos/{id}/logo` | no existe |
| `DialogoUsoInsumo.tsx:40` | `.../insumos/{id}/uso` | el path es `/usos` (plural) |
| `useAdminUsuarios.ts:15,22,35,47,57` | `/admin/usuarios*` | no existe |
| `useAdminLogs.ts:9` | `/admin/logs` | no existe |
| `useAdminPlantillas.ts:10,18,30` | `/admin/plantillas` | no existe |
| `useValoresReferencia.ts:10,18` | `/admin/valores-referencia` | no existe |
| `useAdminBases.ts:10,17,29,41` | `/admin/bases` | el path es `/admin/bases-centrales` |
| `useExportar.ts:39,45,51,57` | `/exportar/pdf`, `/exportar/excel`, `/apus/exportar`, `/cronograma/exportar` | ninguno existe |

### 5.2 SILENT — la petición funciona pero el dato se pierde o va mal

| Call site | Problema |
|---|---|
| `useApuEditor.ts:146` | Manda `porcentajeIndirecto` dentro de `ApuPatchRequest`. El record backend solo declara `{codigo,descripcion,unidad}` → **campo descartado en silencio**. El endpoint real es `PATCH /apus/{id}/porcentaje-indirecto` con body `BigDecimal` crudo. |
| `usePlantillas.ts:33` | Manda `descripcion`; el backend declara `descripcionRubro` → descartado. |
| `useCapituloMutaciones.ts:15` | `parentId?: number`; el backend espera `UUID parentId`. |

Estos son los peores: **hoy "tienen éxito"**, así que cualquier test que solo compruebe que la
mutación resolvió está verde contra el bug.

### 5.3 TYPE — `number` donde main devuelve/espera UUID string

Todo el dominio presupuesto. En `contract.ts` líneas **422, 425, 432, 437, 447, 455, 460, 469,
478, 508, 519, 536, 537, 547, 548**.

Call sites afectados: `useCapituloMutaciones.ts:15,25,37,50` · `useRubroMutaciones.ts:25,46,59` ·
`useVersionMutaciones.ts:15,28,38` · `usePresupuesto.ts:52` · `useExportar.ts:8` ·
`queryKeys.ts:16,22,23,24,27`.

**Bugs de guard que esto genera** (mismo patrón que el `useState(0)` ya conocido):
- `enabled: presupuestoId > 0` — `usePresupuesto.ts:69`, `useExportar.ts:12`
- `Number(searchParams.get("v")) || 0` — `ExportPage.tsx:56`

Con UUIDs son siempre false/NaN.

### 5.4 Diferencias de forma de DTO (más allá de los ids)

| Tipo | Problema |
|---|---|
| `ApuCalculoResponse` | **Forma completamente distinta**, y ahora con respaldo de especificación además del contract test (§10.2). Main: `{apuId, codigo, parametros{hm,ciDefault,ciAplicado}, secciones[], resumen{cd,ci,ct}}`. Front: `{formulas[], subtotales, cd, cdAjustado, ci, ct}`. `cdAjustado` está explícitamente prohibido por un contract test. |
| `ApuDetalleCrearRequest` | **Falta `seccionTipo`** (`@NotNull`). Añadir una línea de APU no puede validar. |
| `InsumoUsoResponse` | Main `{apuId, codigo, descripcion, bloque, override}`; front `{apuId, apuCodigo, apuDescripcion, detalleId, cantidad}`. |
| `RubroRefResponse` | El campo es `id`, no `rubroId`. El banner de validación lee un campo undefined. |
| `RubroResponse` | **`alertas` no existe en main** — hay que borrarlo. |
| `ApuResponse` | No tiene `porcentajeDescuento` ni `especificacionTecnica`. La ET se lee con `GET /apus/{id}/especificacion-tecnica`. |
| `PlantillaProyectoResponse` | Falta `snapshotEstructura: JsonNode`. |
| `InsumoBusquedaResponse` | Faltan `fechaActualizacion`, `desactualizado`. |
| `InsumoResponse` | `fuente`/`baseNombre` **no van aquí**, solo en `InsumoBusquedaResponse`. |
| `ParametrosSistemaResponse` | El endpoint devuelve la **entidad cruda** `ParametrosSistema`, no un DTO. Campos `BigDecimal` → **number, no `Decimal`**. Además trae 6 booleanos de display, `mensajeFooter`, `modoCodigoRubro`, `updatedAt` que el front omite. |
| `ParametrosSistemaActualizarRequest` | El backend exige **11 campos** `@NotNull` (`iva`, `porcentajeHerramientaMenor`, los 8 `rango*`); el front manda 4 y tipados `Decimal` en vez de `number`. |
| `ProyectoCrearRequest` / `ProyectoEditarRequest` | Varios campos son `@NotNull`/`@NotBlank` en main pero opcionales en el front. |
| `ProyectoCrearRequest.plazoUnidad` | Es `String` en el request pero enum `PlazoUnidad` en la response. |

### 5.5 Tipos del front sin backend en main

`DescuentoGlobalPreviewResponse`,
`DescuentoGlobalRequest`, `UsuarioAdminResponse`, `UsuarioInvitarRequest`,
`UsuarioAdminEditarRequest`, `LogActividadResponse`, `ValorReferenciaResponse`,
`ValorReferenciaRequest`, `ProyectoDuplicarRequest`, `DescuentoRubroRequest`,
`PlantillaSistemaCrearRequest`.

Los tipos de cronograma **ya no van aquí**: existen en main, pero con otra forma. `ActividadAvanceRequest`
es el único que sobra de verdad (lo sustituye la unión de 4 operaciones).

### 5.6 Tipos que faltan en el front

`ApuDuplicarRequest{copiarET}`, `EspecificacionTecnicaResponse{apuId,contenido}`,
`BasePersonalResponse`, `AdminBaseCentralResponse`, `ProyectoDesdePlantillaResponse{proyecto,advertencias}`.

### 5.7 Comentarios obsoletos que hay que corregir

- `useParametrosSistema.ts:16` dice que las escrituras no existen — **`PUT /proyectos/parametros-sistema` sí existe**. El gate `MOTIVO_SIN_BACKEND` sobre esa mutación es obsoleto.
- `usePresupuesto.ts:44` traga el 404 de `/proyectos/{id}/presupuestos` diciendo que la ruta no existe — **sí existe** (la sirve `ProyectoResource`). Ese catch ahora esconde fallos reales.
- Marcadores `TODO(047)` en `src/api/contract.ts:483` y `src/shell/contexto.ts:19` — ambos afirman cosas falsas sobre tipos `Long`. **Borrar.**

### 5.8 Estado de la degradación de módulos

`src/lib/disponibilidad.ts` → `MODULOS_SIN_BACKEND = {documentos, plantillas, plantillas-proyecto, admin}`

Contra main eso está mal en ambos sentidos:
- **`cronograma` NO está en el set y es correcto que no esté** — tiene backend desde `c337950`.
  Lo que hace falta no es degradarlo sino **alinearlo** (plan 055).
- **Descuento global** está cableado en la UI (`DialogoDescuentoGlobal`) sin backend → **degradar**.
- `plantillas` y `plantillas-proyecto` **sí** tienen backend → se pueden encender.
- `admin` tiene backend **solo** para bases centrales → encender 1 de 6 páginas.

---

## 6. Qué se hizo en la sesión anterior (commits en `main` del frontend)

| Commit | Qué | Veredicto contra `origin/main` |
|---|---|---|
| `e44c608` | Alineación presupuesto/versiones + un-degrade | **parcialmente mal** — tipó presupuesto/capitulo/rubro como `number` |
| `4b15612` | Reparación de 8 errores de tipo | correcto |
| `2ebf40d` | Migración UUIDv7 de proyecto/insumo/apu/firmante/base/plantilla a `string` | **correcto, conservar** |
| `0e09c87` | Roadmap V2 + planes 047–052 | escritos contra la rama equivocada |
| `8244e4b` | Corrección del roadmap a `origin/main` | correcto |

**Planes 047–052 y el roadmap V2: leer con cuidado.** Los hallazgos sobre bugs de hooks del
frontend (URLs mal, verbos mal, campos descartados) **siguen siendo válidos**; las conclusiones
sobre qué endpoints existen **no**, porque se escribieron contra `test/stuff`.

**Planes 038–045: no ejecutar.** Superseded.

Suite actual: 45 archivos, 207 tests, verdes. `npm run typecheck` limpio.
`e2e/screenshots.spec.ts` quedó con ids numéricos en ~26 sitios (fuera del gate de vitest; el
plan 021 es dueño de esa suite).

---

## 7. Trabajo pendiente propuesto

**11 planes, todos escritos.** Orden por dependencia. Solo uno está bloqueado y solo por una
decisión de producto.

### P0 — corregir el seam contra main

| # | Plan | Qué | Esf. |
|---|---|---|---|
| 0 | [`061`](061-politica-de-dinero.md) | **Política de dinero** (decisión del humano, 2026-09-06): el helper de cuantización, los 2 sitios con aritmética de float, la guarda de CI que el plan 015 prometió y nunca llegó, y corregir la doctrina falsa del README. Condiciona el tipado de 053, 050, 055 y 059. | M |
| 1 | [`053`](053-retipar-ids-presupuesto-uuid.md) | Re-tipar presupuesto · capítulo · rubro a `string`. Borra `RubroResponse.alertas`, los guards `> 0`, los `TODO(047)`, el catch mentiroso de `usePresupuesto.ts:44` y el `exhaustive-deps` de `shell/contexto.ts:50`. | M |
| 2 | [`054`](054-degradar-descuento-global-y-bugs-silenciosos.md) | Degradar descuento global **y corregir su contrato** (`cdAntes`, no `cdAjustado`). Cierra los 3 bugs SILENT. Borra el descuento de APU. | S |
| 3 | [`059`](059-corregir-formas-de-dto.md) | Las 10 formas de DTO de §5.4/§5.6. Incluye `ApuDetalleCrearRequest.seccionTipo`, que hoy **rompe añadir una línea de APU con un 400**. | M |

### P1 — la red que falta

| # | Plan | Qué | Esf. |
|---|---|---|---|
| 4 | [`057`](057-cobertura-de-tests-en-el-seam.md) | **26 de 27 hooks sin test.** Es la causa raíz de que tres análisis equivocados pasaran el gate. Tests de contrato sobre la petición saliente, handlers MSW estrictos, las 11 páginas huérfanas. | L |
| 5 | [`028`](028-validar-respuestas-con-zod.md) | Zod en el seam. **Desbloqueado** — la decisión del dinero está tomada (§9.2). Hermano del 057: Zod valida lo que entra, el 057 prueba lo que sale. | M |

> **Por qué la suite no cazó nada.** Los 207 tests cubren páginas y componentes — la capa que
> consume el hook ya mockeado — nunca la que habla con la red. Y en los hooks vive **cada uno** de
> los defectos de §5.1, §5.2 y §5.3. No es mala suerte: la suite no mira ahí, por construcción.
>
> Consecuencia: **todo plan que toque un hook deja un test de hook.** Un test que monta la página y
> comprueba que «cargó» sigue verde contra todos estos bugs.

### P2 — encender lo que main ya soporta

| # | Plan | Qué | Esf. |
|---|---|---|---|
| 6 | [`055`](055-cronograma-alinear-y-encender.md) | **Cronograma.** El módulo de mayor retorno: UI escrita, backend recién entregado, contrato desalineado. Rebanadas 1–4 seguras; la 5 espera a N05 (§9.5). | L |
| 7 | [`048`](048-enable-plantillas-apu.md) | Plantillas APU — **válido tal cual**, corregida la fuente a `origin/main`. | S |
| 8 | [`049`](049-enable-plantillas-proyecto.md) | Plantillas de proyecto — **válido**, sus 4 defectos son reales. | M |
| 9 | [`050`](050-enable-admin-module.md) | **Reescrito.** Admin: solo bases centrales + **construir S-39** + gate por página + los 11 campos de parámetros de sistema. | M |
| 10 | [`051`](051-enable-documentos-export.md) | **Reescrito.** Export: solo ET en DOCX. Borra las 4 URLs inventadas. Estrena la descarga binaria. | S |
| 11 | [`052`](052-reenable-stale-actions.md) | **Parcialmente anulado.** Encender duplicar APU y guardar plantilla; el desglose tras el 059; el descuento se borra, no se enciende. | S |

### P3 — hallazgos del barrido

| # | Plan | Qué | Esf. |
|---|---|---|---|
| 12 | [`058`](058-bases-personales.md) | **`bases-personales`: 4 endpoints, cero UI.** Feature entera que ningún plan había visto. Tiene una pregunta que decide su tamaño. | M |
| 13 | [`056`](056-decidir-y-cerrar-responsive.md) | **Responsive: escritorio y móvil**, decidido 2026-09-06. Tres fases; **prioridad baja**, no compite con lo demás. La fase 3 exige wireframe antes de código. | L |
| 14 | [`060`](060-limpieza-deuda-menor.md) | Limpieza final: 8 shadcn sin usar, 3 warnings de lint, 26 ids numéricos en los E2E, verificar que no quedan `as never` ni comentarios mentirosos. **Ejecutar el último.** | S |

### Ruta de ejecución

Siete olas. Dentro de una ola los planes son paralelizables; entre olas, no.

| Ola | Planes | Por qué en este orden |
|---|---|---|
| **0** | [`061`](061-politica-de-dinero.md) | Fija cómo se tipa el dinero. Va antes que cualquier re-tipado o se re-tipa dos veces. |
| **1** | [`053`](053-retipar-ids-presupuesto-uuid.md) | Solo. Toca todo el dominio presupuesto de `contract.ts`; nada más puede tocarlo a la vez. |
| **2** | [`054`](054-degradar-descuento-global-y-bugs-silenciosos.md) → [`059`](059-corregir-formas-de-dto.md) | **Secuencial, no paralelo:** los dos editan `ApuResponse`. El 054 le quita `porcentajeDescuento`, el 059 le añade `porcentajeIndirectoEfectivo`. |
| **3** | [`057`](057-cobertura-de-tests-en-el-seam.md) | Con el seam ya correcto, se fija con tests de contrato. Rebanable por módulo si urge avanzar. |
| **4** | [`028`](028-validar-respuestas-con-zod.md) | Los esquemas salen de los tests de la ola 3, derivados del uso real. Va **antes** de encender módulos: cada uno encendido sin Zod es otra superficie donde la deriva pasa el gate en verde. |
| **5** | [`055`](055-cronograma-alinear-y-encender.md) *(reb. 1–4)* · [`048`](048-enable-plantillas-apu.md) · [`049`](049-enable-plantillas-proyecto.md) · [`050`](050-enable-admin-module.md) · [`051`](051-enable-documentos-export.md) · [`052`](052-reenable-stale-actions.md) · [`058`](058-bases-personales.md) | **Paralelizables.** Módulos distintos, archivos distintos. |
| **6** | [`060`](060-limpieza-deuda-menor.md) | Último por definición: verifica que no quedan `as never`, comentarios mentirosos ni ids numéricos en los E2E. |

```
061 ─► 053 ─► 054 ─► 059 ─► 057 ─► 028 ─┬─► 055 (1–4)
                                        ├─► 048
                                        ├─► 049
                                        ├─► 050   ─► 060
                                        ├─► 051
                                        ├─► 052
                                        └─► 058
```

**Dos choques dentro de la ola 5, si se lanza en paralelo de verdad:**

- `050` y `058` tocan los componentes de insumos — el 050 los reutiliza para S-39, el 058 añade un
  origen a `DialogoCopiarBase`. Que los haga el mismo agente, o uno detrás del otro.
- `052` necesita el `059` ya cerrado para encender el desglose. Está en la ola 2, así que se
  cumple; solo hay que no adelantarlo.

### Fuera de las olas

| Qué | Estado |
|---|---|
| [`056`](056-decidir-y-cerrar-responsive.md) — responsive | ⏸ **EN ESPERA.** Alcance decidido (escritorio y móvil, tres fases); **arranca cuando el humano lo pida.** No bloquea a nadie ni nadie lo bloquea: puede entrar entre dos olas o después de todas. |
| [`055`](055-cronograma-alinear-y-encender.md) rebanada 5 — vistas del cronograma | ⏸ **DIFERIDA hasta N05.** El 055 **cierra sin ella** con el módulo correcto y encendido; lo que falta es visualización, no corrección. |

**N05 no se agenda para desbloquear nada.** Ninguna ola la espera. Solo hay que tenerla respondida
antes de construir el Gantt, y esa es la única pieza que queda fuera.

### Planes muertos

**038–045**: planes de backend escritos contra el contrato viejo. **No ejecutar.**
**047**: anulado — las inconsistencias de id que describía eran artefactos de `test/stuff`.

---

## 8. Qué contiene `test/stuff` (para decidir si se mergea)

Todo verificado leyendo `git show test/stuff:<path>`.

### Lo que aporta y main no tiene

| Feature | Recursos |
|---|---|
| ~~**Cronograma**~~ | **Ya no aplica.** Main lo implementó de cero en `c337950`, mejor y sobre el contrato UUID. El de `test/stuff` es material muerto. |
| **Admin completo** | `AdminUsuarioResource` (`/admin/usuarios`, desactivar, reactivar) · `AdminLogResource` (`/admin/logs`) · `AdminParametrosSistemaResource` (`/admin/parametros-sistema`) |
| **Exportadores XLSX** | `/documentos/apu/{apuId}` · `/documentos/apus/{presupuestoId}` · `/documentos/presupuesto/{presupuestoId}` · `/documentos/cronograma/{presupuestoId}` |
| **Descuento global** | `DescuentoGlobalService` + endpoints de preview y aplicación |

### Lo que quita respecto a main

- `DELETE /admin/bases-centrales/{id}` (commit `a5f34db`).

### El problema: los contratos de presupuesto son incompatibles

```java
// origin/main
PresupuestoResponse(UUID presupuestoId, Short version, boolean esVigente,
                    String totalGeneral, List<CapituloResponse> capitulos)
// test/stuff
PresupuestoResponse(Long presupuestoId, Short version, boolean esVigente,
                    BigDecimal totalGeneral, List<CapituloResponse> capitulos)
```

Difieren en **dos ejes a la vez**: tipo de id (`UUID` vs `Long`) y serialización del dinero
(string vs número). Lo mismo en `PresupuestoVersionResource`: main declara
`@PathParam("proyectoId") String`, test/stuff declara `Long`.

Main además refactorizó presupuesto en recursos separados (`ComparacionResource`,
`PresupuestoValidacionResource`, `PresupuestoVigenciaResource`, `ResumenComponentesResource`)
que en test/stuff no existen como tales.

### Superficie del conflicto

```
git diff --shortstat origin/main test/stuff
198 files changed, 6247 insertions(+), 18616 deletions(-)
```

Es decir: **main tiene ~18.6k líneas que test/stuff no tiene.** Archivos que difieren por
paquete: `presupuesto` 43 · `api` 33 · tests 29 · `docs` 17 · `cronograma` 14 · `apu` 12 ·
`plans` 11 · `admin` 10 · `documento` 5.

**No es un merge trivial.** El módulo presupuesto divergió de raíz.

### Otros datos

- Suite en test/stuff: 318 tests, 2 en rojo aceptados (GM-19/GM-20, redondeo de
  consolidación del motor), 1 skipped (GM-24, fixture upstream).
- test/stuff tiene **dos clases `DocumentoResource` registradas en el mismo `@Path("/documentos")`**
  (`documento/DocumentoResource.java` y `documento/resource/DocumentoResource.java`) — parece
  artefacto de merge, probablemente un bug.

### Las tres salidas

1. **Abandonar `test/stuff`** y reimplementar cronograma/admin/export sobre el contrato UUID de
   main. Se pierde trabajo, pero el contrato queda uniforme.
2. **Mergear `test/stuff` a main** portando sus features al contrato de main (UUID + dinero
   string). El conflicto real está en los 43 archivos de presupuesto.
3. **Cherry-pick por feature.** Cronograma, admin y export son bastante independientes del
   contrato de presupuesto salvo por los ids que reciben; podrían portarse de uno en uno.
   Descuento global sí toca presupuesto de lleno.

La opción 3 es la que menos bloquea al frontend: permite encender módulos por separado sin
esperar a resolver todo el conflicto de presupuesto.

### Lo que cambia tras `c337950`

Cronograma era **la razón más fuerte para mergear `test/stuff`**, y main lo resolvió por su cuenta
sobre el contrato correcto. Lo que queda en la rama es:

| Feature | ¿Vale la pena rescatarla? |
|---|---|
| Cronograma | **No.** Superada por main. |
| Admin usuarios / logs / parámetros-sistema | Quizá. Es la única fuente para S-37, S-41, S-42. Requiere portar de `Long` a UUID. |
| Exportadores XLSX | Quizá. Es la única fuente para P-37 / S-35 más allá del DOCX de ET. |
| Descuento global | Dudoso. Toca presupuesto de lleno y su semántica sigue abierta (`thesis-docs` decisión #11). |

Y el coste no bajó: `git diff --shortstat origin/main test/stuff` sigue dando main +18,6k líneas
que la rama no tiene, con 43 archivos de presupuesto divergentes. El ritmo de main sugiere una
cuarta salida que antes no estaba sobre la mesa: **esperar**. Main lleva planes 026–030 en dos
días; admin y export son los siguientes en el roadmap de `thesis-docs` (I-10 export, I-11
super-admin).

---

## 9. Decisiones que necesita el humano

1. **¿`test/stuff` se mergea, se abandona o se espera?** Ya **no es bloqueante para el frontend**:
   cronograma —su aportación principal— llegó por main. Lo que queda (admin completo, exports
   XLSX, descuento global) afecta a los planes 050 y 051, que de todas formas hay que reescribir.
   La recomendación es **esperar a main** y no invertir en el merge: el ritmo de main (planes
   026–030 en dos días) sugiere que admin y export llegan antes que el port.
2. ~~**¿Cómo representar el dinero?**~~ **RESUELTA 2026-09-06:** editable → `number` cuantizado,
   solo lectura → `string`, sobre el eje de transporte que fija el backend. Ver §2 y el plan
   [`061`](061-politica-de-dinero.md). Desbloquea el 028.
3. ~~**Descuento APU:** ¿lo quiere producto de vuelta?~~ **RESUELTA en los docs**
   (v1.3 §2.5.4 / N04 §A1, rollout 2026-08-31): P-24, S-24, `POST /apus/{id}/descuento`,
   `DescuentoRubroRequest` y `CD_ajustado` están **WITHDRAWN**. No hay nada que decidir: el plan
   054 borra el control de la UI. Ver §10.2.
4. ~~**Cronograma:** ¿se espera a main o se rescata de `test/stuff`?~~ **RESUELTA por los hechos**
   (`c337950`, 2026-09-05): lo implementó main. Ejecutar el plan 055.
5. **Nueva — agendar N05.** La entrevista de cronograma existe pero está **sin responder** (las
   siete preguntas en blanco, fecha «Por definir»), y el backend ya implementó seis de ellas de
   hecho. La más cara es la #2, Gantt arrastrable: el backend expone `MOVER_SEGMENTO` y
   `REDIMENSIONAR_SEGMENTO`, mientras `02-pantallas-flujos.md` §5.4 sigue listando
   «read-only vs drag-to-reschedule» como abierta. **Agendar N05 antes de construir la UI del
   Gantt** (rebanada 5 del plan 055); las rebanadas 1–4 no dependen de ninguna respuesta. Ver §10.4.
6. **Nueva — ¿cuándo llega el backend del descuento global?** La especificación está **cerrada**
   desde el 2026-08-31 (FORMA 1, §10.2) y los endpoints están documentados, pero `origin/main` no
   los tiene. El plan 054 lo degrada. Si está cerca, quizá no valga la pena degradar y volver a
   encender: preguntar al compañero que lleva main.
7. ~~**¿El producto se usa en móvil?**~~ **RESUELTA 2026-09-06: escritorio y móvil, ambos,
   prioridad baja.** El 80 % sin breakpoints sí es deuda, pero no bloquea a nadie y no compite con
   053–061. Tres fases en el plan [`056`](056-decidir-y-cerrar-responsive.md); la fase 3 (S-22,
   S-27, S-33) exige wireframe móvil antes de tocar código, porque no se resuelve con clases.
8. **Nueva — ¿cómo se llena una base personal?** Existen `GET/POST /bases-personales` y
   `DELETE /{id}`, pero **ningún endpoint mete insumos dentro**, a diferencia de las bases
   centrales. Media hora de leer `BasesPersonalesService` lo resuelve y decide el tamaño del plan
   [`058`](058-bases-personales.md).

---

## 10. Estado de `../thesis-docs` (`411242f`, 2026-09-01)

Dos commits posteriores a la primera redacción de este handoff: `db34c77` (2026-08-31) y
`411242f` (2026-09-01, **28 archivos, +647/−247**). No son retoques: cierran una decisión de
producto y añaden una entrevista.

### 10.1 Qué documento sirve para qué

| Documento | Rol |
|---|---|
| `plan/design/02-pantallas-flujos.md` | **Inventario canónico de UI**: 44 unidades (S-01…S-44), 44 procesos (P-01…P-44), rutas y flujos F-01…F-10. Es contra esto que se mide la cobertura del frontend, no contra la lista de endpoints. |
| `plan/design/03-procesos-detalle.md` | Cada proceso paso a paso, alternativos, errores, postcondiciones. Fuente de los casos de aceptación. |
| `plan/design/07-decisiones-i06-pendientes.md` | Decisiones N04 / N04-bis con el ingeniero civil. |
| `plan/architecture/07-api-contract.md` | Contrato **de diseño**. Ver 10.3: en cronograma ya no coincide con el código. |
| `plan/roadmap/01-plan-iteraciones-xp.md` | I-01…I-12. El backend cerró I-09; siguen I-10 (export SERCOP) e I-11 (super-admin). |

### 10.2 Descuento — la decisión se cerró el 2026-08-31, y el frontend implementa la versión retirada

Esto **corrige** lo que decían las versiones anteriores de este handoff y del roadmap V2.

**P-24 «descuento por rubro» está WITHDRAWN formalmente** (v1.3 §2.5.4 / N04 §A1, rollout
2026-08-31). No es un endpoint que el backend «no ha hecho todavía»: es una feature retirada del
contrato, con la documentación reescrita en cascada. Quedan retirados a la vez:

`POST /apus/{id}/descuento` · `DescuentoRubroRequest` · pantalla S-24 · el campo
`porcentajeDescuento` en `ApuPatchRequest`/`ApuResponse`/`ApuCalculoResponse` · el paso intermedio
`CD_ajustado` · `operacionCdAjustado` · los tests TC-P24-01/02. La columna
`apu.porcentaje_descuento` sobrevive en el DDL V001 como **seam inerte** (default `0.0000`, nunca
se lee ni se escribe).

Esto explica los dos tests del backend que custodian la ausencia, y confirma que el plan 054 debe
**borrar** el control, no deshabilitarlo.

**P-12 «descuento global» pasó de `◐ abierta #11` a `✓ resuelto`.** Y su semántica no es la que el
frontend implementa. FORMA 1:

- reduce **columnas de la base PROYECTO**, no un porcentaje en el APU:
  `tarifa` en EQUIPO y TRANSPORTE, `precio_unitario` en MATERIAL
- **MANO_OBRA exenta por ley**; la Herramienta Menor tampoco se descuenta (es derivada de N, no
  es un insumo de la base)
- las filas con override `NULL` heredan el cambio solas (regla null-means-inherit, DM §8)
- reversible poniendo 0 % (restauración de snapshot)
- el rango sale de `ParametrosSistema.rango_descuento_min` / `rango_descuento_max`, no está fijo
  en 0–50

Forma canónica de la respuesta de preview (escala 6, `porApu`, **sin `cdAjustado`**):

```jsonc
{ "porcentaje": "0.0300",
  "porApu": [ { "apuId": "<UUIDv7>", "codigo": "…",
                "cdAntes": "10.200000", "cd": "10.020000",
                "ci": "1.803600", "ct": "11.823600" } ],
  "totalGeneralActual": "…", "totalGeneralProyectado": "…" }
```

El `DescuentoGlobalPreviewResponse` del frontend tiene `cd` + **`cdAjustado`** y le falta
`cdAntes`. Es la forma retirada. Hay que rehacer el tipo aunque el módulo quede degradado.

Consecuencia para §5.4: **el veredicto sobre `ApuCalculoResponse` ahora tiene respaldo de
especificación, no solo de un contract test.** La forma activa es
`{apuId, codigo, parametros{hm,ciDefault,ciAplicado}, secciones[…{operacion}], resumen{cd,operacionCi,ci,ct}}`.

### 10.3 Cronograma: los docs y el código **no** coinciden — y el frontend siguió a los docs

`07-api-contract.md` §7 sigue describiendo el cronograma anterior a los planes backend 026–030.
Esto reencuadra el diagnóstico del §4-bis: **el frontend no está mal por descuido, está fiel al
contrato documentado**; el backend implementó otro.

| Punto | `07-api-contract.md` §7 | `origin/main` `c337950` | Quién acierta |
|---|---|---|---|
| Configurar | `PUT /cronogramas/{id}` | `PUT /cronogramas/{id}/configuracion` | código |
| Programar actividad | `ActividadAvanceRequest {avancePorPeriodo}` | unión de 4 operaciones con discriminante `operacion` | código (superset) |
| Vistas | «P-35 es render cliente, **sin endpoint propio**» | `GET /cronogramas/{id}/vistas` (Gantt jerárquico, valorizado, curva S) | código |
| `CronogramaResponse.id` | `1` — **numérico** | UUIDv7 | código (los docs se contradicen: todo lo demás es UUIDv7) |
| Código del 409 de configuración | `reduccion-periodos-requiere-confirmacion` | `configuracion-cronograma-requiere-confirmacion` | código |
| `estadoDistribucion`, `avanceFinal`, `segmentos[]` | no existen | existen | código |
| `avancePorPeriodo` de cronograma | **array** `["8.3000","12.5000"]` | array | **los docs ya lo decían**; el front usa mapa |
| `pesoPonderado`, avances | porcentajes escala 4 | porcentajes escala 4 | **los docs ya lo decían**; la fixture usa dinero |

Las dos últimas filas importan: **dos de los errores del frontend contradicen también a los docs**,
así que no se pueden achacar a la divergencia. Los demás sí.

Acción: sincronizar `07-api-contract.md` §7 con el código, o marcarlo explícitamente como derivado.
Mientras no se haga, cualquiera que planifique cronograma leyendo los docs repite el error.

### 10.4 N05 — la entrevista de cronograma existe y está **sin responder**

`DOCUMENTOS/entrevistas/05/N05_entrevista-cronograma.md`, nuevo en `411242f`. Fecha «Por definir».
Siete preguntas al Ing. Carlosama, **las siete con la «Decisión de negocio» en blanco**.

El backend ya implementó los planes 026–030 y respondió de hecho a seis de ellas:

| N05 | Pregunta | Lo que el código ya decidió |
|---|---|---|
| 1 | ¿Períodos consecutivos o con interrupciones? | Interrupciones permitidas — `segmentos[]` son los runs máximos |
| 2 | ¿Gantt read-only o arrastrable? | Arrastrable — `MOVER_SEGMENTO`, `REDIMENSIONAR_SEGMENTO` |
| 3 | ¿Se puede guardar una distribución incompleta? | Sí — `estadoDistribucion: "BORRADOR"` con `desviacion` visible |
| 4 | ¿Qué pasa si cambia el presupuesto después de programar? | Conservar valores + marcar `desactualizado` vía fingerprint, revisión manual |
| 5 | ¿Curva S? | Sí, en pantalla — `CurvaSResponse` |
| 6 | ¿Lista plana o jerarquía de capítulos? | Jerarquía — `CapituloCronogramaResponse` recursivo |
| 7 | ¿Estructura del documento exportado? | **Sin responder ni implementar** — no hay export de cronograma |

**Riesgo real, no teórico:** si el ingeniero contesta distinto en cualquiera de las seis, hay
retrabajo en backend *y* en el frontend que se construya encima. La pregunta 2 es la más cara: si
dice «read-only», sobran dos operaciones del PATCH y la UI que las use.

Recomendación: **agendar N05 antes de construir la UI del Gantt** (rebanada 5 del plan 055). Las
rebanadas 1–4 son seguras: corrigen el seam y no dependen de ninguna de las siete respuestas.

### 10.5 Deuda de documentación que sigue abierta

1. **P-09 duplicar proyecto** sigue marcado `✗ §5.2` (condicional). No hay backend y el frontend lo
   llama (`useProyectos.ts:65`). Cerrar: implementar o quitar de la UI.
2. **S-11 firmantes** sigue como «hueco de requerimientos» (§5.1), pero el backend expone
   `/proyectos/{id}/firmantes` con CRUD completo y el frontend tiene `TabFirmantes`. Dejó de ser
   un hueco.
3. **`07-api-contract.md` §7 cronograma** desincronizado — ver 10.3.
4. **Decisión «Gantt read-only vs drag-to-reschedule»** (§5.4) sigue listada como abierta, y N05 §2
   la vuelve a preguntar, pero el backend ya la implementó como editable. Cerrarla o revertir el
   backend.
5. `P-41` se movió en los docs de `/admin/parametros-sistema` a `/proyectos/parametros-sistema`,
   que es lo que hace el código. El request se llama ahora `ParametrosSistemaEditarRequest`.
   Actualizar el nombre del tipo en el frontend cuando se toque §5.4.
