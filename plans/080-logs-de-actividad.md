# 080 — Logs de actividad

> **Deriva corregida el 2026-09-10** contra `../thesis-back-quarkus @ 2803575`, con la respuesta
> real capturada por `curl`. Este plan estaba mejor escrito que 077–079, pero traía **un error
> peligroso**: su §08 mandaba *editar* `paginas-admin.test.tsx`, que es intocable, y su §06 pedía
> «reemplazar el wrapper por export activo», que abriría el gate antes de 081. Corregidas §§01,
> 05, 06, 08, 09 y 13.

## 01. Estado inicial verificable
`AdminLogsPage.tsx` **no es un wrapper**: renderiza `ModuloNoDisponible` incondicionalmente y ni
siquiera importa `MODULOS_SIN_BACKEND`. Es la misma deriva ya corregida en 077, 078 y 079. El
patrón **existe y está mergeado**: copia `src/features/admin/pages/AdminValoresPage.tsx` (plan
079). Aquí la clave del gate es `admin-logs`.

Backend: `LogActividadResource` @ `2803575`, `@Path("/admin/logs")`,
`@RolesAllowed("SUPER_ADMIN")`, **sólo GET**. No hay contrato frontend todavía.

## 02. Resultado observable
Un SUPER_ADMIN puede consultar una tabla paginada de actividad; un usuario normal recibe 403 y una petición sin credenciales 401. La UI muestra actor, evento, entidad, detalle seguro y fecha, con filtros y estados accesibles.

## 03. Dependencias y orden
Depende de 079. Este plan habilita el contrato y la página; 081 no puede retirar el gate hasta que sus pruebas frontend y la evidencia backend estén verdes.

## 04. Fuentes canónicas leídas
Backend: `../thesis-back-quarkus/src/main/java/ec/uce/propuestas/usuario/audit/resource/LogActividadResource.java`, `dto/LogActividadFiltros.java`, `dto/LogActividadResponse.java`, `LogActividadDetalleValidator.java`; pruebas `src/test/.../resource/LogActividadResourceIT.java`, `LogActividadSinPiiTest.java`, `LogActividadDetalleValidatorTest.java`. Frontend: `src/api/contract.ts`, `src/api/queryKeys.ts`, `src/api/request.ts`, `src/features/admin/pages/AdminLogsPage.tsx`, `src/test/handlers.ts`, `src/test/features/admin/pages/paginas-admin.test.tsx`.

## 05. Evidencia backend que debe quedar registrada
`GET /api/v1/admin/logs` con `usuarioId`, `evento`, `desde`, `hasta`, `page` (defecto 0) y `size`
(defecto 25, rango 1..200). Los filtros se combinan AND; `desde`/`hasta` son `Instant` y
`desde > hasta` → 400 `rango-fechas-invalido`; `evento` debe casar `^[a-z0-9._-]+$` (400
`evento-formato-invalido`) y medir ≤ 60 (400 `evento-largo`); una fecha no parseable → 400
`parametro-invalido`.

Respuesta real capturada por `curl` el 2026-09-10 con un `SUPER_ADMIN`:

```
GET /admin/logs?page=0&size=25   200
{"items":[{"id":"01a08a31-06af-7c01-95a2-4636dbbc66da",
           "usuarioId":"0192f6c4-7c8a-7abc-8000-000000001002",
           "usuarioNombre":"Ana de Armas",
           "evento":"auth.login","entidad":"auth",
           "entidadId":null,
           "detalle":{"resultado":"ok"},
           "fecha":"2026-09-10T07:21:03.680815Z"}, …],
 "page":0,"size":25,"total":…,"totalPaginas":…}
```

Ocho campos exactos: `id`, `usuarioId`, `usuarioNombre`, `evento`, `entidad`, `entidadId`,
`detalle`, `fecha`.

- `usuarioId` es un **UUID string**, no el BIGINT interno. `usuarioId` y `usuarioNombre` son `null`
  cuando el log no tiene actor (`LogActividadResponse.from` lo pone a `null` explícitamente).
- **`entidadId` llega `null` explícito**, no ausente — se ve en la captura de arriba. En el esquema
  va `.nullable()`, **no** `.optional()`, y en la fixture se pone `null`, no se omite la clave.
  (Es la cara inversa del Patrón C: aquí el campo **sí** aparece.)
- `detalle` es un objeto JSON libre: `Record<string, unknown>`. **No lo interpretes**; muéstralo
  como texto. El backend ya garantiza que no lleva PII (`LogActividadDetalleValidator`,
  `LogActividadSinPiiTest`): no hay correo, contraseña, token, JWT, bearer, hash ni IP.

**La paginación ya está resuelta y no es tarea tuya**: el interceptor de `src/api/client.ts`
traduce `{items,total}` → `{contenido,totalElementos}` una sola vez, y `src/api/request.ts:15`
avisa de no repetirlo. Usa `paginaDe(logActividadSchema)`, que es `.strict()`.

## 06. Alcance incluido
Contrato TypeScript, query key, hook de lectura, validación de filtros en la UI, tabla,
paginación y estados loading/vacío/error/403, más el handler MSW estricto.

