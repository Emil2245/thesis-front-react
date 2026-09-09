# 078 — Plantillas APU de sistema

## 1. Estado inicial
`PlantillaApuAdminResource.java` usa `/admin/plantillas-apu`, SUPER_ADMIN; DTOs `PlantillaSistemaCrearRequest`, `PlantillaApuAdminEditarRequest`, `PlantillaApuAdminResponse`; IT `src/test/java/ec/uce/propuestas/plantilla/admin/PlantillaApuAdminResourceIT.java`. `src/features/admin/pages/AdminPlantillasPage.tsx` es wrapper no disponible.

## 2. Objetivo medible
La página activa lista solo SISTEMA, crea desde APU, edita metadatos con semántica de presencia y elimina; tests prueban UI, payloads, permisos y errores.

## 3. Dependencias
077 y 076. Gate `admin-plantillas` permanece hasta 081.

## 4. Fuentes canónicas
Recurso, DTOs, service y `PlantillaApuAdminResourceIT.java`; página wrapper, API contracts/schemas/keys, handlers y tests frontend.

## 5. Evidencia del problema actual
La página actual solo muestra `ModuloNoDisponible`; backend valida `tipo=SISTEMA`, devuelve Page `items,total,page,size,totalPaginas`, crea con `desdeApuId,nombre,descripcionRubro` y PUT distingue campo ausente de presente mediante `JsonNullable`.

## 6. Alcance incluido
Contrato, schemas, hooks, handler estricto, página activa y tests aislados; no activar disponibilidad.

## 7. Fuera de alcance
APUs personales, backend, copiar arquitectura externa, gate 081, migraciones y funcionalidades fuera del recurso.

## 8. Archivos concretos
Crear `src/features/admin/plantillas/{hooks,usePlantillasAdmin.ts,schemas.ts,AdminPlantillasPageActiva.tsx}`; editar `src/api/contract.ts`, `schemas.ts`, `queryKeys.ts`, `src/test/handlers.ts`; crear tests en `src/test/features/admin/plantillas/` y wrapper.

## 9. Contratos request/response
`GET /admin/plantillas-apu?q=&tipo=SISTEMA&page=0&size=25` → Page con `items,total,page,size,totalPaginas`, normalizado a `contenido,totalElementos`. POST body exacto `desdeApuId,nombre,descripcionRubro` → 201 `{id,nombre,tipo,usuarioId,descripcionRubro,fechaCreacion}`. PUT `/{id}` body parcial solo `nombre` y/o `descripcionRubro` → 200; ausencia no cambia, null/presente se conserva según DTO. DELETE → 204. 403, 400 `validacion`/paginación/tipo/UUID, 404 `no-encontrado`.

## 10. Estrategia TDD
RED: handler rechaza tipo distinto/campos extra y afirma body exacto; PUT ausente no envía campos; UI afirma SISTEMA y estados. GREEN mínimo. TRIANGULATE: descripción de 800 caracteres, APU inexistente, 403, delete 204. REFACTOR local.

## 11. Pasos secuenciales
1. Extraer fixtures/status/códigos del recurso, DTOs e IT.
2. Escribir schemas y tests RED de Page y presencia.
3. Implementar hook/UI accesible: tabla, crear desde APU, edición y confirmación delete.
4. Añadir handler estricto y probar wrapper sin activar gate.
5. Ejecutar tests focalizados.

## 12. Criterios de aceptación
Filtro siempre manda `tipo=SISTEMA`; body POST no agrega campos; PUT preserva ausencia; UI cubre loading/vacío/error/403; respuesta normalizada; gate intacto.

## 13. Verificación
`pnpm vitest run src/test/features/admin/plantillas src/test/features/admin/pages`; `pnpm run typecheck`; `pnpm run lint`; `git diff --check`.

## 14. STOP conditions
STOP si IT contradice ruta, fields, JsonNullable o status; si crear exige selector/endpoint no disponible; si se solicita quitar gate; o si aparece necesidad de gestionar PERSONAL.

## 15. Riesgos y rollback
Riesgo de convertir PUT parcial en reemplazo total o truncar descripción. Rollback §8 únicamente, conservando RED.

## 16. Handoff
Entregar contrato, pruebas de presencia y gate a 079/081.

## 17. Invariantes explícitas
Solo SISTEMA; SUPER_ADMIN; Page canónica; no endpoint inventado; HTTP en `src/api`; no cálculos.
