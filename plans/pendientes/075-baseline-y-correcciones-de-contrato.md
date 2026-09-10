# 075 — Baseline y correcciones de contrato

**Estado: DONE — verificado con 475/475 tests y build de producción el 2026-09-09.**

## 1. Estado inicial
El baseline tiene cinco fallos observados: uno en `src/test/features/proyectos/hooks/contrato.test.tsx` (logo multipart), dos en `src/test/features/insumos/hooks/contrato.test.tsx` (importación multipart) y dos en `src/test/features/insumos/components/AsistenteImportCsv.test.tsx` (cierre y errores por fila). Además, `src/features/admin/hooks/useAdminBases.ts:15-21` valida `z.array(baseCentralSchema)` aunque el backend devuelve `Page` con `items,total,page,size,totalPaginas`; el interceptor lo normaliza a `contenido,totalElementos,page,size,totalPaginas`.

## 2. Objetivo medible
Los fallos observados quedan verdes por comportamiento real y no por aumentar timeouts: multipart conserva archivo/campos, el asistente cierra o muestra errores por fila según la respuesta, y los fallos ambientales quedan separados. Las correcciones adicionales quedan probadas: edición envía campos obligatorios y bases consume Page normalizada, ofrece navegación entre páginas y localiza el detalle recorriendo páginas sin inventar un GET por id. Duplicación de proyecto, carga de logo y descuento global se retiran por completo porque no tienen contrato HTTP en el backend consolidado.

## 3. Dependencias
Ninguna. No tocar las cuatro páginas administrativas de usuarios, plantillas, valores ni logs.

## 4. Fuentes canónicas
Frontend: `src/features/admin/hooks/useAdminBases.ts`, `src/features/admin/pages/AdminBasesPage.tsx`, `src/api/contract.ts`, `src/api/schemas.ts`, `src/features/insumos/schemas.ts`, `src/features/proyectos/hooks/useProyectos.ts`, handlers y tests citados. Backend: `../thesis-back-quarkus/src/main/java/ec/uce/propuestas/insumo/resource/AdminBaseCentralResource.java` y sus ITs; `../thesis-docs` solo para resolver discrepancias.

## 5. Evidencia del problema actual
`useAdminBases` validaba una lista directa y `AdminBasesPage.tsx` iteraba `bases?.map`, aunque el backend devuelve una página. `ProyectoDuplicarRequest`, `useSubirLogo` y descuento global representaban contratos HTTP inexistentes. `InsumoEditarRequest` no exigía todos los campos enviados por el formulario.

## 6. Alcance incluido
Restaurar el baseline, corregir hook/schema/mock/tests de bases, alinear `InsumoEditarRequest` con backend y retirar UI, hooks, DTOs, schemas, mocks y pruebas que dependían de duplicación de proyecto, upload de logo o descuento global.

## 7. Fuera de alcance
Backend, migraciones, nuevas páginas admin, las cuatro páginas admin individuales, inventar rutas, cálculos monetarios y los planes 076/074.

## 8. Archivos concretos
Editar: `src/features/admin/hooks/useAdminBases.ts`, `src/features/admin/pages/AdminBasesPage.tsx` si requiere adaptación, `src/api/contract.ts`, `src/api/schemas.ts`, `src/features/insumos/schemas.ts`, `src/features/proyectos/hooks/useProyectos.ts`, `src/features/proyectos/hooks/useDescuentoGlobal.ts`, `src/test/handlers.ts` y tests citados. Crear solo pruebas si una aserción nueva lo exige.

## 9. Contratos request/response
`GET /admin/bases-centrales?page=0&size=25&incluirArchivadas=false` responde desde backend `{items,total,page,size,totalPaginas}`; el interceptor frontend lo normaliza una sola vez a `{contenido,totalElementos,page,size,totalPaginas}`. `PUT /proyectos/{id}/insumos/{insumoId}` envía `descripcion`, `unidad`, `precioUnitario`. No existen contratos HTTP para duplicar proyecto, subir logo ni aplicar descuento global; por tanto, no existe representación frontend de esas operaciones. `ProyectoResponse.tieneLogo` se conserva porque sí forma parte de la respuesta backend.

## 10. Estrategia TDD
RED: reproducir cada fallo y afirmar método, URL, FormData y body exacto; para operaciones inexistentes afirmar ausencia de UI, hook, DTO y mock; para bases afirmar página normalizada y navegación. GREEN: mínimo cambio de contrato/adaptador. TRIANGULATE: 400 de importación no se confunde con timeout/entorno; Page vacía, búsqueda en una página posterior y reducción del total de páginas. REFACTOR: solo nombres/fixtures locales.

## 11. Pasos secuenciales
1. Ejecutar los cinco tests y clasificar cada fallo como timing/entorno o comportamiento, conservando salida.
2. Leer DTO/recurso de bases y registrar campos reales; cambiar schema/mock/hook a Page y adaptar `AdminBasesPage`.
3. Leer DTO de edición de insumo; actualizar tipo/schema y assertion del request.
4. Retirar handlers, controles, hooks y DTOs ficticios de duplicación de proyecto y carga de logo.
5. Retirar por completo la implementación de descuento global al no existir contrato backend.
6. Ejecutar tests focalizados, luego `git diff --check`.

## 12. Criterios de aceptación
No existe código frontend que pueda emitir requests de duplicación de proyecto, upload de logo o descuento global; bases renderiza 0, 1 y varias filas desde `contenido`, navega todas las páginas y localiza por UUID sin inventar endpoint; body de edición contiene los tres campos requeridos; multipart conserva el archivo real; la suite completa pasa.

## 13. Verificación
`pnpm vitest run src/test/features/proyectos/hooks/contrato.test.tsx src/test/features/insumos/hooks/contrato.test.tsx src/test/features/insumos/components/AsistenteImportCsv.test.tsx`; `pnpm vitest run src/test/features/admin/hooks/contrato.test.tsx src/test/features/admin/pages/AdminBasesPage.test.tsx`; `git diff --check`.

## 14. STOP conditions
STOP si el backend no confirma `contenido,totalElementos`; si aparece un recurso real para duplicar/logo; si cambiar el DTO requiere backend; si el fallo depende de navegador/Red sin reproducción determinista; o si la solución toca páginas admin excluidas. Registrar comando, archivo y línea.

## 15. Riesgos y rollback
Riesgo: normalizar Page dos veces, ocultar un fallo ambiental o conservar código muerto que vuelva a introducir endpoints ficticios. El historial documental conserva la evidencia de las rutas ausentes.

## 16. Handoff
Entregar lista de cinco tests, clasificación ambiente/producción, payloads observados, rutas eliminadas y cualquier STOP a 076. No entregar cambios de UI admin 077–080.

## 17. Invariantes explícitas
`src/api/` es la única capa HTTP; no aritmética monetaria; UUIDs públicos; UI española; `pnpm`; no se inventan endpoints; solo tokens semánticos.
