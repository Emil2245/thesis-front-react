# 077 — Usuarios e invitaciones

**Estado: DIFERIDO por decisión de secuencia.** La rama administrativa 077–081 se pospone; este plan se conserva sin ejecutarse ni activar su gate.

## 1. Estado inicial
`UsuarioAdminResource.java` declara `@Path("/admin/usuarios")`, `@RolesAllowed("SUPER_ADMIN")`; DTOs: `UsuarioInvitarRequest`, `UsuarioAdminEditarRequest`, `UsuarioAdminResponse`; IT: `src/test/java/ec/uce/propuestas/usuario/admin/UsuarioAdminResourceIT.java`. Frontend `src/features/admin/pages/AdminUsuariosPage.tsx`/gate debe inspeccionarse; no quitar gate (081).

## 2. Objetivo medible
Un SUPER_ADMIN puede listar, leer, invitar, editar, desactivar, reactivar y eliminar usuarios mediante UI real; un USUARIO ve 403; validaciones y 409 se muestran sin filtrar secretos.

## 3. Dependencias
076. Gate `admin-usuarios` permanece.

## 4. Fuentes canónicas
Los tres DTOs y recurso citados, IT completa y `UsuarioAdminService`; frontend `src/features/admin`, `src/api`, handlers, query keys y tests existentes.

## 5. Evidencia del problema actual
El backend ya tiene rutas canónicas, pero el plan anterior inventaba `/invitaciones`; la respuesta excluye `passwordHash/token`; listado prueba Page `items,total,page,size,totalPaginas` en backend, que frontend debe normalizar al Page canónico.

## 6. Alcance incluido
Hook, schemas, contratos, query keys, handlers estrictos, página activa y pruebas; wrapper de disponibilidad se conserva y se prueba separado.

## 7. Fuera de alcance
Quitar gate, backend/auth aceptar invitación, otras páginas admin, rediseño global y migraciones.

## 8. Archivos concretos
Crear/editar `src/features/admin/usuarios/{hooks,useUsuariosAdmin.ts,schemas.ts,AdminUsuariosPageActiva.tsx}` según convención real; `src/api/contract.ts`, `src/api/schemas.ts`, `src/api/queryKeys.ts`, `src/test/handlers.ts`; tests bajo `src/test/features/admin/usuarios/` y página wrapper existente.

## 9. Contratos request/response
`GET /admin/usuarios?q=&activo=true&page=0&size=25` → `{items,total,page,size,totalPaginas}` (adaptar a `contenido,totalElementos`). `GET /admin/usuarios/{id}` → `id,nombre,email,rol,activo,emailVerificado,fechaCreacion`. `POST /admin/usuarios` body `nombre,email,rol` → 201 mismo DTO. `PUT /{id}` body requerido `nombre,rol,activo` → 200; email no se edita. `POST /{id}/desactivar` y `/reactivar` → 200; DELETE → 204. 403 SUPER_ADMIN, 400 `validacion`/paginación/UUID, 404 inexistente, 409 `email-ya-registrado` o `usuario-con-proyectos-impedido`.

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
`pnpm vitest run src/test/features/admin/usuarios src/test/features/admin/pages`; `pnpm run typecheck`; `pnpm run lint`; `git diff --check`.

## 14. STOP conditions
STOP si DTO/IT cambia ruta, campo, status, rol o código; si se requiere activar gate antes de 081; si frontend actual no tiene wrapper identificable; o si aceptar invitación exige editar auth.

## 15. Riesgos y rollback
Riesgo de enviar email en PUT o exponer secretos. Rollback solo archivos §8; conservar tests que prueban prohibiciones.

## 16. Handoff
Entregar rutas, schemas, fixtures, resultados y estado del gate a 078 y 081.

## 17. Invariantes explícitas
SUPER_ADMIN; no `/invitaciones`; API solo `src/api`; Page se normaliza; UI española; no secretos.
