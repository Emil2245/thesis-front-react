# Plan 050 — Admin: encender bases centrales y construir S-39

**Status:** TODO — **reescrito 2026-09-06**
**Escrito contra:** frontend `8cc08b5` · backend `origin/main` @ `c337950`
**Fuente de verdad:** `AdminBaseCentralResource` en `origin/main`, leído del código
**Esfuerzo:** M (4–6 h) · **Riesgo:** MEDIO — hoy los 5 hooks de admin apuntan a rutas inexistentes
**Depende de:** `061` (los parámetros pasan a `number`) → `053`
**Choca con:** `058` — ambos tocan los componentes de insumos

> ## Aviso de reescritura
>
> La versión anterior se escribió contra `test/stuff` y prometía encender **4 de 6** páginas de
> admin. `test/stuff` no está mergeada y `origin/main` **solo tiene el admin de bases centrales**.
> Verificado con conteo de archivos: `AdminUsuario` 0 · `AdminLog` 0 · `AdminParametros` 0.
>
> Además, aquella versión decía cosas que hoy son falsas: `PUT /admin/usuarios/{id}`,
> `POST /{id}/reactivar`, `POST /{id}/desactivar`, `PUT /admin/parametros-sistema` — **ninguna
> existe en main**. No las uses como referencia.

## Alcance real

De las 6 páginas de admin, **1 se enciende y 1 hay que construirla**. Las otras 4 se quedan.

| Página | Backend en `origin/main` | Acción |
|---|---|---|
| S-38 bases centrales (`/admin/bases`) | ✅ 4 endpoints | **encender** + corregir ruta |
| **S-39 detalle de base (`/admin/bases/:id`)** | ✅ 4 endpoints | **construir — no existe** |
| S-37 usuarios | ❌ | mantener degradada |
| S-40 plantillas de sistema | ❌ | mantener degradada |
| S-41 parámetros de sistema | ✅ pero **no bajo `/admin`** | ver rebanada 5 |
| S-41 valores de referencia | ❌ | mantener degradada |
| S-42 logs | ❌ | mantener degradada |

## Lo que sirve `origin/main`

Todo bajo `@RolesAllowed("SUPER_ADMIN")`, ids UUIDv7 string.

| Verbo | Ruta | Body | Devuelve |
|---|---|---|---|
| `GET` | `/admin/bases-centrales?incluirArchivadas=false` | — | **`List<AdminBaseCentralResponse>`** — lista pelada |
| `POST` | `/admin/bases-centrales` | `{nombre}` `@NotBlank @Size(max=200)` | 201 `AdminBaseCentralResponse` |
| `PUT` | `/admin/bases-centrales/{id}` | `{nombre}` | `AdminBaseCentralResponse` (renombrar) |
| `POST` | `/admin/bases-centrales/{id}/archivar` | — | `AdminBaseCentralResponse` |
| `DELETE` | `/admin/bases-centrales/{id}` | — | 204 |
| `POST` | `/admin/bases-centrales/{id}/insumos` | insumo | 201 |
| `PUT` | `/admin/bases-centrales/{id}/insumos/{iid}` | insumo | 200 |
| `DELETE` | `/admin/bases-centrales/{id}/insumos/{iid}` | — | 204 |
| `POST` | `/admin/bases-centrales/{id}/insumos/import` | CSV | resultado de import |

```ts
AdminBaseCentralResponse { id: string; nombre: string; tipo: string;
                           archivada: boolean; totalInsumos: number }
```

`totalInsumos` es un `long` → **number**, no `Decimal`.

> `DELETE /admin/bases-centrales/{id}` **sí existe en main**. El commit `a5f34db` que lo quitaba
> vive solo en `test/stuff`. Si algún día se mergea esa rama, este endpoint desaparece.

## Los 5 defectos de los hooks

| Hook | Hoy | Real |
|---|---|---|
| `useAdminBases` | `GET /admin/bases` → `Page<T>` | `GET /admin/bases-centrales` → **`List<T>`** |
| `useCrearBase` | `POST /admin/bases` | `POST /admin/bases-centrales` |
| `useArchivarBase` | `POST /admin/bases/{id}/archivar`, `id: number` | ruta correcta + **`id: string`** |
| `useEliminarBase` | `DELETE /admin/bases/{id}` | `DELETE /admin/bases-centrales/{id}` |
| — | *falta* | `PUT /admin/bases-centrales/{id}` renombrar |

El de `Page` vs `List` es el que rompe en pantalla: `AdminBasesPage` hace `data?.contenido.map`, y
el interceptor de axios solo renombra `items`→`contenido` cuando la respuesta **es un objeto con
`items`**. Una lista pelada pasa tal cual → `data.contenido` es `undefined` → la página revienta
al montar.

## Rebanadas

### 1 — fixture y handlers en rojo

`src/test/fixtures/admin.ts`: `basesCentralesFixtureAdmin` a `AdminBaseCentralResponse[]` con
UUIDs estables y `totalInsumos` numérico. **Servirla como array pelado**, no envuelta en
`pagina()`. El handler pasa a `GET /admin/bases-centrales` y respeta `?incluirArchivadas`.

Con la fixture como lista, el `data?.contenido.map` de la página deja de compilar. Ese error es la
prueba de que el bug era real.

### 2 — tipos y hooks

`AdminBaseCentralResponse` en `contract.ts` (hoy no existe: §5.6 del handoff). `useAdminBases`
devuelve `AdminBaseCentralResponse[]`, no `Page<...>`. Rutas y `id: string` en los 4 hooks.
Añadir `useRenombrarBase`. `qk.adminBases` acepta `incluirArchivadas`.