**Corrección importante:** la §06 anterior decía «reemplazar el wrapper por export activo». **No.**
Eso abriría el gate, que es alcance de 081. Se hace igual que en 077–079: `AdminLogsPage` pasa a
ser el wrapper que consulta `MODULOS_SIN_BACKEND.has("admin-logs")` y delega en
`AdminLogsPageActiva`. El gate **queda cerrado** al terminar este plan.

## 07. Fuera de alcance
No modificar backend, DTO servidor, migraciones, emisión de logs, mutaciones, exportación, ni gates de `MODULOS_SIN_BACKEND` (eso pertenece a 081).

## 08. Archivos exactos candidatos
- `src/features/admin/hooks/useLogsActividad.ts` — **nuevo**. Molde:
  `src/features/admin/hooks/useValoresReferencia.ts` (plan 079, ya mergeado).
- `src/features/admin/pages/AdminLogsPageActiva.tsx` — **nuevo**. La pantalla real.
- `src/features/admin/pages/AdminLogsPage.tsx` — **editar**, pasa a wrapper.
- `src/api/contract.ts`, `src/api/schemas.ts`, `src/api/queryKeys.ts` — `LogActividadResponse`,
  `logActividadSchema` y las claves `adminLogsFamilia/adminLogs`.
- `src/test/handlers.ts` — handler estricto de `GET /admin/logs`. **Sin `*` final**: ninguno de los
  handlers MSW del archivo lo lleva (la regla del `*` de `AGENTS.md` es de Playwright, comprobado
  en 077).
- `src/test/fixtures/admin.ts` — fixture con dos logs.
- `src/test/features/admin/hooks/contrato.test.tsx` — contrato de la petición saliente.
- `src/test/features/admin/pages/AdminLogsPageActiva.test.tsx` — **nuevo**.

**INTOCABLE — corrección crítica de la §08 anterior, que mandaba editarlo:**
`src/test/features/admin/pages/paginas-admin.test.tsx` **no se toca**. Afirma que `AdminLogsPage`
no lanza **ninguna** petición, y con el gate cerrado tu wrapper lo sigue cumpliendo tal cual. Si se
te pone rojo, tu wrapper está mal, no el test. Tampoco toques `src/lib/disponibilidad.ts` (081),
`Guards.tsx`, `Sidebar.tsx` ni nada de 077/078/079, ya mergeados.

## 09. Contrato frontend
`LogActividadResponse` con los ocho campos del §05: `id`, `usuarioId` y `usuarioNombre` nullables,
`evento`, `entidad`, `entidadId` nullable, `detalle: Record<string, unknown>` y `fecha: string`.

`useLogsActividad({ usuarioId?, evento?, desde?, hasta?, page, size })` llama **exclusivamente** a
través de `src/api/request.ts` (`getValidado`) a `/admin/logs`. **Serializa sólo los filtros
presentes**: un filtro vacío se omite, no viaja como cadena vacía — un `evento=""` no casa
`^[a-z0-9._-]+$` y te devolvería un 400 gratis. La query key incluye los filtros y `page`/`size`.

Es **sólo lectura**: no hay POST, PUT ni DELETE en este recurso. No inventes mutaciones.

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
En el worktree, y **`pnpm` siempre, `npm` nunca**:

```
pnpm install
pnpm exec vitest run src/test/features/admin
pnpm run typecheck        # es `tsc -b --noEmit`; `npx tsc --noEmit` NO comprueba nada aquí
pnpm run lint
pnpm run format:check     # encadenado dentro de `verify`: si deja warnings en TUS archivos, arréglalos
git diff --check
```

**La línea base de esta rama ya está roja por causas ajenas** (el WIP `98fd848`): 20 tests fallan,
`typecheck` da un error en `src/test/features/proyectos/hooks/contrato.test.tsx:197` y
`format:check` se queja de `src/features/apu-editor/hooks/useApuEditor.ts`. **No los arregles ni
los cuentes como tuyos**; tu listón es *no añadir ni uno*. Tras 079 la suite completa va **511
pasan / 20 fallan**; compara contra eso. Y `format:check` debe acabar quejándose **sólo** de
`useApuEditor.ts`.

## 14. STOP
Detener si el JSON real no coincide con `Page`, si aparece otro nombre de filtro, si `LogActividadResponse` cambia, o si una prueba de privacidad falla. Anotar archivo, línea y payload; no corregir backend dentro de este plan.

## 15. Rollback
Revertir únicamente los archivos del §08 y los nuevos del §08, sin tocar gates ni cambios preexistentes. Si el contrato queda ambiguo, conservar la prueba RED y entregar como bloqueado.

## 16. Handoff
Entregar a 081: paths modificados, contrato confirmado, pruebas verdes y cualquier discrepancia backend/frontend. 081 debe usar esta evidencia antes de retirar el gate.

## 17. Invariantes
HTTP solo en `src/api/`; TanStack Query para servidor; SUPER_ADMIN y GET-only; no PII ni BIGINT interno; no aritmética de dinero; textos y controles accesibles; `pnpm`.
