# Plan 085: pestaña Insumos

> **Estado:** DONE · integrado en el worktree actual (2026-09-09). `PestanaInsumos` deriva filas read-only de `ApuResponse.secciones[].detalles[]`; `WorkspacePage` integra las pestañas APU, Insumos y Especificación técnica. No se añadió endpoint APU-insumos, mutación, copia ni aritmética monetaria. Se ejecutó en worktree separado y se integró sin cambios en backend, contratos, handlers ni fixtures. No se añadieron ni ejecutaron pruebas por instrucción explícita; Prettier, lint y `git diff --check` pasaron, y `pnpm run typecheck` permanece bloqueado únicamente por el error conocido del Plan 076 en `src/test/features/proyectos/hooks/contrato.test.tsx:197`.

## 01. Estado actual y dependencia
Depende de 084. El editor APU ya recibe `ApuResponse.secciones[].detalles[]` en `src/api/contract.ts:333-350`, los ordena en `src/features/apu-editor/hooks/useApuEditor.ts` y muestra cada sección mediante `GridSeccion`. `SelectorInsumo` (`src/features/apu-editor/components/SelectorInsumo.tsx`) y `useBusquedaParaApu` son búsqueda/selección para edición; no existe un endpoint canónico de “insumos del APU”.

## 02. Resultado observable
La pestaña Insumos del workspace muestra, para el APU seleccionado, las filas derivadas de sus secciones actuales: sección, código/descripcion, unidad, cantidad y procedencia disponible en el detalle. No crea, copia ni recalcula dinero. El usuario puede navegar hacia búsqueda/selector en modo explícitamente solo lectura, sin que la pestaña agregue filas.

## 03. Dependencias verificadas
`084` entrega el workspace y el APU seleccionado. Antes de implementar, verificar la integración de selección en los archivos de 084 y no cambiarla. No depender de una API nueva ni de una base personal.

## 04. Fuentes y límites normativos
Contrato frontend: `src/api/contract.ts`, `src/features/apu-editor/hooks/useApuEditor.ts`, `src/features/apu-editor/components/GridSeccion.tsx`, `SelectorInsumo.tsx`, `src/features/insumos/components/TablaInsumos.tsx`, `src/features/apu-editor/hooks/useBusquedaParaApu.ts`. Handlers: `src/test/handlers.ts:insumos` y `:apu editor`. Backend a contrastar: recurso APU y DTO de detalle; no copiar arquitectura de otro proyecto.

## 05. Evidencia concreta
`ApuResponse` ya contiene `secciones` y `detalles`; `useApuEditor` calcula `secciones` desde ese único GET. `SelectorInsumo` llama búsqueda por proyecto y al seleccionar ejecuta `onSeleccionar`, que es una operación de edición. `TablaInsumos` pertenece al inventario del proyecto, no prueba una relación APU. Por tanto, el origen de las filas debe ser el APU seleccionado, no un GET inventado.

## 06. Alcance incluido
Crear la composición de pestaña y su presentación de solo lectura; reutilizar tipos, orden de `useApuEditor` y etiquetas de sección. Si se ofrece navegación, reutilizar `SelectorInsumo` solo como búsqueda y adaptar `onSeleccionar` a cierre/navegación sin mutación. Mostrar procedencia únicamente con campos existentes (`precioHeredado`, `fuente`, `baseNombre` si el DTO real los contiene); no inferirla del precio.

## 07. Fuera de alcance
No agregar `/apus/{id}/insumos`, endpoint de catálogo por APU, copia a base personal, mutaciones, aritmética monetaria, precios derivados, cambios backend, ni modificar `TablaInsumos` para fingir relación.

## 08. Archivos candidatos exactos
Crear `src/features/workspace/components/PestanaInsumos.tsx` y `src/test/features/workspace/components/PestanaInsumos.test.tsx`; integrar en `src/features/workspace/pages/WorkspacePage.tsx`. Reusar `src/features/apu-editor/hooks/useApuEditor.ts`, `src/features/apu-editor/components/GridSeccion.tsx` y `src/features/apu-editor/components/SelectorInsumo.tsx`. Editar `src/api/contract.ts` solo si falta un campo que ya esté presente en el DTO backend. Tocar `src/test/features/apu-editor/components/SelectorInsumo.test.tsx` únicamente si se añade navegación. No tocar backend.

## 09. Contrato y estados
Entrada: `apuId`/APU seleccionado y `ApuResponse.secciones[].detalles[]`. Filtrar/mapear sin `Number`, `parseFloat`, `toFixed` ni suma. Estados: sin selección (“Selecciona un APU”), cargando (“Cargando insumos…”), error del GET con reintento, lista vacía (“Este APU no tiene insumos asociados”) y lista con filas. A11y: tab con nombre, tabla con caption/headers, botones con nombre y `aria-current`/estado de selección.

## 10. TDD específico
**RED:** prueba de workspace seleccionando un APU y afirma una fila de cada sección, código, descripción, unidad y cantidad transportada; afirma que no aparece botón de agregar/copiar ni endpoint APU-insumos. Añadir casos sin selección, vacío, error y navegación sin mutación. **GREEN:** composición mínima contra el estado/query existente. **TRIANGULATE:** detalle heredado y dos órdenes no consecutivos; verificar que no se muestra total calculado. **REFACTOR:** extraer solo mapper/presentación duplicada.

## 11. Implementación ordenada
1. Leer la selección y el nombre real del workspace de 084. 2. Confirmar campos del detalle en DTO backend/frontend y fixtures. 3. Escribir RED con MSW estricto y aserciones de request. 4. Implementar filas desde `useApuEditor`/query existente, sin segunda consulta. 5. Añadir estados y semántica de tabla. 6. Si navegación es necesaria, encapsularla y probar que no llama POST/PATCH. 7. Ejecutar pruebas focalizadas y entregar el delta a 086.

## 12. Aceptación verificable
Con un APU seleccionado se ven exactamente sus detalles, ordenados como el editor; sin selección/GET fallido/vacío cada estado es distinguible; no hay cálculo monetario ni endpoint inventado; no hay mutación al usar navegación; accesibilidad y tests pasan.

## 13. Verificación
`pnpm run test -- src/test/features/workspace/components/PestanaInsumos.test.tsx src/test/features/apu-editor/components/SelectorInsumo.test.tsx`; `pnpm run typecheck`; `pnpm run lint`; `git diff --check`.

## 14. STOP / rollback
STOP si 084 no define un archivo de workspace o APU seleccionado, si el DTO no expone los campos solicitados, o si mostrar procedencia exige un endpoint nuevo: registrar path y contrato y devolver a 084. STOP si navegación requiere mutación. Rollback solo de los archivos candidatos de este plan; conservar la prueba que evidencia la discrepancia.

## 15. Riesgos y controles
Riesgo: confundir inventario de proyecto con composición del APU; control: fuente única `ApuResponse.secciones`. Riesgo: reintroducir aritmética; control: prohibir helpers numéricos y revisar diff. Riesgo: selector mutante; control: prueba de ausencia de POST/PATCH.

## 16. Handoff
Entregar a 086: paths cambiados, query/key reutilizada, campos efectivamente mostrados, estados y comandos verdes. Si queda duda de procedencia, dejarla como decisión explícita, no como endpoint provisional.

## 17. Invariantes
UI en español; HTTP solo en `src/api`; TanStack Query para servidor; dinero en string cuando sea solo lectura; ninguna suma en cliente; sin colores crudos; no copiar insumos ni inventar contrato.
