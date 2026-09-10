# 080 — Logs de actividad

## 01. Estado inicial verificable
`src/features/admin/pages/AdminLogsPage.tsx` es un wrapper `ModuloNoDisponible`; no existe contrato frontend para `/admin/logs`. El backend ya expone `LogActividadResource` como GET de solo lectura y `@RolesAllowed("SUPER_ADMIN")`.

## 02. Resultado observable
Un SUPER_ADMIN puede consultar una tabla paginada de actividad; un usuario normal recibe 403 y una petición sin credenciales 401. La UI muestra actor, evento, entidad, detalle seguro y fecha, con filtros y estados accesibles.

## 03. Dependencias y orden
Depende de 079. Este plan habilita el contrato y la página; 081 no puede retirar el gate hasta que sus pruebas frontend y la evidencia backend estén verdes.

## 04. Fuentes canónicas leídas
Backend: `../thesis-back-quarkus/src/main/java/ec/uce/propuestas/usuario/audit/resource/LogActividadResource.java`, `dto/LogActividadFiltros.java`, `dto/LogActividadResponse.java`, `LogActividadDetalleValidator.java`; pruebas `src/test/.../resource/LogActividadResourceIT.java`, `LogActividadSinPiiTest.java`, `LogActividadDetalleValidatorTest.java`. Frontend: `src/api/contract.ts`, `src/api/queryKeys.ts`, `src/api/request.ts`, `src/features/admin/pages/AdminLogsPage.tsx`, `src/test/handlers.ts`, `src/test/features/admin/pages/paginas-admin.test.tsx`.

## 05. Evidencia backend que debe quedar registrada
La firma es `GET /api/v1/admin/logs` con `usuarioId`, `evento`, `desde`, `hasta`, `page` (default 0) y `size` (default 25; 1–200). Los filtros se combinan AND; fechas son `Instant` inclusivos y `desde <= hasta`; evento acepta `^[a-z0-9._-]+$`, máximo 60. La respuesta es `Page<LogActividadResponse>` con `items`, `page`, `size`, `total`, `totalPaginas` observados en IT; el frontend debe adaptar el nombre real del `Page` común (`contenido`/`totalElementos`) solo si el cliente ya lo hace para este backend. Ocho campos exactos: `id`, `usuarioId`, `usuarioNombre`, `evento`, `entidad`, `entidadId`, `detalle`, `fecha`. No exponer BIGINT interno, correo, password, token, JWT, bearer, hash ni IP.

## 06. Alcance incluido
Contrato TypeScript, query key, hook de lectura, validación de filtros en UI, tabla, paginación, loading/vacío/error/403 y handler MSW estricto. Reemplazar el wrapper por export activo.

## 07. Fuera de alcance
No modificar backend, DTO servidor, migraciones, emisión de logs, mutaciones, exportación, ni gates de `MODULOS_SIN_BACKEND` (eso pertenece a 081).

## 08. Archivos exactos candidatos
Editar `src/api/contract.ts`, `src/api/queryKeys.ts`, `src/test/handlers.ts`, `src/features/admin/pages/AdminLogsPage.tsx`, `src/test/features/admin/pages/paginas-admin.test.tsx`. Crear `src/features/admin/hooks/useLogsActividad.ts` y, solo si la página lo exige, `src/features/admin/components/TablaLogsActividad.tsx` y su prueba. No tocar otros archivos sin STOP y aprobación.

## 09. Contrato frontend
`LogActividadResponse` replica exactamente los ocho campos anteriores (`detalle: Record<string, unknown>`, UUID/string e `fecha: string`). `useLogsActividad({ usuarioId?, evento?, desde?, hasta?, page, size })` llama exclusivamente mediante `src/api/request.ts` a `/admin/logs`; serializa parámetros presentes, no campos vacíos. Query key incluye filtros estables y page/size. No calcular dinero ni interpretar detalle arbitrario.

## 10. RED específico
Añadir pruebas que fallen antes de implementar: handler que rechace query distinta; espera de una fila con `usuarioNombre`, `evento`, `entidadId`, `fecha` y `detalle`; verifica que `usuarioId/evento/desde/hasta/page/size` llegan; 400 para evento inseguro/rango invertido; 403 renderiza permiso; y la tabla no contiene claves PII ni IDs internos.

## 11. Pasos de implementación
1. Comparar el serializador real de `Page` con `src/api/contract.ts` y fijar el adaptador, sin inventar `items` o `contenido`.
2. Añadir fixture con dos logs y handler MSW estricto para `/admin/logs*`.
3. Implementar tipo, key y hook; omitir filtros `undefined` y mantener `size=25`.
4. Implementar filtros, tabla y paginación en la página activa; usar roles/labels españoles y `ModuloNoDisponible` solo para errores de backend ausente, no para 403.
5. Cubrir estados y navegación de página; conservar read-only.

## 12. Aceptación comprobable
La prueba de página demuestra dos filas, filtro AND, paginación, vacío, loading, 400 y 403. El handler falla ante método POST o query inesperada. La respuesta tipada solo contiene los campos del §05 y no aparece PII.

## 13. Verificación focalizada
`pnpm run test -- src/test/features/admin/pages/paginas-admin.test.tsx`; `pnpm run typecheck`; `pnpm run lint`; `git diff --check`.

## 14. STOP
Detener si el JSON real no coincide con `Page`, si aparece otro nombre de filtro, si `LogActividadResponse` cambia, o si una prueba de privacidad falla. Anotar archivo, línea y payload; no corregir backend dentro de este plan.

## 15. Rollback
Revertir únicamente los archivos del §08 y los nuevos del §08, sin tocar gates ni cambios preexistentes. Si el contrato queda ambiguo, conservar la prueba RED y entregar como bloqueado.

## 16. Handoff
Entregar a 081: paths modificados, contrato confirmado, pruebas verdes y cualquier discrepancia backend/frontend. 081 debe usar esta evidencia antes de retirar el gate.

## 17. Invariantes
HTTP solo en `src/api/`; TanStack Query para servidor; SUPER_ADMIN y GET-only; no PII ni BIGINT interno; no aritmética de dinero; textos y controles accesibles; `pnpm`.
