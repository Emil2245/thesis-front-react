# Handoff — estado real del frontend frente al backend `origin/main`

**Fecha:** 2026-09-06
**Frontend HEAD:** `8244e4b` (rama `main`)
**Backend de referencia:** `origin/main` @ `f707863` en `../thesis-back-quarkus`

Documento autocontenido. Escrito para retomar la planificación en una sesión nueva sin
contexto previo. Todo lo de aquí está **verificado leyendo código**, no inferido.

---

## 0. Lee esto antes que nada: dos trampas que ya costaron trabajo

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
casos**. Hoy se aplica indiscriminadamente. Hay que decidir la representación por módulo.

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

## 3. Qué existe en `origin/main` (26 recursos JAX-RS)

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
| **documentos** | **un solo endpoint:** `GET /documentos/especificaciones-tecnicas/{presupuestoId}?formato=docx` |
| **config** | `GET /config/display` |

---

## 4. Qué NO existe en `origin/main`

Verificado con conteo de archivos: **0 coincidencias** en cada caso.

| Ausente | Detalle |
|---|---|
| **Cronograma** | No hay recurso, servicio ni DTO. Solo `database/db_schemas/public/cronograma.sql` y `motor/CronogramaSnapshot.java` (interno). **Nada se expone por HTTP.** El HEAD de main se llama literalmente *"planificando cronograma"*. |
| **Admin usuarios / logs / parámetros-sistema** | Solo existe admin de bases centrales. Los parámetros de sistema viven en `/proyectos/parametros-sistema`, no en `/admin/`. |
| **Descuento global** | Cero archivos. |
| **Descuento a nivel APU** | **Retirado a propósito.** `DescuentoEndpointRetiradoTest` asserta que `ApuResource` NO debe exponer `@PATCH /porcentaje-descuento` (cita el Plan 015). Hay además un `DescuentoRetiradoContratoTest`. **Re-añadirlo rompe tests.** |
| **Exports XLSX** | Solo existe el constante de media-type y la rama de rechazo en `DocumentoResource`. No hay exportador. El endpoint de ET rechaza cualquier `formato` que no sea `docx`. |
| **Endpoints de logo** | Ninguno. Aun así `ProyectoResponse.tieneLogo` se devuelve — **campo muerto**. |
| **Duplicar proyecto** | No existe. |

---

## 5. Estado del frontend: qué está roto contra main

### 5.1 BROKEN — path o verbo no existe → 404/405 garantizado

| Call site | Llama a | En main |
|---|---|---|
| `useCronograma.ts:16,25,42,62,74` | `/presupuestos/{id}/cronograma`, `/cronogramas/{id}...` | no existe |
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
| `ApuCalculoResponse` | **Forma completamente distinta.** Main: `{apuId, codigo, parametros{hm,ciDefault,ciAplicado}, secciones[], resumen{cd,ci,ct}}`. Front: `{formulas[], subtotales, cd, cdAjustado, ci, ct}`. `cdAjustado` está explícitamente prohibido por un contract test. |
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

`UnidadTiempo`, `ActividadResponse`, `CronogramaResponse`, `CronogramaCrearRequest`,
`CronogramaConfigurarRequest`, `ActividadAvanceRequest`, `DescuentoGlobalPreviewResponse`,
`DescuentoGlobalRequest`, `UsuarioAdminResponse`, `UsuarioInvitarRequest`,
`UsuarioAdminEditarRequest`, `LogActividadResponse`, `ValorReferenciaResponse`,
`ValorReferenciaRequest`, `ProyectoDuplicarRequest`, `DescuentoRubroRequest`,
`PlantillaSistemaCrearRequest`.

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
- **`cronograma` NO está en el set** pero no tiene backend → hay que **degradarlo**.
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

Orden por dependencia. Nada por debajo de P0 debería arrancar antes de resolver la decisión
de la sección 8.

### P0 — corregir el seam contra main

1. **Re-tipar presupuesto · capitulo · rubro de `number` a `string`.** Revierte parte de
   `e44c608`. Borrar `RubroResponse.alertas`. Arreglar los guards `> 0` y
   `Number(searchParams.get("v")) || 0`. Borrar los `TODO(047)`.
2. **Re-degradar cronograma y descuento global.** Son bugs vivos, no features pendientes.
3. **Arreglar los 3 bugs SILENT** (§5.2) — son los más peligrosos porque hoy pasan por buenos.

### P1 — que la deriva no se pueda volver a colar

4. **Plan 028 — validación Zod en el seam.** Es lo de mayor apalancamiento del repo: dos
   análisis contra la rama equivocada produjeron código que typechequea y pasa 207 tests
   estando mal sobre el formato de red. Solo validación en runtime lo habría cazado.
   Al añadirla hay que resolver la partición de `Decimal` (§2, dinero).

### P2 — encender lo que main soporta

5. **Plantillas APU** — el backend existe. Arreglar `descripcion` → `descripcionRubro`.
6. **Plantillas de proyecto** — el backend existe (Resource + Guardar + Aplicar). Arreglar la
   URL de guardar, el wrapper `ProyectoDesdePlantillaResponse` y el `useState(0)`.
7. **Admin: solo bases centrales.** Corregir `/admin/bases` → `/admin/bases-centrales` y el
   `List` pelado (la página hace `data?.contenido.map`). Dejar degradadas usuarios, logs,
   valores y plantillas-sistema.
8. **Export: solo ET DOCX.** Quitar las 4 URLs inventadas y la opción PDF. **No cablear PDF a
   otro endpoint.**
9. **Corregir formas de DTO** (§5.4) — `ApuCalculoResponse`, `ApuDetalleCrearRequest`,
   `InsumoUsoResponse`, `RubroRefResponse`, parámetros de sistema.

### P3 — acciones deshabilitadas

Con backend en main: **duplicar APU** ✓, **guardar como plantilla** ✓, **desglose (`/calculo`)** ✓
(pero hay que arreglar antes la forma de `ApuCalculoResponse`), **guardar parámetros de sistema** ✓
(el gate es obsoleto).

Sin backend, dejar apagadas: **descuento APU** (retirado a propósito), **ver uso de insumo**
(el handler devuelve `List.of()`), **duplicar proyecto** (no existe).

---

## 8. Decisiones que necesita el humano

1. **¿`test/stuff` se mergea o se abandona?** Tiene cronograma, admin completo (usuarios/logs/
   parámetros), descuento global y los exportadores XLSX — trabajo real que main no tiene.
   Si aterriza, gran parte de las secciones 4, 5 y 7 cambian. **Es la decisión bloqueante.**
2. **¿Cómo representar el dinero?** El backend parte `String` (presupuesto) vs `BigDecimal`
   → número (APU/insumo/parámetros). Hay que decidir si el front normaliza en el seam o si
   `Decimal` se aplica solo a presupuesto.
3. **Descuento APU:** está retirado por diseño en main con tests que lo custodian. ¿El
   producto lo quiere de vuelta (habría que revertir el Plan 015) o se elimina de la UI?
4. **Cronograma:** ¿se espera a que main lo implemente, o se rescata de `test/stuff`?
