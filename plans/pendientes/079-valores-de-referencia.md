# 079 — Valores de referencia

**Estado: DIFERIDO por decisión de secuencia.** La rama administrativa 077–081 se pospone; este plan se conserva sin ejecutarse ni activar su gate.

## 1. Estado inicial
`ValorReferenciaAdminResource.java` está en `/admin/valores-referencia`, exige SUPER_ADMIN; DTOs `src/main/java/ec/uce/propuestas/proyecto/dto/{ValorReferenciaRequest,ValorReferenciaResponse}.java`; IT `src/test/java/ec/uce/propuestas/proyecto/admin/ValorReferenciaAdminResourceIT.java`. La pantalla frontend existente y gate deben localizarse antes de editar; gate permanece.

## 2. Objetivo medible
SUPER_ADMIN lista, crea/actualiza y elimina valores desde una UI activa, con clave en path, validación exacta, statuses 201/200/204 y errores visibles.

## 3. Dependencias
078 y 076. `admin-valores` no se activa (081).

## 4. Fuentes canónicas
Recurso, DTOs, service e IT citados; frontend admin, API contracts/schemas/keys, handlers y tests.

## 5. Evidencia del problema actual
GET solo recibe `page,size` y devuelve Page `items,total,page,size,totalPaginas`; request requiere `valor` max100, `descripcion` requerida y `fuente` max200; clave no vacía max50; IT verifica seed, upsert, auditoría y 400/403/404.

## 6. Alcance incluido
Contrato, schemas, hooks, handlers estrictos, página activa y tests; wrapper/gate sin cambios funcionales.

## 7. Fuera de alcance
Backend/auditoría, otras UIs admin, filtros q no existentes, migraciones y gate 081.

## 8. Archivos concretos
Crear `src/features/admin/valores/{hooks,useValoresReferencia.ts,schemas.ts,AdminValoresReferenciaPageActiva.tsx}`; editar `src/api/contract.ts`, `schemas.ts`, `queryKeys.ts`, `src/test/handlers.ts`; tests en `src/test/features/admin/valores/` y wrapper.

## 9. Contratos request/response
`GET /admin/valores-referencia?page=0&size=25` → `{items,total,page,size,totalPaginas}`, normalizar a Page canónica. `PUT /admin/valores-referencia/{clave}` body `{valor,descripcion,fuente}` → 201 si crea, 200 si actualiza, respuesta `{clave,valor,descripcion,fuente,actualizado}`. `DELETE /{clave}` → 204. 403 no SUPER_ADMIN; 400 `validacion`, `clave-requerida`, `clave-excedida`, paginación; 404 al borrar inexistente.

## 10. Estrategia TDD
RED: body exacto, clave URL codificada, 201/200 según existencia, Page cinco campos y validaciones. GREEN mínimo. TRIANGULATE: clave 51, fuente vacía, delete doble, 403 y página parcial. REFACTOR local.

## 11. Pasos secuenciales
1. Leer service/IT para reglas de existencia y mensajes.
2. Escribir contrato/schema/handlers RED.
3. Implementar hooks y formulario/tabla activa con campos y confirmación.
4. Probar wrapper separado sin quitar gate.
5. Ejecutar tests focalizados y documentar statuses observados.

## 12. Criterios de aceptación
GET no manda q; clave siempre va path codificado; body no contiene clave; UI muestra valor/descripcion/fuente/actualizado; upsert distingue 201/200; delete 204; errores 400/403/404 cubiertos; gate intacto.

## 13. Verificación
`pnpm vitest run src/test/features/admin/valores src/test/features/admin/pages`; `pnpm run typecheck`; `pnpm run lint`; `git diff --check`.

## 14. STOP conditions
STOP si DTO/IT contradice constraints/status, si upsert no permite determinar creación, si se requiere endpoint de búsqueda q, o si implementar obliga a activar gate.

## 15. Riesgos y rollback
Riesgo de tratar `actualizado` como dinero o perder clave por query encoding. Rollback solo §8; conservar tests de path y statuses.

## 16. Handoff
Entregar contrato, fixture seed, pruebas y decisión de gate a 081 y al siguiente plan.

## 17. Invariantes explícitas
SUPER_ADMIN; clave en path max50; no q inventado; Page normalizada; no aritmética; HTTP solo `src/api`; `pnpm`.
