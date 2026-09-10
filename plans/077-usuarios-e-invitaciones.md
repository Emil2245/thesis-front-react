# 077 — Usuarios e invitaciones

> **Deriva corregida el 2026-09-10** contra el backend `../thesis-back-quarkus @ 2803575`
> y el frontend `plans/077-081 @ 98fd848`. Las §§1, 5, 8, 9 y 14 se reescribieron con lo que
> realmente hay; el resto del plan queda intacto. Razones en `plans/BITACORA.md`.

## 1. Estado inicial
**Backend (verificado @ `2803575`, servidor arriba con datos).** `UsuarioAdminResource.java`
declara `@Path("/admin/usuarios")` y `@RolesAllowed("SUPER_ADMIN")` a nivel de clase. DTOs:
`UsuarioInvitarRequest(nombre, email, rol)`, `UsuarioAdminEditarRequest(nombre, rol, activo)`,
`UsuarioAdminResponse(id, nombre, email, rol, activo, emailVerificado, fechaCreacion)`. El
`UsuarioAdminResponse` **no** tiene `passwordHash`, `tokenHash` ni `invitacionExpiraEn`: no hay
secreto que filtrar porque el DTO no lo lleva, y la prueba que lo afirma es una prueba de
regresión, no de paranoia.

**Frontend (verificado, y aquí es donde el plan original mentía).** `AdminUsuariosPage.tsx` **no
es un wrapper**: renderiza `<ModuloNoDisponible>` de forma incondicional, con el texto escrito a
mano, y ni siquiera importa `MODULOS_SIN_BACKEND`. **No existe ningún `*PageActiva` en todo el
repo**, pese a que `AGENTS.md` lo documenta como convención. `MODULOS_SIN_BACKEND` tiene un único
consumidor real, `src/shell/Sidebar.tsx`, que lo usa para pintar la insignia «pronto» en la barra
lateral. Consecuencia: **vaciar el `Set` en 081 no encendería nada**, porque ninguna página lo
consulta.

Por eso este plan **crea** el wrapper que el resto de la rama da por hecho:
`AdminUsuariosPage.tsx` pasa a consultar `MODULOS_SIN_BACKEND.has("admin-usuarios")` y delegar en
`AdminUsuariosPageActiva`. El gate **sigue cerrado** al terminar 077 —la clave no se toca— y 081
se reduce a vaciar el `Set`. `RutaAdmin` (el guard de rol en `src/routes/Guards.tsx`) no se toca
jamás.

## 2. Objetivo medible
Un SUPER_ADMIN puede listar, leer, invitar, editar, desactivar, reactivar y eliminar usuarios mediante UI real; un USUARIO ve 403; validaciones y 409 se muestran sin filtrar secretos.

## 3. Dependencias
076. Gate `admin-usuarios` permanece.

## 4. Fuentes canónicas
Los tres DTOs y recurso citados, IT completa y `UsuarioAdminService`; frontend `src/features/admin`, `src/api`, handlers, query keys y tests existentes.

## 5. Evidencia del problema actual
El backend expone las rutas canónicas; el plan viejo del frontend inventaba `/invitaciones`, que
**no existe** — no lo resucites. Comprobado con `curl` contra `http://localhost:8080/api/v1` el
2026-09-10, con un `SUPER_ADMIN` real:

```
GET  /admin/usuarios?page=0&size=25   200  {"items":[{"activo":true,"email":"…","emailVerificado":true,
                                                "fechaCreacion":"2026-09-10T03:56:41.070085Z",
                                                "id":"0192f6c4-7c8a-7abc-8000-000000001001",
                                                "nombre":"John Doe","rol":"USUARIO"}],
                                           "page":0,"size":25,"total":3,"totalPaginas":1}
GET  /admin/usuarios (token USUARIO)  403  {"codigo":"acceso-denegado","mensaje":"No posee los permisos necesarios para esta operación"}
GET  /admin/usuarios (sin token)      401
```