### 3 — encender S-38

Quitar el stub `ModuloNoDisponible` de `AdminBasesPage`, exportar la versión activa. Ajustar la
tabla a lista pelada: sin paginación, con columna `totalInsumos` y `archivada`, y un filtro
«incluir archivadas» cableado al query param.

**No quitar `"admin"` de `MODULOS_SIN_BACKEND` todavía** — las otras 4 páginas lo siguen
necesitando. Cambiar el gate de granularidad de módulo a granularidad de página: en vez de
`MODULOS_SIN_BACKEND.has("admin")`, cada página consulta su propia clave
(`admin-usuarios`, `admin-logs`, `admin-plantillas`, `admin-valores`). El `Sidebar` ya itera sobre
las entradas con `modulo`, así que el cambio es de datos, no de estructura.

### 4 — construir S-39 (`/admin/bases/:id`)

**La única pantalla del inventario S-01…S-44 que no existe**, y su backend está completo.

Ruta nueva `/admin/bases/:id` en `src/routes/index.tsx`, bajo el guard de SUPER_ADMIN. Contenido
según `02-pantallas-flujos.md` S-39: tabla de insumos de la base con CRUD e import CSV.

**Reutilizar, no reescribir.** `TablaInsumos`, `DialogoInsumo` y `AsistenteImportCsv` ya existen
para la base del proyecto y los cuatro endpoints de insumos de admin son la misma forma con otra
ruta. Lo que hace falta es parametrizar la ruta base de esos componentes, no duplicarlos. Si al
terminar hay un `TablaInsumosAdmin` copiado, la rebanada se hizo mal.

`AsistenteImportCsv` ya contempla destino central (F-05 del doc de flujos): comprobar antes de
tocarlo.

### 5 — parámetros del sistema: el gate es obsoleto

`useParametrosSistema.ts:16` dice que las escrituras no existen. **`PUT /proyectos/parametros-sistema`
existe** (SUPER_ADMIN), y el `GET` es de usuario. No están bajo `/admin/`, que es exactamente por
qué el análisis viejo no los encontró.

Encender esa mutación **no** es trivial, porque el request cambió de forma. El backend exige
**11 campos `@NotNull`**:

```ts
ParametrosSistemaEditarRequest {   // antes se llamaba ParametrosSistemaActualizarRequest
  porcentajeHerramientaMenor: number   // @NotNull, 0..1
  porcentajeIndirecto?: number         // opcional
  iva: number                          // @NotNull, 0..1
  rangoHmMin: number; rangoHmMax: number
  rangoCiMin: number; rangoCiMax: number
  rangoDescuentoMin: number; rangoDescuentoMax: number
  rangoIvaMin: number; rangoIvaMax: number   // los 8 @NotNull, 0..1
  moneda?: string                      // @Size(max=10)
}
```

`AdminParametrosPage` manda **4** campos y tipados `Decimal`. Son `BigDecimal` → **number en el
JSON**. Ahí están 3 de los 9 `as never` del repo (`AdminParametrosPage.tsx:83-85`): el formulario
lee `ref.current?.value` (string) y lo fuerza a `Decimal`. Al pasar a `number` con
`Number(...)` los tres casteos desaparecen.

El `GET` devuelve la **entidad cruda** `ParametrosSistema`, no un DTO: trae además `moneda`, 6
booleanos de display (`mostrarSeccionesVacias`, `sufijosSeccionActivos`, `mostrarSubtotalesSeccion`,
`mostrarSubtotalesPie`, `mostrarNombreProyectoHeader`, `enumerarApus`), `mensajeFooter`,
`modoCodigoRubro` y `updatedAt`. El frontend los omite todos.

**Enviar un PUT con 4 de 11 campos obligatorios devuelve 400.** Hay que completar el formulario
antes de encender el botón, no solo quitar el tooltip.

Los rangos importan más allá de esta pantalla: `rangoDescuentoMin`/`Max` son los que validan el
descuento global (plan 054), y `rangoHm*`/`rangoCi*` los parámetros de proyecto (plan 036, hecho).

### 6 — dejar las 4 restantes degradadas, con el motivo correcto

`AdminUsuariosPage`, `AdminLogsPage`, `AdminPlantillasPage`, `AdminValoresPage` mantienen el stub.
Los comentarios de cabecera de las cuatro dicen «quita "admin" de `MODULOS_SIN_BACKEND`» — con el
gate por página eso deja de ser cierto. Reescribirlos.

Borrar los hooks muertos o dejarlos con una nota: `useAdminUsuarios`, `useAdminLogs`,
`useAdminPlantillas`, `useValoresReferencia` son 12 de las 23 llamadas rotas del inventario §3.1.
**Preferible borrarlos** — un hook que no se puede llamar es código que el próximo agente creerá
funcional. Los tipos correspondientes (`UsuarioAdminResponse`, `LogActividadResponse`,
`ValorReferenciaResponse`…) salen de `contract.ts` con ellos.

`POST /auth/aceptar-invitacion` existe en main pero no tiene UI, y su flujo depende del admin de
usuarios que no existe. Dejarlo anotado, no construirlo.

## Definición de hecho

- `npm run verify` en verde.
- Cero referencias a `/admin/bases` sin `-centrales`, `/admin/usuarios`, `/admin/logs`,
  `/admin/plantillas`, `/admin/valores-referencia` en `src/`.
- `/admin/bases/:id` existe, tiene test y reutiliza los componentes de insumos.
- El gate es por página, no por módulo.
- `AdminParametrosPage` manda los 11 campos y no tiene ningún `as never`.
