# 075 — Baseline y correcciones de contrato

## 1. Estado inicial
El baseline tiene cinco fallos observados: uno en `src/test/features/proyectos/hooks/contrato.test.tsx` (logo multipart), dos en `src/test/features/insumos/hooks/contrato.test.tsx` (importación multipart) y dos en `src/test/features/insumos/components/AsistenteImportCsv.test.tsx` (cierre y errores por fila). Además, `src/features/admin/hooks/useAdminBases.ts:15-21` valida `z.array(baseCentralSchema)` aunque el backend devuelve `Page` con `items,total,page,size,totalPaginas`; el interceptor lo normaliza a `contenido,totalElementos,page,size,totalPaginas`.

## 2. Objetivo medible
Los cinco tests observados quedan verdes por comportamiento real y no por aumentar timeouts: multipart conserva archivo/campos, el asistente cierra o muestra errores por fila según la respuesta, y los fallos ambientales quedan separados. Las correcciones adicionales quedan probadas: edición envía campos obligatorios, bases consume Page normalizada, duplicar/logo no emiten requests inexistentes y descuento no consulta con un id nulo.

## 3. Dependencias
Ninguna. No tocar las cuatro páginas administrativas de usuarios, plantillas, valores ni logs.

## 4. Fuentes canónicas
Frontend: `src/features/admin/hooks/useAdminBases.ts`, `src/features/admin/pages/AdminBasesPage.tsx`, `src/api/contract.ts`, `src/api/schemas.ts`, `src/features/insumos/schemas.ts`, `src/features/proyectos/hooks/useProyectos.ts`, `src/features/proyectos/hooks/useDescuentoGlobal.ts`, handlers y tests citados. Backend: `../thesis-back-quarkus/src/main/java/ec/uce/propuestas/insumo/resource/AdminBaseCentralResource.java` y sus ITs; `../thesis-docs` solo para resolver discrepancias.

## 5. Evidencia del problema actual
`useAdminBases` valida una lista directa y `AdminBasesPage.tsx` itera `bases?.map`, aunque el backend devuelve una página; ambos deben migrar de forma coordinada a `bases.contenido`. `ProyectoDuplicarRequest` y `useSubirLogo` apuntan a rutas sin recurso backend; `InsumoEditarRequest` está en `src/api/contract.ts`; `src/test/handlers.ts` todavía acepta duplicar/logo; `usePreviewDescuento` en `src/features/proyectos/hooks/useDescuentoGlobal.ts` debe permanecer deshabilitado cuando no existe `presupuestoId`.

## 6. Alcance incluido
Restaurar los cinco tests existentes, corregir hook/schema/mock/tests de bases, alinear `InsumoEditarRequest` con backend, deshabilitar honestamente duplicar/logo, y proteger preview nullable. La decisión de endpoint inexistente debe quedar documentada en el test y UI.

## 7. Fuera de alcance
Backend, migraciones, nuevas páginas admin, las cuatro páginas admin individuales, inventar rutas, cálculos monetarios o cambios de disponibilidad global.

## 8. Archivos concretos
Editar: `src/features/admin/hooks/useAdminBases.ts`, `src/features/admin/pages/AdminBasesPage.tsx` si requiere adaptación, `src/api/contract.ts`, `src/api/schemas.ts`, `src/features/insumos/schemas.ts`, `src/features/proyectos/hooks/useProyectos.ts`, `src/features/proyectos/hooks/useDescuentoGlobal.ts`, `src/test/handlers.ts` y tests citados. Crear solo pruebas si una aserción nueva lo exige.

## 9. Contratos request/response
`GET /admin/bases-centrales?page=0&size=25&incluirArchivadas=false` responde desde backend `{items,total,page,size,totalPaginas}`; el interceptor frontend lo normaliza una sola vez a `{contenido,totalElementos,page,size,totalPaginas}`. `PUT /proyectos/{id}/insumos/{insumoId}` requiere `descripcion`, `unidad`, `precioUnitario` según recurso/DTO vigente. No existen rutas backend para `POST /proyectos/{id}/duplicar` ni `PUT /proyectos/{id}/logo`: ambos deben quedar disabled y sin request. Preview solo se ejecuta con `presupuestoId` no nulo.

## 10. Estrategia TDD
RED: reproducir cada fallo y afirmar método, URL, FormData y body exacto; para duplicar/logo afirmar que no hay request y control disabled; para bases afirmar `contenido`. GREEN: mínimo cambio de contrato/adaptador. TRIANGULATE: 400 de importación no se confunde con timeout/entorno; Page vacía y descuento sin id. REFACTOR: solo nombres/fixtures locales.

## 11. Pasos secuenciales
1. Ejecutar los cinco tests y clasificar cada fallo como timing/entorno o comportamiento, conservando salida.
2. Leer DTO/recurso de bases y registrar campos reales; cambiar schema/mock/hook a Page y adaptar `AdminBasesPage`.
3. Leer DTO de edición de insumo; actualizar tipo/schema y assertion del request.
4. Quitar handlers ficticios de duplicar/logo y convertir controles a disabled con `MOTIVO_SIN_BACKEND`; no borrar hooks sin consumidores.
5. Hacer que preview no construya query/mutation sin id y añadir assertion nullable.
6. Ejecutar tests focalizados, luego `git diff --check`.

## 12. Criterios de aceptación
No se emite request duplicar/logo; bases renderiza 0, 1 y varias filas desde `contenido`; body de edición contiene los tres campos requeridos; multipart contiene archivo real; preview sin id no llama HTTP; los cinco tests pasan o un fallo queda clasificado con evidencia reproducible de entorno.

## 13. Verificación
`pnpm vitest run src/test/features/proyectos/hooks/contrato.test.tsx src/test/features/insumos/hooks/contrato.test.tsx src/test/features/insumos/components/AsistenteImportCsv.test.tsx`; `pnpm vitest run src/test/features/admin/hooks/contrato.test.tsx src/test/features/admin/pages/AdminBasesPage.test.tsx`; `git diff --check`.

## 14. STOP conditions
STOP si el backend no confirma `contenido,totalElementos`; si aparece un recurso real para duplicar/logo; si cambiar el DTO requiere backend; si el fallo depende de navegador/Red sin reproducción determinista; o si la solución toca páginas admin excluidas. Registrar comando, archivo y línea.

## 15. Riesgos y rollback
Riesgo: normalizar Page dos veces o ocultar un fallo ambiental. Rollback limitado a los archivos de §8; conservar el test que demuestra la ruta ausente y no revertir cambios ajenos.

## 16. Handoff
Entregar lista de cinco tests, clasificación ambiente/producción, payloads observados, rutas eliminadas y cualquier STOP a 076. No entregar cambios de UI admin 077–080.

## 17. Invariantes explícitas
`src/api/` es la única capa HTTP; no aritmética monetaria; UUIDs públicos; UI española; `pnpm`; no se inventan endpoints; solo tokens semánticos.