**La paginación ya está resuelta y no es tarea tuya.** `src/api/client.ts` tiene un interceptor de
respuesta que traduce `{items,total,…}` → `{contenido,totalElementos,…}` **una sola vez**, y
`src/api/request.ts:15` avisa por escrito de no repetirlo. Usa `paginaDe(usuarioAdminSchema)` de
`src/api/schemas.ts` —que es `.strict()`— y ya casa. Si normalizas otra vez, rompes el esquema.

## 6. Alcance incluido
Hook, schemas, contratos, query keys, handlers estrictos, página activa y pruebas; wrapper de disponibilidad se conserva y se prueba separado.

## 7. Fuera de alcance
Quitar gate, backend/auth aceptar invitación, otras páginas admin, rediseño global y migraciones.

## 8. Archivos concretos
Sigue la convención **que ya existe** en `src/features/admin` (plana: `hooks/` y `pages/`), no la
carpeta por entidad que sugería la versión anterior de esta §8.

- `src/features/admin/hooks/useUsuariosAdmin.ts` — **nuevo**. Modelo a copiar:
  `src/features/admin/hooks/useAdminBases.ts` (usa `getValidado`/`postValidado`/`putValidado`/`del`,
  `paginaDe`, `qk`, e invalida por familia).
- `src/features/admin/pages/AdminUsuariosPageActiva.tsx` — **nuevo**. La pantalla real.
- `src/features/admin/pages/AdminUsuariosPage.tsx` — **editar**. Pasa a ser el wrapper del gate.
- `src/api/schemas.ts` — añadir `usuarioAdminSchema` (y el `rol` como `z.enum`).
- `src/api/contract.ts` — añadir `UsuarioAdminResponse` y los dos requests.
- `src/api/queryKeys.ts` — añadir `adminUsuariosFamilia()` / `adminUsuarios(f)` / `adminUsuario(id)`
  junto a las claves `adminBases*` que ya están.
- `src/test/handlers.ts` — handlers **estrictos** de las siete rutas. Usa `soloCampos`, que ya vive
  en ese archivo y devuelve 400 ante una propiedad desconocida. Recuerda el `*` final en la ruta de
  **listado**.
- `src/test/fixtures/admin.ts` — añadir la fixture de usuarios (existe ya, no crees otro archivo).
- `src/test/features/admin/hooks/contrato.test.tsx` — **existe**; añade aquí el test de contrato de
  la petición saliente.
- `src/test/features/admin/pages/AdminUsuariosPageActiva.test.tsx` — **nuevo**, prueba la pantalla.

**Intocable:** `src/lib/disponibilidad.ts` (es de 081), `src/routes/Guards.tsx`,
`src/shell/Sidebar.tsx` y `src/test/features/admin/pages/paginas-admin.test.tsx`. Ese último test
afirma que `AdminUsuariosPage` **no lanza ni una petición**; con el gate todavía cerrado el wrapper
sigue cumpliéndolo y **debe seguir pasando sin editarlo**. Si se te pone rojo, tu wrapper está mal,
no el test.

## 9. Contratos request/response
Prefijo real `\`/api/v1\``, ya puesto por `API_BASE_URL`; en los handlers usa la constante `API`
como el resto del archivo.

| Método | Ruta | Body | OK |
| --- | --- | --- | --- |
| GET | `/admin/usuarios?q=&activo=&page=0&size=25` | — | 200 `Page<UsuarioAdminResponse>` |
| GET | `/admin/usuarios/{id}` | — | 200 `UsuarioAdminResponse` |
| POST | `/admin/usuarios` | `{nombre, email, rol}` | **201** `UsuarioAdminResponse` |
| PUT | `/admin/usuarios/{id}` | `{nombre, rol, activo}` — los tres `@NotNull`, **sin `email`** | 200 |
| POST | `/admin/usuarios/{id}/desactivar` | sin cuerpo | 200 |
| POST | `/admin/usuarios/{id}/reactivar` | sin cuerpo | 200 |
| DELETE | `/admin/usuarios/{id}` | — | **204** sin cuerpo |

