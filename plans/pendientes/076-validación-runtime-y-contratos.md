# 076 — Validación runtime y contratos

## 1. Estado inicial
Tras 075, revisar `src/api/request.ts`, `src/api/schemas.ts`, `src/api/contract.ts`, `src/api/problem.ts`, `src/test/handlers.ts` y hooks que los consumen. `src/hooks/useDisplayConfig.ts:17` ya consulta `GET /config/display`; `src/test/handlers.ts:807` lo mockea y `src/test/handlers.ts:874` emite `formato-no-soportado`. `Page<T>` en `contract.ts:4-10` usa `contenido,totalElementos,page,size,totalPaginas`.

## 2. Objetivo medible
Cada familia restante de GET y mutación valida su respuesta runtime, rechaza body/query/path incorrectos en MSW y traduce formato de exportación no soportado a error canónico, sin casts silenciosos.

## 3. Dependencias
075. Las páginas individuales de 077–080, workspace y vistas UI de cronograma quedan fuera.

## 4. Fuentes canónicas
`src/api/{request.ts,schemas.ts,contract.ts,problem.ts,queryKeys.ts}`, hooks bajo `src/features`, handlers/tests; recursos y DTOs equivalentes en `../thesis-back-quarkus/src/main/java` e ITs; `../thesis-docs` para contrato normativo.

## 5. Evidencia del problema actual
Hay respuestas aceptadas por `get/post/put/del` sin schema en varios hooks; handlers aceptan cuerpos genéricos; `ParametrosProyectoActualizarRequest` está tipado como interfaz mínima y el plan requiere nombre explícito; el seam de Page no puede asumir `items`.

## 6. Alcance incluido
Inventariar familias concretas restantes, definir schemas Zod, tipar `ParametrosProyectoEditarRequest`, validar Page normalizada, endurecer MSW y añadir pruebas de contrato/error. Consumir `useDisplayConfig` solo donde no exista consumo actual.

## 7. Fuera de alcance
UIs admin 077–080/081, workspace, cronograma UI, backend, migraciones, endpoints nuevos y cálculos.

## 8. Archivos concretos
Editar `src/api/contract.ts`, `src/api/schemas.ts`, `src/api/request.ts` solo si el tipo lo requiere, `src/api/problem.ts`, hooks afectados, `src/hooks/useDisplayConfig.ts` solo si falta integración, `src/test/handlers.ts` y `src/test/api/**`/tests de hooks. Crear schemas/tests únicamente en esas carpetas.

## 9. Contratos request/response
`GET/PUT /proyectos/{id}/parametros` usa respuesta completa `ParametrosProyectoResponse` y request dedicado `ParametrosProyectoEditarRequest` con `porcentajeHerramientaMenor` e `iva` obligatorios, y `porcentajeIndirecto`/`moneda` opcionales; nunca `Record<string, unknown>`. Todo Page valida la forma frontend normalizada `{contenido,totalElementos,page,size,totalPaginas}`. `GET /config/display` valida `DisplayConfigResponse` sin duplicar el hook existente. `GET /documentos/especificaciones-tecnicas/{presupuestoId}?formato=docx&titulo1=&titulo2=` admite DOCX y debe exponer `formato-no-soportado` para otro formato; la exportación del cronograma conserva sus rutas y formatos propios.

## 10. Estrategia TDD
RED: schema falla ante `items`, campo desconocido o body incorrecto; hook de parámetros no acepta Record; handler rechaza query/path; exportación muestra error canónico. GREEN: schemas y tipos mínimos. TRIANGULATE: Page vacía, 400/403/404, nullables. REFACTOR: factories de schema sin relajar unknown.

## 11. Pasos secuenciales
1. Enumerar en una tabla del plan cada hook y familia HTTP restante con archivo/símbolo y DTO backend.
2. Escribir tests RED de forma de Page y respuestas de mutación.
3. Implementar schemas y `ParametrosProyectoEditarRequest`; conectar display config solo si no hay consumidor.
4. Cambiar handlers a validación exacta de método, URL, query, path y JSON/FormData.
5. Añadir prueba de `formato-no-soportado` y ejecutar tests focalizados.

## 12. Criterios de aceptación
Ninguna respuesta de las familias inventariadas pasa sin validación; Page usa exactamente los cinco campos canónicos; un body/query/path incorrecto produce fallo de test; parámetros no usa `Record`; formato inválido expone código `formato-no-soportado`.

## 13. Verificación
`pnpm vitest run src/test/api src/test/features`; `pnpm run typecheck`; `pnpm run lint`; `git diff --check`.

## 14. STOP conditions
STOP ante DTO backend ambiguo, Page con forma distinta, endpoint sin recurso, handler que no puede distinguir ruta/query, o necesidad de modificar una UI excluida. Registrar símbolo y evidencia.

## 15. Riesgos y rollback
Riesgo de schema demasiado estricto ante nullables reales. Rollback solo de archivos §8, conservando casos RED y sin cambiar handlers no inventariados.

## 16. Handoff
Entregar inventario, schemas aplicados, familias no cubiertas y comandos/resultados a implementadores 077–079; 081 recibe cualquier impacto de disponibilidad.

## 17. Invariantes explícitas
Page normalizada no se renombra a `items`; HTTP solo en `src/api`; no casts para ocultar contrato; no aritmética cliente; `pnpm`.