`rol` ∈ `{"USUARIO","SUPER_ADMIN"}`. `fechaCreacion` es un `Instant` ISO-8601 en UTC.

**Errores, con el cuerpo literal que devuelve el servidor** (`{codigo, mensaje}`; el cliente ya lo
valida en `src/api/client.ts` y lo entrega como `ApiError`):

```
403 {"codigo":"acceso-denegado","mensaje":"No posee los permisos necesarios para esta operación"}
409 {"codigo":"email-ya-registrado","mensaje":"El correo ya está registrado"}
400 {"codigo":"validacion","mensaje":"must be a well-formed email address"}      ← email inválido
400 {"codigo":"validacion","mensaje":"Identificador público inválido: se requiere UUIDv7"}
400 {"codigo":"tamano-pagina-invalido","mensaje":"El parámetro size debe estar entre 1 y 200"}  ← size>200
404 {"codigo":"no-encontrado","mensaje":"Usuario no encontrado"}
```

`size` válido es 1..200 y `page` ≥ 0 (`UsuarioAdminResource.validarPaginacion`). El 409 de borrado
con proyectos propios (`usuario-con-proyectos-impedido`) está en el servicio y lo cubre
`TC-12-P38-03-delete-con-proyectos.bru`; no se pudo provocar por `curl` sin ensuciar datos, así que
**mockéalo por su código**, sin inventarle otro cuerpo.

## 10. Estrategia TDD
RED: handler exige ruta POST exacta, body y query; UI afirma filas/campos y no secretos; botones cambian estado; 403/409 muestran error. GREEN: mínimo hook/UI. TRIANGULATE: vacío, UUID inválido, delete 204 y email inmutable. REFACTOR: componentes locales.

## 11. Pasos secuenciales
1. Leer DTOs/IT y extraer fixtures exactos y códigos.
2. Añadir schemas, contrato y handler estricto con Page normalizada.
3. Implementar hooks/query keys y página activa con formularios accesibles.
4. Probar wrapper gate sin activarlo y página activa aislada.
5. Ejecutar tests focalizados.

## 12. Criterios de aceptación
Todas las rutas y statuses coinciden; POST es `/admin/usuarios`; campos de respuesta no contienen secretos; filtros q/activo y paginación llegan intactos; UI cubre loading/vacío/error/403/409; gate sigue presente.

## 13. Verificación
En el worktree, y **`pnpm` siempre, `npm` nunca**:

```
pnpm install                                    # el worktree arranca sin node_modules
pnpm vitest run src/test/features/admin         # incluye hooks/ y pages/
pnpm run typecheck                              # es `tsc -b --noEmit`; `npx tsc --noEmit` NO comprueba nada aquí
pnpm run lint
git diff --check
```

`src/test/features/admin/pages/paginas-admin.test.tsx` entra en esa carpeta y **tiene que seguir
verde sin tocarlo**.

## 14. STOP conditions
STOP si el recurso o los DTOs de `@ 2803575` contradicen la §9 (ruta, campo, status, rol o código
de error). STOP si para que la pantalla funcione hicieras falta quitar `admin-usuarios` de
`MODULOS_SIN_BACKEND` — eso es 081, y el diseño de §1 existe justamente para no necesitarlo. STOP
si aceptar la invitación exigiera tocar `src/features/auth` o el backend.

**Ya no es STOP** «si el frontend no tiene wrapper identificable»: se comprobó que no lo tiene, y
crearlo es parte del alcance de este plan (§1). No te detengas por eso.

## 15. Riesgos y rollback
Riesgo de enviar email en PUT o exponer secretos. Rollback solo archivos §8; conservar tests que prueban prohibiciones.

## 16. Handoff
Entregar rutas, schemas, fixtures, resultados y estado del gate a 078 y 081.

## 17. Invariantes explícitas
SUPER_ADMIN; no `/invitaciones`; API solo `src/api`; Page se normaliza; UI española; no secretos.
